import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireMember(conversationId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("conversation_members")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// GET /api/conversations/[id]/messages — list messages (also marks as read)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await requireMember(id, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: messages } = await admin
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // Sender names
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name");
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const enriched = (messages ?? []).map((m) => ({
    ...m,
    sender_name: nameMap.get(m.sender_id) || "User",
    is_mine: m.sender_id === user.id,
  }));

  // Mark the conversation as read
  await admin
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id);

  // Also clear the bell "New message" notifications for this user (opening
  // any conversation clears the message notifications from the bell).
  await admin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("link", "/messages")
    .eq("title", "New message")
    .eq("read", false);

  return NextResponse.json({ messages: enriched });
}

// POST /api/conversations/[id]/messages — send a message
// body: { content?, attachment_url?, attachment_name?, attachment_type? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await requireMember(id, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { content, attachment_url, attachment_name, attachment_type } = body;

  if (!content?.trim() && !attachment_url) {
    return NextResponse.json(
      { error: "Message is empty" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: message, error } = await admin
    .from("messages")
    .insert({
      conversation_id: id,
      sender_id: user.id,
      content: content?.trim() || null,
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      attachment_type: attachment_type || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create bell notifications for the other conversation members.
  // To avoid clutter, keep only one unread "new message" notification per
  // conversation per recipient: delete their existing unread message
  // notifications for this conversation, then insert a fresh one.
  const { data: otherMembers } = await admin
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", id)
    .neq("user_id", user.id);

  if (otherMembers && otherMembers.length > 0) {
    // Sender name + conversation label for the notification text
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { data: conv } = await admin
      .from("conversations")
      .select("type, title")
      .eq("id", id)
      .single();

    const senderName = senderProfile?.full_name || "Someone";
    const contextLabel =
      conv?.type === "group" && conv?.title ? ` in ${conv.title}` : "";

    const link = `/messages`;
    const title = "New message";
    const preview =
      content?.trim() ||
      (attachment_name ? `Sent a file: ${attachment_name}` : "Sent a message");
    const messageText = `${senderName}${contextLabel}: ${preview.slice(0, 80)}`;

    const recipientIds = otherMembers.map((m) => m.user_id);

    // Remove existing unread message notifications for this conversation
    // (link = /messages) so we don't stack many per conversation.
    await admin
      .from("notifications")
      .delete()
      .in("user_id", recipientIds)
      .eq("link", link)
      .eq("read", false)
      .eq("title", title);

    await admin.from("notifications").insert(
      recipientIds.map((uid) => ({
        user_id: uid,
        title,
        message: messageText,
        link,
      }))
    );
  }

  return NextResponse.json({ message });
}
