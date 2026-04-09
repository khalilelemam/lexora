'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
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

  const runInitialization = useCallback(async () => {
    setInitializing(true);
    if (videoRef.current) {
      await initCamera(videoRef.current);
    }
    await initModel();
    setInitializing(false);
  }, [videoRef, initCamera, initModel]);

  // Initialize camera and model when component mounts
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await runInitialization();
      if (cancelled) return;
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [runInitialization]);

  // Mirror the camera stream to the visible preview element
  useEffect(() => {
    if (cameraReady && previewRef.current && videoRef.current?.srcObject) {
      previewRef.current.srcObject = videoRef.current.srcObject;
    }
  }, [cameraReady, videoRef]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) return;

    const handleDeviceChange = () => {
      if (!cameraReady && !initializing) {
        void runInitialization();
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [cameraReady, initializing, runInitialization]);

  const allReady = cameraReady && modelReady;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex justify-center items-center bg-muted rounded-full w-16 h-16">
        <Camera className="w-8 h-8 text-muted-foreground" />
      </div>

      <div className="text-center">
        <h2 className="font-semibold text-2xl">Camera Setup</h2>
        <p className="mt-1 text-muted-foreground">
          We need access to your camera to track eye movement.
        </p>
      </div>

      {/* Camera preview (separate element — the real video lives at page level) */}
      <Card className="w-full max-w-md overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-muted aspect-4/3">
            <video
              ref={previewRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex justify-center items-center bg-muted">
                {initializing ? (
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
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
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          )}
          <span>Camera {cameraReady ? 'ready' : 'initializing...'}</span>
        </div>
        <div className="flex items-center gap-2">
          {modelReady ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          )}
          <span>Face tracking model {modelReady ? 'loaded' : 'loading...'}</span>
        </div>
      </div>

      {/* Environment tips */}
      <div className="bg-muted p-3 rounded-md w-full max-w-md text-muted-foreground text-sm">
        <p className="font-medium text-foreground">Tips for best results:</p>
        <ul className="space-y-1 mt-1 list-disc list-inside">
          <li>Sit about arm&apos;s length from the screen</li>
          <li>Make sure your face is well-lit (no backlighting)</li>
          <li>Remove glasses if possible (reflections can interfere)</li>
          <li>Keep your head relatively still during the test</li>
        </ul>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void runInitialization()} disabled={initializing}>
          {initializing ? 'Retrying...' : 'Retry Camera Setup'}
        </Button>

        <Button onClick={onReady} disabled={!allReady}>
          {allReady ? 'Continue to Calibration' : 'Waiting for setup...'}
        </Button>
      </div>
    </div>
  );
}
