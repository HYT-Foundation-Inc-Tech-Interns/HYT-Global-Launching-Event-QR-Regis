"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * A reusable camera-based QR scanner.
 *
 * It opens the device camera and calls `onScan` with the decoded text when a
 * QR code is detected. After a successful scan it stops the camera so we don't
 * fire repeatedly; the parent re-mounts this component (via a changing `key`)
 * to scan again.
 *
 * DOM ownership note: html5-qrcode injects its own <video>/<canvas> elements
 * into the container it is given. If React also owned that container, React
 * and the library would both try to remove the same nodes on unmount, which
 * crashes the page with "Failed to execute 'removeChild' on 'Node'". So we
 * create the container imperatively below and keep it out of React's tree —
 * React owns the outer div, the library owns the inner one.
 */
export default function QrScanner({
  onScan,
  onError,
}: {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  // Guard so we only handle the first successful scan.
  const handledRef = useRef(false);
  // Latest callbacks, so the mount-once effect never reads stale props.
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    // A unique id per mount. A shared constant id would let two instances
    // (e.g. React strict mode's double-mount) attach to the same element.
    const host = document.createElement("div");
    host.id = `qr-reader-${Math.random().toString(36).slice(2)}`;
    outer.appendChild(host);

    // True once this effect has been cleaned up, so late async callbacks
    // from the camera don't touch an unmounted component.
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    try {
      scanner = new Html5Qrcode(host.id);
    } catch {
      host.remove();
      onErrorRef.current?.("Could not initialise the camera scanner.");
      return;
    }

    // Kept separate from the .catch() chain so cleanup can wait for start()
    // to settle before trying to stop it.
    const started = scanner.start(
      { facingMode: "environment" }, // prefer the back camera
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (cancelled || handledRef.current) return;
        handledRef.current = true;
        onScanRef.current(decodedText.trim());
      },
      () => {
        // Per-frame "not found" errors are normal; ignore them.
      }
    );

    started.catch((err) => {
      if (cancelled) return;
      console.error("Camera start failed:", err);
      onErrorRef.current?.(
        "Could not start the camera. Please allow camera access and use HTTPS or localhost."
      );
    });

    // Cleanup: stop the camera and remove the library's DOM, in that order,
    // and never let a teardown error escape into React.
    return () => {
      cancelled = true;

      const teardown = () => {
        try {
          scanner?.clear();
        } catch {
          // clear() throws if the scanner isn't fully stopped; nothing to do.
        }
        try {
          host.remove();
        } catch {
          // already detached
        }
      };

      // Wait for start() to settle first — stopping a scanner that is still
      // starting up throws, and leaves the camera stream running.
      started.then(
        () => {
          try {
            const stopping = scanner?.stop();
            if (stopping) stopping.then(teardown, teardown);
            else teardown();
          } catch {
            teardown();
          }
        },
        // start() failed, so there is nothing running to stop.
        teardown
      );
    };
    // We intentionally run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={outerRef}
      className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-black"
    />
  );
}
