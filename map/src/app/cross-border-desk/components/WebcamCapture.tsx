// WebcamCapture — modal that streams the webcam and captures one frame of the
// invoice to a PNG data-URL. Everything stays on-device: the frame is drawn to a
// local canvas and handed to the attach handler; nothing is uploaded.
import { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, SHADOW_CARD_SOFT } from '../tokens';

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function WebcamCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [captureHover, setCaptureHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    // Unbind the (now-stopped) tracks so the <video> doesn't keep a frozen frame.
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API not available in this browser.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Enable Capture only once a frame is actually available (videoWidth>0),
          // not merely when the stream resolves — avoids a dead-looking button on
          // a slow camera.
          videoRef.current.onloadedmetadata = () => {
            if (!cancelled) setReady(true);
          };
          await videoRef.current.play().catch(() => undefined);
          if (!cancelled && videoRef.current.videoWidth > 0) setReady(true);
        }
      } catch (e) {
        setError(
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access and try again.'
            : e instanceof Error
              ? e.message
              : 'Could not start the camera.',
        );
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    stop();
    onCapture(dataUrl);
  };

  const close = () => {
    stop();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: COLORS.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
      }}
    >
      <div
        style={{
          background: COLORS.white,
          borderRadius: 20,
          boxShadow: SHADOW_CARD_SOFT,
          width: 560,
          maxWidth: '92vw',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          Take a photo of the invoice
        </div>
        <div style={{ fontSize: 13, color: COLORS.ink600, marginBottom: 16, lineHeight: 1.5 }}>
          Hold the invoice up to the camera. The frame is captured on this device —
          nothing is uploaded.
        </div>

        <div
          style={{
            position: 'relative',
            background: COLORS.charcoal,
            borderRadius: 12,
            overflow: 'hidden',
            aspectRatio: '4 / 3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {error ? (
            <div style={{ color: COLORS.white, fontSize: 14, padding: 24, textAlign: 'center', lineHeight: 1.5 }}>
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={close}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{
              border: `1px solid ${COLORS.border}`,
              background: cancelHover ? COLORS.canvas : COLORS.white,
              color: COLORS.charcoal,
              borderRadius: 6,
              height: 40,
              padding: '0 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!ready || !!error}
            onMouseEnter={() => setCaptureHover(true)}
            onMouseLeave={() => setCaptureHover(false)}
            style={{
              border: 'none',
              background:
                !ready || error
                  ? COLORS.ink400
                  : captureHover
                    ? COLORS.electric600
                    : COLORS.electric500,
              color: COLORS.white,
              borderRadius: 6,
              height: 40,
              padding: '0 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: !ready || error ? 'default' : 'pointer',
            }}
          >
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
