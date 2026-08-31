import { createAdminClient } from "@/lib/supabase/admin";

// Returns current storage usage and the configured limit.
export async function getStorageUsage() {
  const admin = createAdminClient();

  const { data: files } = await admin.from("files").select("size_bytes");
  const { data: settings } = await admin
    .from("storage_settings")
    .select("limit_bytes")
    .eq("id", 1)
    .single();

  const usedBytes = (files ?? []).reduce(
    (sum, f) => sum + (f.size_bytes ?? 0),
    0
  );
  const limitBytes = settings?.limit_bytes ?? 2147483648;

  return { usedBytes, limitBytes, isFull: usedBytes >= limitBytes };
}
