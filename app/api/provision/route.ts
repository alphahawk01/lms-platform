import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/provision — provision (invite) a user into the LMS from another
// trusted system (the reporting dashboard). Unlike /api/admin/invite this is
// NOT gated by an admin session; it authenticates via a shared secret in the
// `x-provision-secret` header (set PROVISION_SHARED_SECRET in the LMS env).
//
// Body: { email: string, full_name?: string, role?: "learner" | "admin" | "super_admin" }
//
// It sends a magic-link invite (creates an unconfirmed, passwordless auth
// user) and assigns the role. The invited person sets their LMS password via
// the invite email. This is provisioning, NOT single-sign-on — the LMS keeps
// its own Supabase Auth credentials.

// Browser origins allowed to call this. Production is the reporting dashboard;
// localhost entries let the two apps be tested together in dev. The response
// echoes back the caller's origin only when it's in this allowlist.
const ALLOWED_ORIGINS = [
  "https://dashboard.premierdata-technology.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-provision-secret",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const cors = corsHeaders(request.headers.get("origin"));

  const secret = process.env.PROVISION_SHARED_SECRET;
  if (!secret) {
    // Misconfiguration — never allow provisioning without a configured secret.
    return NextResponse.json(
      { error: "Provisioning is not configured." },
      { status: 500, headers: cors }
    );
  }

  const provided = request.headers.get("x-provision-secret");
  if (!provided || provided !== secret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: cors }
    );
  }

  let body: {
    email?: string;
    full_name?: string;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: cors }
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400, headers: cors }
    );
  }

  // Map the dashboard role to an LMS role.
  const assignedRole =
    body.role === "admin" || body.role === "super_admin"
      ? "admin"
      : "learner";

  const admin = createAdminClient();

  // If a user with this email already exists, don't re-invite; just ensure the
  // role is set and report "already exists" so the caller can treat it as OK.
  const { data: existingList } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const existing = existingList?.users.find(
    (u) => (u.email ?? "").toLowerCase() === email
  );

  if (existing) {
    await admin.from("user_roles").delete().eq("user_id", existing.id);
    await admin
      .from("user_roles")
      .insert({ user_id: existing.id, role: assignedRole });
    return NextResponse.json(
      { status: "exists", user_id: existing.id },
      { headers: cors }
    );
  }

  // Invite (creates an unconfirmed, passwordless auth user + sends the email).
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: body.full_name?.trim() || "" },
    redirectTo: `${
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://training.premierdata-technology.com"
    }/auth/confirm?next=/reset-password`,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: cors }
    );
  }

  if (data.user) {
    await admin.from("user_roles").delete().eq("user_id", data.user.id);
    const { error: roleError } = await admin
      .from("user_roles")
      .insert({ user_id: data.user.id, role: assignedRole });
    if (roleError) {
      return NextResponse.json(
        {
          status: "invited",
          user_id: data.user.id,
          warning: `Invited, but role not set: ${roleError.message}`,
        },
        { headers: cors }
      );
    }
  }

  return NextResponse.json(
    { status: "invited", user_id: data.user?.id ?? null },
    { headers: cors }
  );
}
