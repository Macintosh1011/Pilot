"use client";

import { useEffect, useState } from "react";
import { toDataURL, type QRCodeToDataURLOptions } from "qrcode";

/*
 * QRCodeView — a real, scannable QR rendered as ink modules on a transparent
 * ground. Ported from ios/BoothPilot/Components/QRCodeView.swift (which used
 * CIQRCodeGenerator at correction level "M" with ink modules + clear bg).
 *
 * Here we use the `qrcode` package to produce a crisp PNG data URL and display
 * it nearest-neighbor (no smoothing), re-rendering whenever `value` changes.
 */

type QRCodeViewProps = {
  /** The string to encode. */
  value: string;
  /** Square render size in px; defaults to 200. */
  size?: number;
};

// Ink modules (#141413) on a fully transparent background, correction level M —
// matching the iOS CIFalseColor mapping (inputColor0 ink, inputColor1 clear).
const OPTIONS: QRCodeToDataURLOptions = {
  errorCorrectionLevel: "M",
  margin: 1,
  color: {
    dark: "#141413ff",
    light: "#00000000",
  },
};

export default function QRCodeView({ value, size = 200 }: QRCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    toDataURL(value, OPTIONS)
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (!dataUrl) {
    return <div style={{ width: size, height: size }} aria-hidden />;
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="QR code"
      style={{
        display: "block",
        width: size,
        height: size,
        imageRendering: "pixelated",
      }}
    />
  );
}
