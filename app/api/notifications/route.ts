import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications — list the current user's notifications
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unread = (data ?? []).filter((n) => !n.read).length;

  return NextResponse.json({ notifications: data ?? [], unread });
}

// PATCH /api/notifications — mark notification(s) read
// body: { id } to mark one, or { all: true } to mark all
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.all) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  } else if (body.id) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", body.id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
