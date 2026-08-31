import { NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getStorageUsage } from "@/lib/storage";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

// POST /api/upload-file — returns a presigned URL for direct browser upload
// of any file type (chat attachments). body: { fileName, fileType }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME ||
    !R2_PUBLIC_URL
  ) {
    return NextResponse.json(
      { error: "R2 is not configured." },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { fileName, fileType } = body;

  if (!fileName || !fileType) {
    return NextResponse.json(
      { error: "fileName and fileType are required." },
      { status: 400 }
    );
  }

  // Block uploads if storage is full
  const usage = await getStorageUsage();
  if (usage.isFull) {
    return NextResponse.json(
      {
        error:
          "Storage limit reached. Delete files or upgrade to upload more.",
      },
      { status: 507 }
    );
  }

  const ext = fileName.split(".").pop() || "bin";
  const key = `chat-attachments/${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 600 });
  const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
