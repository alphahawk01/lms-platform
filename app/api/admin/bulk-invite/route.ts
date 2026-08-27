import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/bulk-invite — invite multiple users from parsed CSV data
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

  const isAdmin = roles?.some(
    (r) => r.role === "admin" || r.role === "super_admin"
  );

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const users = body.users as {
    email: string;
    full_name?: string;
    role?: string;
  }[];

  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json(
      { error: "No users provided" },
      { status: 400 }
    );
  }

  const allowedRoles = ["learner", "admin", "super_admin"];
  const admin = createAdminClient();

  const results: {
    email: string;
    status: "invited" | "failed" | "skipped";
    error?: string;
  }[] = [];

  for (const u of users) {
    const email = u.email?.trim();
    if (!email) {
      results.push({ email: u.email ?? "", status: "skipped", error: "No email" });
      continue;
    }

    const role =
      typeof u.role === "string" && allowedRoles.includes(u.role.toLowerCase())
        ? u.role.toLowerCase()
        : "learner";

    try {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: u.full_name?.trim() || "",
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://training.premierdata-technology.com"}/auth/confirm?next=/reset-password`,
      });

      if (error) {
        // User may already exist
        results.push({ email, status: "failed", error: error.message });
        continue;
      }

      // Assign role
      if (data.user) {
        await admin.from("user_roles").delete().eq("user_id", data.user.id);
        await admin
          .from("user_roles")
          .insert({ user_id: data.user.id, role });
      }

      results.push({ email, status: "invited" });
    } catch (err) {
      results.push({
        email,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const invited = results.filter((r) => r.status === "invited").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  return NextResponse.json({ results, summary: { invited, failed, skipped } });
}
