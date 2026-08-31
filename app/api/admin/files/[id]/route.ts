import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  return (
    roles?.some((r) => r.role === "admin" || r.role === "super_admin") ?? false
  );
}

// Find everywhere a file URL is referenced.
async function findUsage(fileUrl: string) {
  const admin = createAdminClient();
  const usage: { type: string; name: string }[] = [];

  // Course thumbnails
  const { data: courses } = await admin
    .from("courses")
    .select("title")
    .eq("thumbnail_url", fileUrl);
  for (const c of courses ?? [])
    usage.push({ type: "Course thumbnail", name: c.title });

  // Lesson video/image
  const { data: lessonsVideo } = await admin
    .from("lessons")
    .select("title")
    .eq("video_url", fileUrl);
  for (const l of lessonsVideo ?? [])
    usage.push({ type: "Lesson video", name: l.title });

  const { data: lessonsImage } = await admin
    .from("lessons")
    .select("title")
    .eq("image_url", fileUrl);
  for (const l of lessonsImage ?? [])
    usage.push({ type: "Lesson image", name: l.title });

  // Lesson blocks (content may hold the URL)
  const { data: blocks } = await admin
    .from("lesson_blocks")
    .select("id, lesson_id")
    .eq("content", fileUrl);
  if (blocks && blocks.length > 0) {
    const lessonIds = [...new Set(blocks.map((b) => b.lesson_id))];
    const { data: blockLessons } = await admin
      .from("lessons")
      .select("title")
      .in("id", lessonIds);
    for (const l of blockLessons ?? [])
      usage.push({ type: "Lesson content", name: l.title });
  }

  // Quiz question media
  const { data: questions } = await admin
    .from("quiz_questions")
    .select("question_text")
    .eq("media_url", fileUrl);
  for (const q of questions ?? [])
    usage.push({
      type: "Quiz question",
      name: q.question_text || "Untitled question",
    });

  // Chat messages
  const { data: messages } = await admin
    .from("messages")
    .select("id")
    .eq("attachment_url", fileUrl);
  if (messages && messages.length > 0)
    usage.push({
      type: "Chat message",
      name: `${messages.length} message(s)`,
    });

  return usage;
}

// GET /api/admin/files/[id] — return where this file is used
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: file } = await admin
    .from("files")
    .select("*")
    .eq("id", id)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const usage = await findUsage(file.file_url);
  return NextResponse.json({ file, usage });
}

// DELETE /api/admin/files/[id] — delete the file (from R2/storage + table)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: file } = await admin
    .from("files")
    .select("*")
    .eq("id", id)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Delete the underlying object
  try {
    if (file.r2_key?.startsWith("supabase:")) {
      // Supabase Storage file: "supabase:<bucket>/<path>"
      const rest = file.r2_key.replace("supabase:", "");
      const slash = rest.indexOf("/");
      const bucket = rest.slice(0, slash);
      const path = rest.slice(slash + 1);
      await admin.storage.from(bucket).remove([path]);
    } else {
      // R2 object
      await r2.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: file.r2_key,
        })
      );
    }
  } catch {
    // Even if the object delete fails, remove the tracking row so usage frees.
  }

  await admin.from("files").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
