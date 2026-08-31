import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/conversations — list the current user's conversations with
// last message, other members, and unread count.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Conversations the user belongs to
  const { data: myMemberships } = await admin
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  const convIds = (myMemberships ?? []).map((m) => m.conversation_id);
  if (convIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const lastReadMap = new Map(
    (myMemberships ?? []).map((m) => [m.conversation_id, m.last_read_at])
  );

  // Conversation records
  const { data: conversations } = await admin
    .from("conversations")
    .select("id, type, title, created_by, created_at")
    .in("id", convIds);

  // All members of these conversations
  const { data: allMembers } = await admin
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds);

  // All messages (we'll derive last message + unread counts)
  const { data: allMessages } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, content, attachment_name, created_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  // User names for member display
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name");
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const { data: authUsers } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const emailMap = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const result = (conversations ?? []).map((conv) => {
    const members = (allMembers ?? [])
      .filter((m) => m.conversation_id === conv.id)
      .map((m) => ({
        user_id: m.user_id,
        name: nameMap.get(m.user_id) || emailMap.get(m.user_id) || "User",
      }));

    const convMessages = (allMessages ?? []).filter(
      (m) => m.conversation_id === conv.id
    );
    const lastMessage = convMessages[0] ?? null;

    const lastRead = lastReadMap.get(conv.id);
    const unread = convMessages.filter(
      (m) =>
        m.sender_id !== user.id &&
        (!lastRead || new Date(m.created_at) > new Date(lastRead))
    ).length;

    // For direct conversations, the display name is the other member
    const otherMembers = members.filter((m) => m.user_id !== user.id);
    const displayName =
      conv.type === "group"
        ? conv.title || "Group"
        : otherMembers[0]?.name || "Conversation";

    return {
      id: conv.id,
      type: conv.type,
      title: conv.title,
      displayName,
      members,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            attachment_name: lastMessage.attachment_name,
            created_at: lastMessage.created_at,
          }
        : null,
      unread,
    };
  });

  // Sort by most recent message
  result.sort((a, b) => {
    const at = a.lastMessage?.created_at ?? "";
    const bt = b.lastMessage?.created_at ?? "";
    return bt.localeCompare(at);
  });

  return NextResponse.json({ conversations: result });
}

// POST /api/conversations — create a conversation
// direct: { type: "direct", target_user_id }
// group:  { type: "group", title, member_ids: [] }  (admin only)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin =
    roles?.some((r) => r.role === "admin" || r.role === "super_admin") ?? false;

  const body = await request.json();
  const admin = createAdminClient();

  if (body.type === "group") {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can create group conversations." },
        { status: 403 }
      );
    }

    const memberIds: string[] = Array.isArray(body.member_ids)
      ? body.member_ids
      : [];
    // Always include the creator
    const uniqueMembers = Array.from(new Set([user.id, ...memberIds]));

    const { data: conv, error } = await admin
      .from("conversations")
      .insert({
        type: "group",
        title: body.title?.trim() || "Group",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("conversation_members").insert(
      uniqueMembers.map((uid) => ({
        conversation_id: conv.id,
        user_id: uid,
      }))
    );

    return NextResponse.json({ conversation_id: conv.id });
  }

  // Direct conversation
  const targetId = body.target_user_id as string | undefined;
  if (!targetId) {
    return NextResponse.json(
      { error: "target_user_id required" },
      { status: 400 }
    );
  }

  // Reuse an existing direct conversation between these two users if one exists
  const { data: myConvs } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);
  const myConvIds = (myConvs ?? []).map((c) => c.conversation_id);

  if (myConvIds.length > 0) {
    const { data: shared } = await admin
      .from("conversation_members")
      .select("conversation_id, conversations!inner(type)")
      .eq("user_id", targetId)
      .in("conversation_id", myConvIds);

    const existingDirect = (shared ?? []).find(
      (s) =>
        (s.conversations as unknown as { type: string })?.type === "direct"
    );
    if (existingDirect) {
      return NextResponse.json({
        conversation_id: existingDirect.conversation_id,
      });
    }
  }

  const { data: conv, error } = await admin
    .from("conversations")
    .insert({ type: "direct", created_by: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("conversation_members").insert([
    { conversation_id: conv.id, user_id: user.id },
    { conversation_id: conv.id, user_id: targetId },
  ]);

  return NextResponse.json({ conversation_id: conv.id });
}
