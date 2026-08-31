import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/conversations/unread — total unread message count across all the
// user's conversations (for the sidebar Messages badge).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ unread: 0 });
  }

  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ unread: 0 });
  }

  const convIds = memberships.map((m) => m.conversation_id);
  const lastReadMap = new Map(
    memberships.map((m) => [m.conversation_id, m.last_read_at])
  );

  const { data: messages } = await admin
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", convIds);

  const unread = (messages ?? []).filter((m) => {
    if (m.sender_id === user.id) return false;
    const lastRead = lastReadMap.get(m.conversation_id);
    return !lastRead || new Date(m.created_at) > new Date(lastRead);
  }).length;

  return NextResponse.json({ unread });
}
