'use client';

import { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { useWebcamGaze } from '../hooks';

interface CameraSetupProps {
  /** The webcam gaze instance, created at the page level so it survives unmount. */
  webcamGaze: ReturnType<typeof useWebcamGaze>;
  /** The hidden video element used by MediaPipe (lives at the page level). */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Called when camera + model are both ready. */
  onReady: () => void;
}

/**
 * Camera permission + MediaPipe model loading screen.
 *
 * The actual `useWebcamGaze` hook and `<video>` element live at the page level
 * so they persist when this component unmounts (i.e. during calibration & tasks).
 * This component only drives initialization and shows a camera preview.
 */
export function CameraSetup({ webcamGaze, videoRef, onReady }: CameraSetupProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const [initializing, setInitializing] = useState(false);

  const { cameraReady, modelReady, error, initCamera, initModel } = webcamGaze;

  // Initialize camera and model when component mounts
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setInitializing(true);
      if (videoRef.current) {
        await initCamera(videoRef.current);
      }
      await initModel();
      if (!cancelled) setInitializing(false);
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the camera stream to the visible preview element
  useEffect(() => {
    if (cameraReady && previewRef.current && videoRef.current?.srcObject) {
      previewRef.current.srcObject = videoRef.current.srcObject;
    }
  }, [cameraReady, videoRef]);

  const allReady = cameraReady && modelReady;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Camera className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-semibold">Camera Setup</h2>
        <p className="mt-1 text-muted-foreground">
          We need access to your camera to track eye movement.
        </p>
      </div>

      {/* Camera preview (separate element — the real video lives at page level) */}
      <Card className="w-full max-w-md overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-[4/3] bg-muted">
            <video
              ref={previewRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                {initializing ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status indicators */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          {cameraReady ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span>Camera {cameraReady ? 'ready' : 'initializing...'}</span>
        </div>
        <div className="flex items-center gap-2">
          {modelReady ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span>Face tracking model {modelReady ? 'loaded' : 'loading...'}</span>
        </div>
      </div>

      {/* Environment tips */}
      <div className="w-full max-w-md rounded-md bg-muted p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Tips for best results:</p>
        <ul className="mt-1 list-inside list-disc space-y-1">
          <li>Sit about arm&apos;s length from the screen</li>
          <li>Make sure your face is well-lit (no backlighting)</li>
          <li>Remove glasses if possible (reflections can interfere)</li>
          <li>Keep your head relatively still during the test</li>
        </ul>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={onReady} disabled={!allReady}>
        {allReady ? 'Continue to Calibration' : 'Waiting for setup...'}
      </Button>
    </div>
  );
}
