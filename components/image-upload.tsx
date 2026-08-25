"use client";

import { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  lessonId?: string;
};

export function ImageUpload({
  value,
  onChange,
  lessonId,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB.");
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();

      const fileExtension =
        file.name.split(".").pop() || "jpg";

      const safeFileName =
        file.name.replace(/[^a-zA-Z0-9.-]/g, "-");

      const filePath = lessonId
        ? `${lessonId}/${Date.now()}-${safeFileName}`
        : `${crypto.randomUUID()}.${fileExtension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("lesson-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("lesson-images")
        .getPublicUrl(filePath);

      onChange(publicUrlData.publicUrl);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload image.";

      console.error("Image upload error:", uploadError);

      setError(message);
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemove() {
    onChange("");
    setError("");
  }

  return (
    <div className="space-y-4">
      {/* Image URL */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <LinkIcon size={16} />
          Image URL
        </label>

        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setError("");
          }}
          placeholder="Paste image URL..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
        />
      </div>

      {/* Divider */}
      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />

        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          or
        </span>

        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={isUploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm font-medium text-slate-600 transition hover:border-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2
                size={20}
                className="animate-spin"
              />
              Uploading image...
            </>
          ) : (
            <>
              <Upload size={20} />
              Upload image from computer
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Preview */}
      {value && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <ImageIcon size={17} />
              Image Preview
            </span>

            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={16} />
              Remove
            </button>
          </div>

          <div className="flex min-h-[220px] items-center justify-center bg-slate-50 p-4">
            <img
              src={value}
              alt="Lesson content preview"
              className="max-h-[500px] max-w-full rounded-lg object-contain"
              onError={() =>
                setError(
                  "The image could not be loaded. Please check the URL."
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}