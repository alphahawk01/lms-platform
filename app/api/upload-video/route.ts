import { NextResponse } from "next/server";
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID =
  process.env.R2_ACCOUNT_ID;

const R2_ACCESS_KEY_ID =
  process.env.R2_ACCESS_KEY_ID;

const R2_SECRET_ACCESS_KEY =
  process.env.R2_SECRET_ACCESS_KEY;

const R2_BUCKET_NAME =
  process.env.R2_BUCKET_NAME;

const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL;

const r2 = new S3Client({
  region: "auto",

  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,

  credentials: {
    accessKeyId:
      R2_ACCESS_KEY_ID || "",

    secretAccessKey:
      R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(
  request: Request
) {
  try {
    if (
      !R2_ACCOUNT_ID ||
      !R2_ACCESS_KEY_ID ||
      !R2_SECRET_ACCESS_KEY ||
      !R2_BUCKET_NAME ||
      !R2_PUBLIC_URL
    ) {
      return NextResponse.json(
        {
          error:
            "R2 environment variables are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "No video file provided.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !file.type.startsWith(
        "video/"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please upload a valid video.",
        },
        {
          status: 400,
        }
      );
    }

    const fileExtension =
      file.name
        .split(".")
        .pop() || "mp4";

    const fileName =
      `${crypto.randomUUID()}.${fileExtension}`;

    const key =
      `lesson-videos/${fileName}`;

    const arrayBuffer =
      await file.arrayBuffer();

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,

        Key: key,

        Body: Buffer.from(
          arrayBuffer
        ),

        ContentType: file.type,
      })
    );

    const publicUrl =
      `${R2_PUBLIC_URL.replace(
        /\/$/,
        ""
      )}/${key}`;

    return NextResponse.json({
      url: publicUrl,
    });
  } catch (error) {
    console.error(
      "Video upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not upload video.",
      },
      {
        status: 500,
      }
    );
  }
}