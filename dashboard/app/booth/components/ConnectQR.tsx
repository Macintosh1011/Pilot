"use client";

// Client component — QRCode.toDataURL runs in an effect (browser/Node both work
// with the qrcode library, but we avoid SSR mismatch by deferring to useEffect).

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import styles from "./ConnectQR.module.css";

export function ConnectQR({ url, caption }: { url: string; caption?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 240,
      margin: 3,
      color: {
        dark: "#141413", // --ink
        light: "#FAF9F5", // --paper
      },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => {});
  }, [url]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame}>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR code: ${url}`}
            className={styles.qr}
            width={240}
            height={240}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>
      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}
