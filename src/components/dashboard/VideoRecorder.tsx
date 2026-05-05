"use client";

import { useRef, useState } from "react";

interface Props {
  slug: string;
  currentUrl: string;
  onVideoSaved: (url: string) => void;
}

export default function VideoRecorder({ slug, currentUrl, onVideoSaved }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      // Get presigned URL
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "video/mp4",
          slug,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { presignedUrl, publicUrl } = await res.json();

      // Upload directly to R2
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed — check R2 CORS settings"));
        xhr.send(file);
      });

      onVideoSaved(publicUrl);
      setProgress(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-body text-[10px] tracking-[2px] uppercase text-ink-faint">
          Personalized video
        </label>
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noopener" className="text-gold text-xs font-body hover:underline">
            View current
          </a>
        )}
      </div>

      {uploading ? (
        <div className="space-y-2">
          <div className="w-full h-2 bg-sand-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-body text-xs text-ink-faint text-center">
            Uploading... {progress}%
          </p>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 border border-gold-pale text-ink-soft font-body text-[11px] tracking-[2px] uppercase hover:border-gold hover:text-gold transition-colors"
        >
          {currentUrl ? "Replace Video" : "Upload Video"}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {error && (
        <p className="font-body text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
