import { createAdminClient } from "@/lib/supabase/admin";

type NotificationInput = {
  userId: string;
  title: string;
  message: string;
  link?: string | null;
};

// Writes in-app notifications for one or more users via the service-role
// client (bypasses RLS). Call this from admin actions like allocating a
// course or sending a reminder.
export async function createNotifications(
  notifications: NotificationInput[]
) {
  if (notifications.length === 0) return;

  const admin = createAdminClient();

  const rows = notifications.map((n) => ({
    user_id: n.userId,
    title: n.title,
    message: n.message,
    link: n.link ?? null,
  }));

  await admin.from("notifications").insert(rows);
}
