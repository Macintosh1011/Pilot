"use client";

// Client component — needs browser camera APIs (getUserMedia, canvas).

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import jsQR from "jsqr";
import styles from "./WebcamCapture.module.css";

export type WebcamHandle = { capture: () => Promise<Blob | null> };

type Props = {
  className?: string;
  idle?: boolean;
  scanQR?: boolean;
  onQR?: (value: string) => void;
};

export const WebcamCapture = forwardRef<WebcamHandle, Props>(
  function WebcamCapture({ className, idle, scanQR, onQR }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const onQRRef = useRef(onQR);
    onQRRef.current = onQR;
    const [error, setError] = useState<"denied" | "unavailable" | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      if (idle) return;
      let cancelled = false;

      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          const name = (e as { name?: string }).name;
          setError(
            name === "NotAllowedError" || name === "PermissionDeniedError"
              ? "denied"
              : "unavailable",
          );
        });

      return () => {
        cancelled = true;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setReady(false);
      };
    }, [idle]);

    // Continuously decode the live frame for a QR code (the visitor's LinkedIn QR) with
    // jsQR — pure JS, works in every browser. Downscale to keep it cheap. Parent dedupes.
    useEffect(() => {
      if (!scanQR || idle || !ready) return;
      const canvas = document.createElement("canvas");
      const cctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!cctx) return;
      let active = true;
      const id = window.setInterval(() => {
        const video = videoRef.current;
        if (!active || !video || video.readyState < 2 || !video.videoWidth) return;
        const w = 480;
        const h = Math.round((video.videoHeight / video.videoWidth) * w);
        canvas.width = w;
        canvas.height = h;
        cctx.drawImage(video, 0, 0, w, h);
        const image = cctx.getImageData(0, 0, w, h);
        const code = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
        if (code?.data) onQRRef.current?.(code.data);
      }, 300);
      return () => {
        active = false;
        window.clearInterval(id);
      };
    }, [scanQR, idle, ready]);

    useImperativeHandle(ref, () => ({
      async capture(): Promise<Blob | null> {
        const video = videoRef.current;
        if (!video || !ready) return null;

        const MAX_H = 720;
        const scale = video.videoHeight > MAX_H ? MAX_H / video.videoHeight : 1;
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // Mirror to match the preview.
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);

        return new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", 0.85);
        });
      },
    }));

    if (idle) {
      return (
        <div className={`${styles.frame} ${className ?? ""}`} aria-hidden="true">
          <div className={styles.idlePlaceholder} />
        </div>
      );
    }

    if (error) {
      return (
        <div
          className={`${styles.frame} ${className ?? ""}`}
          role="status"
          aria-label={error === "denied" ? "Camera access denied" : "No camera found"}
        >
          <div className={styles.errorState}>
            <span className={styles.errorIcon} aria-hidden="true">⊘</span>
            <span className={styles.errorLabel}>
              {error === "denied" ? "Camera access denied" : "No camera found"}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className={`${styles.frame} ${className ?? ""}`}>
        {!ready && (
          <div className={styles.shimmerOverlay} aria-hidden="true" />
        )}
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          playsInline
          muted
          onCanPlay={() => setReady(true)}
          aria-label="Live camera preview"
        />
        {scanQR && ready && (
          <div className={styles.scanOverlay} aria-hidden="true">
            <span className={`${styles.scanBracket} ${styles.tl}`} />
            <span className={`${styles.scanBracket} ${styles.tr}`} />
            <span className={`${styles.scanBracket} ${styles.bl}`} />
            <span className={`${styles.scanBracket} ${styles.br}`} />
            <span className={styles.scanLine} />
          </div>
        )}
      </div>
    );
  },
);
