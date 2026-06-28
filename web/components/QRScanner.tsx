"use client";

import { useEffect, useRef, useState } from "react";

import { LBracket, Mono } from "@/components/BoothUI";
import Spark from "@/components/Spark";

/*
 * QRScanner — the optional live LinkedIn QR scan, ported from
 * ios/BoothPilot/Components/QRScanner.swift (+ QRScreen.swift's viewfinder look).
 *
 * Behavior mirror of the iOS scanner: open the rear camera, continuously decode,
 * and emit the first decoded string exactly once, then stop the stream. The
 * @zxing/browser decoder is loaded LAZILY via a dynamic `import()` inside this
 * client effect (typed loosely as `any`) so the app builds and type-checks green
 * even when the package isn't installed yet — never a static top-level import.
 *
 * Graceful fallback (matches `QRScanner.isSupported == false` on iOS): if the
 * browser has no `mediaDevices`, the camera permission is denied, or the dynamic
 * import/decoder fails, we render the same mock viewfinder QRScreen used before
 * (diagonal hatch + faint spark + sweeping scan line) plus a subtle "TAP TO
 * CONTINUE" affordance. The whole-stage tap (BoothStage → Director.tap) still
 * advances the walkthrough, so the booth never gets stuck. We never throw, and
 * we always tear down the camera stream + decoder on unmount / when inactive.
 */

const VIEWFINDER = 286;
const SCAN_TOP = 23;
const SCAN_BOTTOM = 251;

const KEYFRAMES = `
@keyframes qrScan { from { transform: translateY(${SCAN_TOP}px); } to { transform: translateY(${SCAN_BOTTOM}px); } }
@media (prefers-reduced-motion: reduce) {
  .qr-scanline { animation: none !important; transform: translateY(${(SCAN_TOP + SCAN_BOTTOM) / 2}px); }
}
`;

const HATCH =
  "repeating-linear-gradient(45deg, rgba(20, 20, 19, 0.03) 0, rgba(20, 20, 19, 0.03) 12px, transparent 12px, transparent 24px)";

type QRScannerProps = {
  /** Called once with the first decoded string (a LinkedIn URL). */
  onResult: (text: string) => void;
  /** When false the camera/decoder stay off and the mock viewfinder shows. */
  active: boolean;
};

type ScanStatus = "starting" | "scanning" | "fallback";

export default function QRScanner({ onResult, active }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Keep the latest onResult in a ref so an inline parent callback doesn't
  // restart the camera every render (the effect only depends on `active`).
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [status, setStatus] = useState<ScanStatus>("starting");

  useEffect(() => {
    if (!active) {
      setStatus("starting");
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    // @zxing/browser IScannerControls (typed loosely — module is optional).
    let controls: { stop: () => void } | null = null;
    let emitted = false;

    setStatus("starting");

    const cleanup = () => {
      try {
        controls?.stop();
      } catch {
        // ignore decoder teardown errors
      }
      controls = null;
      if (stream) {
        for (const track of stream.getTracks()) {
          try {
            track.stop();
          } catch {
            // ignore track teardown errors
          }
        }
        stream = null;
      }
      const video = videoRef.current;
      if (video) {
        try {
          video.srcObject = null;
        } catch {
          // ignore
        }
      }
    };

    const fail = () => {
      cleanup();
      if (!cancelled) setStatus("fallback");
    };

    const emit = (text: string) => {
      if (emitted || cancelled || !text) return;
      emitted = true;
      cleanup();
      onResultRef.current(text);
    };

    void (async () => {
      const md =
        typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
      if (!md || typeof md.getUserMedia !== "function") {
        fail();
        return;
      }

      try {
        stream = await md.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        // permission denied / no camera
        fail();
        return;
      }
      if (cancelled || !stream) {
        cleanup();
        return;
      }

      const video = videoRef.current;
      if (!video) {
        cleanup();
        return;
      }
      // Autoplay policy: muted + inline so the preview can start on its own.
      video.muted = true;
      video.setAttribute("playsinline", "true");

      // Lazily load the decoder. Treated as `any`; a missing module just falls
      // back to the mock viewfinder instead of throwing.
      let mod: any;
      try {
        mod = await import("@zxing/browser");
      } catch {
        fail();
        return;
      }
      if (cancelled) {
        cleanup();
        return;
      }

      const ReaderCtor =
        mod?.BrowserQRCodeReader ??
        mod?.BrowserMultiFormatReader ??
        mod?.default?.BrowserQRCodeReader ??
        mod?.default?.BrowserMultiFormatReader;
      if (typeof ReaderCtor !== "function") {
        fail();
        return;
      }

      let reader: any;
      try {
        reader = new ReaderCtor();
      } catch {
        fail();
        return;
      }
      if (typeof reader?.decodeFromStream !== "function") {
        fail();
        return;
      }

      try {
        const maybeControls = reader.decodeFromStream(
          stream,
          video,
          (result: any, _err: unknown, ctrls: { stop: () => void }) => {
            if (ctrls && !controls) controls = ctrls;
            if (!result) return; // no code in frame yet — keep scanning
            const text =
              typeof result.getText === "function"
                ? result.getText()
                : (result.text ?? String(result));
            emit(text);
          },
        );
        // Newer @zxing/browser returns a Promise<IScannerControls>.
        controls =
          maybeControls && typeof maybeControls.then === "function"
            ? await maybeControls
            : (maybeControls ?? controls);
      } catch {
        fail();
        return;
      }

      if (cancelled || emitted) {
        cleanup();
        return;
      }
      setStatus("scanning");
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [active]);

  const scanning = status === "scanning";
  const showHint = status === "fallback";

  return (
    <div
      style={{
        position: "relative",
        width: VIEWFINDER,
        height: VIEWFINDER,
        borderRadius: 20,
        background: "var(--panel)",
        border: "1px solid rgba(20, 20, 19, 0.1)",
        overflow: "hidden",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* live camera feed (revealed once decoding is running) */}
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: scanning ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />

      {/* mock / no-camera fallback layer (diagonal hatch + faint spark) */}
      {!scanning && (
        <>
          <div style={{ position: "absolute", inset: 0, background: HATCH }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.4,
            }}
          >
            <Spark mode="idle" size={120} />
          </div>
        </>
      )}

      {/* corner brackets */}
      <LBracket rotation={0} style={{ position: "absolute", top: 30, left: 30 }} />
      <LBracket rotation={90} style={{ position: "absolute", top: 30, right: 30 }} />
      <LBracket
        rotation={180}
        style={{ position: "absolute", bottom: 30, right: 30 }}
      />
      <LBracket
        rotation={270}
        style={{ position: "absolute", bottom: 30, left: 30 }}
      />

      {/* sweeping scan line */}
      <div
        className="qr-scanline"
        style={{
          position: "absolute",
          top: 0,
          left: 30,
          right: 30,
          height: 2,
          background: "rgba(204, 120, 92, 0.8)",
          animation: "qrScan 2.6s ease-in-out infinite alternate",
        }}
      />

      {/* subtle tap-to-continue affordance (fallback only; the whole-stage tap
          actually advances the walkthrough) */}
      {showHint && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 16,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Mono size={11} weight={500} tracking={2} color="var(--muted)" style={{ opacity: 0.75 }}>
            TAP TO CONTINUE
          </Mono>
        </div>
      )}
    </div>
  );
}
