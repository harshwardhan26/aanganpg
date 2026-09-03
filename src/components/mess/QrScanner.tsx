"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff } from "lucide-react";
import { scanLinkKey } from "@/lib/mess";

type Status = "idle" | "starting" | "scanning" | "wrong-mess" | "denied" | "unavailable";

/** Chrome and most Android browsers decode QR natively; Safari does not. */
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => Detector;
  }
}

/**
 * The camera, inside the site.
 *
 * The poster still works on its own — point a phone camera at it and the link
 * opens. This exists because the camera app picks which browser opens that
 * link, and if it picks an app's built-in one the student is not signed in
 * there: they sign in, land nowhere useful, and scan again. Starting from the
 * browser they are already signed into removes that lottery entirely.
 *
 * Nothing here is trusted. The key read off the poster is handed to the same
 * server check as before, which is the only thing that can say whether it is
 * real.
 */
export function QrScanner({ messId }: { messId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  // `on` is the only thing the effect watches. `status` is what the screen
  // says, and it changes *while* the camera runs — the first version had the
  // effect depending on it, so reporting "scanning" tore the effect down and
  // React ran the cleanup, which stopped the tracks. The camera opened and went
  // black in the same frame.
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const stopped = useRef(false);

  useEffect(() => {
    if (!on) return;

    let stream: MediaStream | null = null;
    stopped.current = false;

    const stop = () => {
      stopped.current = true;
      stream?.getTracks().forEach((track) => track.stop());
    };

    (async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // The back camera. Without this a laptop-shaped device opens the one
          // pointing at the student's face.
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        setStatus("denied");
        return;
      }
      if (stopped.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stop();
        return;
      }
      video.srcObject = stream;
      // iOS refuses to play an inline video that was not explicitly asked to.
      await video.play().catch(() => {});
      setStatus("scanning");

      const detector = window.BarcodeDetector
        ? new window.BarcodeDetector({ formats: ["qr_code"] })
        : null;
      // Safari has no BarcodeDetector, and Safari is the browser this was built
      // for. Loaded only when needed, so Android never pays for it.
      const jsQR = detector ? null : (await import("jsqr")).default;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      const read = async () => {
        if (stopped.current) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA && context && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          let raw: string | null = null;
          if (detector) {
            const found = await detector.detect(canvas).catch(() => []);
            raw = found[0]?.rawValue ?? null;
          } else if (jsQR) {
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            raw = jsQR(pixels.data, pixels.width, pixels.height)?.data ?? null;
          }

          if (raw) {
            const result = scanLinkKey(raw, messId);
            if (result.ok) {
              stop();
              // The server does the marking, exactly as it does for a poster
              // opened in the camera app. This only saves the walk.
              router.replace(`/my-mess/${messId}/scan?k=${encodeURIComponent(result.key)}`);
              return;
            }
            if (result.reason === "other-mess") {
              stop();
              setOn(false);
              setStatus("wrong-mess");
              return;
            }
            // Anything else in shot — a sticker, a payment code — is simply not
            // this poster. Keep looking rather than blaming the student.
          }
        }

        requestAnimationFrame(() => void read());
      };

      void read();
    })();

    return stop;
  }, [on, messId, router]);

  if (!on) {
    const problem =
      status === "denied" || status === "unavailable" || status === "wrong-mess" ? status : null;

    return (
      <div className="flex flex-col gap-4">
        {problem && (
          <div className="rounded-2xl border-2 border-amber-800 bg-amber-50 p-5 text-center">
            <p className="flex items-center justify-center gap-2 font-heading text-lg font-bold text-amber-900">
              <CameraOff className="h-5 w-5" aria-hidden />
              {problem === "wrong-mess"
                ? "That is another mess's paper"
                : problem === "denied"
                  ? "The camera did not open"
                  : "This phone cannot open the camera here"}
            </p>
            <p className="mt-2 text-base text-amber-900">
              {problem === "wrong-mess"
                ? "Point it at the paper in your own mess."
                : "Use your phone camera app on the QR paper instead. It works the same way."}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setStatus("starting");
            setOn(true);
          }}
          className="flex min-h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary-strong px-6 text-lg font-semibold text-white transition-transform duration-200 active:scale-[0.98]"
        >
          <Camera className="h-5 w-5" aria-hidden />
          {problem ? "Try again" : "Open camera"}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary-strong bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        // Square: a QR is square, and a tall video on a phone puts the poster
        // somewhere the student has to hunt for.
        className="aspect-square w-full object-cover"
      />
      <p className="bg-primary-strong px-4 py-3 text-center text-base font-semibold text-white">
        {status === "scanning" ? "Point at the QR paper" : "Opening the camera…"}
      </p>
    </div>
  );
}
