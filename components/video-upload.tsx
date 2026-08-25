"use client";

import { useRef, useState } from "react";
import {
  Video,
  Upload,
  Trash2,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";

type VideoUploadProps = {
  value: string;
  onChange: (url: string) => void;
};

export function VideoUpload({
  value,
  onChange,
}: VideoUploadProps) {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setError("");

    if (
      !file.type.startsWith(
        "video/"
      )
    ) {
      setError(
        "Please select a valid video file."
      );

      return;
    }

    // 2 GB limit
    if (
      file.size >
      2 * 1024 * 1024 * 1024
    ) {
      setError(
        "Video must be smaller than 2 GB."
      );

      return;
    }

    setIsUploading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/upload-video",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not upload video."
        );
      }

      onChange(data.url);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload video.";

      setError(message);
    } finally {
      setIsUploading(false);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  function handleRemove() {
    onChange("");
    setError("");
  }

  return (
    <div className="space-y-4">

      {/* Video URL */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <LinkIcon size={16} />
          Video URL
        </label>

        <input
          value={value}
          onChange={(event) => {
            onChange(
              event.target.value
            );

            setError("");
          }}
          placeholder="Paste video URL..."
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
          accept="video/*"
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

              Uploading video...
            </>
          ) : (
            <>
              <Upload size={20} />

              Upload video from computer
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
              <Video size={17} />

              Video Preview
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

          <div className="bg-slate-50 p-4">

            <video
              src={value}
              controls
              className="aspect-video w-full rounded-lg bg-black"
              onError={() =>
                setError(
                  "The video could not be loaded."
                )
              }
            />

          </div>

        </div>
      )}

    </div>
  );
}