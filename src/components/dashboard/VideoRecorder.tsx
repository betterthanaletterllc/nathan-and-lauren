"use client";

import { useRef, useState } from "react";

interface Props {
  slug: string;
  currentUrl: string;
  onVideoSaved: (url: string) => void;
}

export default function VideoRecorder({ slug, currentUrl, onVideoSaved }: Props) {
  const [mode, setMode] = useState<"idle" | "camera" | "uploading" | "recording" | "preview">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setMode("camera");
    } catch (err: any) {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      if (previewRef.current) {
        previewRef.current.src = URL.createObjectURL(blob);
      }
      setMode("preview");
      // Stop camera
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setMode("recording");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function discardRecording() {
    setRecordedBlob(null);
    setMode("idle");
  }

  async function uploadBlob(blob: Blob, filename: string) {
    setMode("uploading");
    setProgress(0);
    setError("");

    try {
      // Get presigned URL
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          contentType: blob.type || "video/webm",
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
      xhr.setRequestHeader("Content-Type", blob.type || "video/webm");

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
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(blob);
      });

      onVideoSaved(publicUrl);
      setMode("idle");
      setProgress(0);
    } catch (err: any) {
      setError(err.message);
      setMode("preview");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadBlob(file, file.name);
    e.target.value = "";
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

      {mode === "idle" && (
        <div className="flex gap-2">
          <button
            onClick={startCamera}
            className="flex-1 py-3 border border-gold-pale text-ink-soft font-body text-[11px] tracking-[2px] uppercase hover:border-gold hover:text-gold transition-colors"
          >
            Record video
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 py-3 border border-gold-pale text-ink-soft font-body text-[11px] tracking-[2px] uppercase hover:border-gold hover:text-gold transition-colors"
          >
            Upload video
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      {(mode === "camera" || mode === "recording") && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full aspect-video bg-ink/5 object-cover"
          />
          <div className="flex gap-2">
            {mode === "camera" && (
              <>
                <button
                  onClick={startRecording}
                  className="flex-1 py-2 bg-red-500 text-white font-body text-[11px] tracking-[2px] uppercase"
                >
                  Start Recording
                </button>
                <button
                  onClick={() => {
                    streamRef.current?.getTracks().forEach((t) => t.stop());
                    setMode("idle");
                  }}
                  className="px-4 py-2 border border-gold-pale text-ink-faint font-body text-[11px] tracking-[2px] uppercase"
                >
                  Cancel
                </button>
              </>
            )}
            {mode === "recording" && (
              <button
                onClick={stopRecording}
                className="flex-1 py-2 bg-red-600 text-white font-body text-[11px] tracking-[2px] uppercase animate-pulse"
              >
                Stop Recording
              </button>
            )}
          </div>
        </div>
      )}

      {mode === "preview" && recordedBlob && (
        <div className="space-y-2">
          <video
            ref={previewRef}
            controls
            playsInline
            className="w-full aspect-video bg-ink/5 object-cover"
          />
          <div className="flex gap-2">
            <button
              onClick={() => uploadBlob(recordedBlob, `recording-${slug}.webm`)}
              className="flex-1 py-2 bg-gold text-white font-body text-[11px] tracking-[2px] uppercase hover:bg-gold-light transition-colors"
            >
              Save & Upload
            </button>
            <button
              onClick={discardRecording}
              className="px-4 py-2 border border-gold-pale text-ink-faint font-body text-[11px] tracking-[2px] uppercase"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {mode === "uploading" && (
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
      )}

      {error && (
        <p className="font-body text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
