'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, AlertCircle, CheckCircle2, Loader2, Lightbulb, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LexoraLogo } from '@/components/shared';
import type { useWebcamGaze } from '../hooks';

interface CameraSetupProps {
  webcamGaze: ReturnType<typeof useWebcamGaze>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onReady: () => void;
}

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

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await runInitialization();
      if (cancelled) return;
    };
    init();
    return () => { cancelled = true; };
  }, [runInitialization]);

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
    <div className="flex flex-col items-center gap-8 max-w-lg mx-auto" style={{ animation: 'float-up 0.5s ease-out' }}>
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <LexoraLogo size="sm" showText={false} animate={initializing} />
        <h2 className="font-bold text-2xl tracking-tight">Camera Setup</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
          We need access to your camera to track eye movement. Your browser will ask for
          permission — please click <strong className="text-foreground">Allow</strong> when prompted.
        </p>
      </div>

      {/* Camera preview */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border shadow-sm bg-muted">
        <div className="relative aspect-4/3">
          <video
            ref={previewRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex flex-col justify-center items-center gap-3 bg-muted">
              {initializing ? (
                <>
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Connecting to camera...</span>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Camera not connected</span>
                </>
              )}
            </div>
          )}
          {cameraReady && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-emerald-600/90 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live
            </div>
          )}
        </div>
      </div>

      {/* Status checklist */}
      <div className="w-full max-w-md bg-card border rounded-xl p-4 space-y-3">
        <StatusRow ready={cameraReady} label="Camera" readyText="Connected" loadingText="Connecting..." />
        <StatusRow ready={modelReady} label="Face tracking model" readyText="Loaded" loadingText="Loading..." />
      </div>

      {/* Auto-detection notice */}
      <div className="flex items-start gap-3 w-full max-w-md bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-sm text-muted-foreground">
        <Wifi className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
        <span>
          <strong className="text-foreground">External camera?</strong> If you plug in a USB
          camera after opening this page, it will be detected automatically.
        </span>
      </div>

      {/* Tips */}
      <div className="w-full max-w-md bg-muted/50 border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">Tips for best results</span>
        </div>
        <ul className="space-y-1.5 text-muted-foreground text-[13px] list-disc list-inside">
          <li>Sit about arm&apos;s length from the screen</li>
          <li>Make sure your face is well-lit (avoid backlighting)</li>
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => void runInitialization()} disabled={initializing}>
          {initializing ? 'Retrying...' : 'Retry Setup'}
        </Button>
        <Button onClick={onReady} disabled={!allReady} size="lg" className="px-8">
          {allReady ? 'Continue to Calibration' : 'Waiting for setup...'}
        </Button>
      </div>
    </div>
  );
}

function StatusRow({
  ready,
  label,
  readyText,
  loadingText,
}: {
  ready: boolean;
  label: string;
  readyText: string;
  loadingText: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {ready ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-600 font-medium">{readyText}</span>
          </>
        ) : (
          <>
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            <span className="text-muted-foreground">{loadingText}</span>
          </>
        )}
      </div>
    </div>
  );
}
