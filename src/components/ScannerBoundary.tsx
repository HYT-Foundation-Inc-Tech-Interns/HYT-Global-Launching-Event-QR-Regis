"use client";

import { Component, type ReactNode } from "react";

/**
 * Error boundary around the camera scanner.
 *
 * The scanner drives a third-party library that manipulates the DOM directly,
 * so a failure there could otherwise propagate up and blank the whole page
 * ("Application error: a client-side exception has occurred"). Guests would
 * lose their passport view over a camera glitch. This catches it and shows a
 * recoverable message instead.
 */
export default class ScannerBoundary extends Component<
  { children: ReactNode; onFail?: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Scanner crashed:", error);
    this.props.onFail?.();
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-700 ring-1 ring-red-200">
          The camera scanner stopped unexpectedly. Close it and tap
          <span className="font-semibold"> 📷 Scan QR </span>
          again, or scan the floor poster with your phone&apos;s camera app.
        </div>
      );
    }
    return this.props.children;
  }
}
