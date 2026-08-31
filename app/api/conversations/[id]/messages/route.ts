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

  // Mark as read
  await admin
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id);

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

  return NextResponse.json({ message });
}
