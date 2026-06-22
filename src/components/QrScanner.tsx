"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * A reusable camera-based QR scanner.
 *
 * It opens the device camera and calls `onScan` with the decoded text
 * (the Passport ID) when a QR code is detected. After a successful scan it
 * stops the camera so we don't fire repeatedly; the parent re-mounts this
 * component (via the `active` key) to scan again.
 */
export default function QrScanner({
  onScan,
  onError,
}: {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}) {
  // Keep a ref to the scanner instance so we can stop it on cleanup.
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Guard so we only handle the first successful scan.
  const handledRef = useRef(false);

  useEffect(() => {
    const elementId = "qr-reader";
    const html5Qrcode = new Html5Qrcode(elementId);
    scannerRef.current = html5Qrcode;

    html5Qrcode
      .start(
        { facingMode: "environment" }, // prefer the back camera
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (handledRef.current) return;
          handledRef.current = true;
          // Stop the camera before notifying the parent.
          html5Qrcode
            .stop()
            .catch(() => {})
            .finally(() => onScan(decodedText.trim()));
        },
        () => {
          // Per-frame "not found" errors are normal; ignore them.
        }
      )
      .catch((err) => {
        console.error("Camera start failed:", err);
        onError?.(
          "Could not start the camera. Please allow camera access and use HTTPS or localhost."
        );
      });

    // Cleanup: stop and clear the camera when the component unmounts.
    return () => {
      const instance = scannerRef.current;
      if (instance) {
        instance
          .stop()
          .catch(() => {})
          .finally(() => instance.clear());
      }
    };
    // We intentionally run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      id="qr-reader"
      className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-black"
    />
  );
}
