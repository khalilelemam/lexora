'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { ReactNode, RefObject } from 'react';
import { ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { cn } from '@/lib/utils';
import type { useWebcamGaze } from '../hooks';

interface CameraSetupProps {
  webcamGaze: ReturnType<typeof useWebcamGaze>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onReady: () => void;
}

export function CameraSetup({ webcamGaze, videoRef, onReady }: CameraSetupProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const [initializing, setInitializing] = useState(false);
  const [cameraInfo, setCameraInfo] = useState<{
    label: string;
    width: number;
    height: number;
  } | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceOffset, setFaceOffset] = useState<{ x: number; y: number } | null>(null);
  const faceCheckRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const { cameraReady, modelReady, error, initCamera, initModel } = webcamGaze;

  const runInitialization = useCallback(async () => {
    setInitializing(true);
    if (videoRef.current) await initCamera(videoRef.current);
    await initModel();
    setInitializing(false);
  }, [videoRef, initCamera, initModel]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await runInitialization();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [runInitialization]);

  useEffect(() => {
    if (cameraReady && previewRef.current && videoRef.current?.srcObject) {
      previewRef.current.srcObject = videoRef.current.srcObject;
    }
  }, [cameraReady, videoRef]);

  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;
    const video = videoRef.current;
    const tracks = video.srcObject instanceof MediaStream ? video.srcObject.getVideoTracks() : [];
    const track = tracks[0];
    if (track) {
      const settings = track.getSettings();
      queueMicrotask(() => {
        setCameraInfo({
          label: shortenCameraLabel(track.label || 'Unknown camera'),
          width: settings.width ?? video.videoWidth ?? 0,
          height: settings.height ?? video.videoHeight ?? 0,
        });
      });
    }
  }, [cameraReady, videoRef]);

  useEffect(() => {
    if (!cameraReady || !modelReady) return;
    faceCheckRef.current = setInterval(() => {
      const iris = webcamGaze.getLastIrisPosition?.();
      if (!iris) {
        setFaceDetected(false);
        setFaceOffset(null);
        return;
      }
      setFaceDetected(true);
      const centerX = (iris.leftX + iris.rightX) / 2;
      const centerY = (iris.leftY + iris.rightY) / 2;
      setFaceOffset({
        x: (centerX - 0.5) * 2,
        y: (centerY - 0.5) * 2,
      });
    }, 200);
    return () => {
      if (faceCheckRef.current) clearInterval(faceCheckRef.current);
    };
  }, [cameraReady, modelReady, webcamGaze]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => {
      if (!cameraReady && !initializing) void runInitialization();
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [cameraReady, initializing, runInitialization]);

  const allReady = cameraReady && modelReady;
  const canProceed = allReady && faceDetected;
  const resolutionQuality: 'excellent' | 'good' | 'poor' | null = cameraInfo
    ? cameraInfo.width >= 1280
      ? 'excellent'
      : cameraInfo.width >= 640
        ? 'good'
        : 'poor'
    : null;

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-[#e3dcc2]">
      <div className="relative flex-1 overflow-hidden bg-[#1b2021]">
        <video
          ref={previewRef}
          className="h-full w-full object-cover opacity-95"
          autoPlay
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />

        {!cameraReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1b2021]">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#e3dc95]/30" />
              <div className="absolute inset-2 animate-spin rounded-full border-2 border-[#a6a867] border-t-transparent" />
            </div>
            <p className="text-sm font-medium tracking-wide text-[#e3dcc2]/70">
              {initializing ? 'Connecting camera...' : 'Camera not found'}
            </p>
          </div>
        )}

        {cameraReady && <FaceGuideOverlay detected={faceDetected} offset={faceOffset} />}

        {cameraReady && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-[#1b2021]/70 px-3 py-1.5 backdrop-blur-sm">
              <div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  faceDetected ? 'animate-pulse bg-[#a6a867]' : 'animate-pulse bg-[#e3dc95]',
                )}
              />
              <span className="text-xs font-medium text-[#e3dcc2]/90">
                {faceDetected ? 'Face detected' : 'Looking for face...'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex w-95 shrink-0 flex-col overflow-y-auto border-l border-[#51513d]/18 bg-[#f3edd7]">
        <div className="border-b border-[#51513d]/18 px-8 pt-8 pb-6">
          <LexoraLogo size="sm" className="mb-5" />
          <h2 className="text-xl font-bold tracking-tight text-[#1b2021]">Camera Setup</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#1b2021]/65">
            Position your face in the oval guide. The guide turns sage when the signal is ready.
          </p>
        </div>

        <div className="space-y-3 border-b border-[#51513d]/18 px-8 py-5">
          <p className="mb-4 text-[10px] font-semibold tracking-widest text-[#51513d]/65 uppercase">
            Device Check
          </p>

          <StatusItem
            done={cameraReady}
            loading={initializing && !cameraReady}
            label="Camera"
            doneText={cameraInfo?.label ?? 'Connected'}
            loadingText="Connecting..."
            pendingText="Not found"
          />

          {cameraInfo && (
            <div className="flex items-center justify-between pl-7 text-xs">
              <span className="text-[#51513d]/65">Resolution</span>
              <span
                className={cn(
                  'font-medium tabular-nums',
                  resolutionQuality === 'excellent'
                    ? 'text-[#51513d]'
                    : resolutionQuality === 'good'
                      ? 'text-[#a6a867]'
                      : 'text-[#8b6f25]',
                )}
              >
                {cameraInfo.width}x{cameraInfo.height}
                <span className="ml-1.5 font-normal text-[#51513d]/65">
                  {resolutionQuality === 'poor'
                    ? '(low - may affect accuracy)'
                    : resolutionQuality === 'excellent'
                      ? '(HD OK)'
                      : '(OK)'}
                </span>
              </span>
            </div>
          )}

          <StatusItem
            done={modelReady}
            loading={cameraReady && !modelReady}
            label="Eye tracking"
            doneText="Ready"
            loadingText="Loading..."
            pendingText="Waiting for camera"
          />

          <StatusItem
            done={faceDetected}
            loading={allReady && !faceDetected}
            label="Face detected"
            doneText="Looking good"
            loadingText="Center your face in the oval"
            pendingText="Waiting for camera"
          />
        </div>

        <div className="flex-1 px-8 py-5">
          <p className="mb-3 text-[10px] font-semibold tracking-widest text-[#51513d]/65 uppercase">
            Position tips
          </p>
          <ul className="space-y-2.5 text-[13px] text-[#1b2021]/65">
            <TipItem>
              Sit about <strong className="text-[#1b2021]">arm&apos;s length</strong> from the
              screen
            </TipItem>
            <TipItem>
              Make sure your face is <strong className="text-[#1b2021]">evenly lit</strong> - avoid
              bright light behind you
            </TipItem>
            <TipItem>
              Keep your <strong className="text-[#1b2021]">head still</strong> - only move your eyes
              during calibration
            </TipItem>
            <TipItem>Remove glasses if possible to reduce reflections</TipItem>
          </ul>

          {resolutionQuality === 'poor' && (
            <div className="mt-4 flex items-start gap-2.5 border border-[#e3dc95] bg-[#e3dc95]/25 p-3 text-xs leading-relaxed text-[#51513d]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Your camera resolution is below 640x480. Eye tracking accuracy may be reduced.
                Consider using a higher-quality camera.
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-8 mb-4 flex items-start gap-2.5 border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 px-8 pt-2 pb-8">
          <Button
            onClick={onReady}
            disabled={!canProceed}
            size="lg"
            className="w-full bg-[#51513d] text-[#f3edd7] hover:bg-[#1b2021] disabled:opacity-40"
          >
            {canProceed ? (
              <>
                Continue to Calibration
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : !allReady ? (
              'Setting up...'
            ) : (
              'Center your face to continue'
            )}
          </Button>

          <button
            type="button"
            onClick={() => void runInitialization()}
            disabled={initializing}
            className="flex items-center justify-center gap-1.5 text-xs text-[#51513d]/65 transition-colors hover:text-[#1b2021] disabled:opacity-40"
          >
            <RefreshCw className={cn('h-3 w-3', initializing && 'animate-spin')} />
            {initializing ? 'Retrying...' : 'Retry camera setup'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FaceGuideOverlay({
  detected,
  offset,
}: {
  detected: boolean;
  offset: { x: number; y: number } | null;
}) {
  const stroke = detected ? '#a6a867' : '#e3dc95';
  const dash = detected ? '' : '10 5';
  const cx = 200;
  const cy = 155;
  const rx = 90;
  const ry = 115;
  const needsArrow =
    !detected && offset !== null && (Math.abs(offset.x) > 0.25 || Math.abs(offset.y) > 0.25);
  const arrowAngle = offset ? Math.atan2(offset.y, offset.x) * (180 / Math.PI) : 0;

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full" viewBox="0 0 400 310" preserveAspectRatio="xMidYMid slice">
        <defs>
          <mask id="oval-mask">
            <rect width="400" height="310" fill="white" />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
          </mask>
        </defs>

        <rect width="400" height="310" fill="#1b2021" opacity="0.42" mask="url(#oval-mask)" />
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeDasharray={dash}
          opacity="0.95"
        />

        {[
          `M${cx - rx - 20} ${cy - ry + 20} L${cx - rx - 20} ${cy - ry - 10} L${cx - rx + 10} ${cy - ry - 10}`,
          `M${cx + rx + 20} ${cy - ry + 20} L${cx + rx + 20} ${cy - ry - 10} L${cx + rx - 10} ${cy - ry - 10}`,
          `M${cx - rx - 20} ${cy + ry - 20} L${cx - rx - 20} ${cy + ry + 10} L${cx - rx + 10} ${cy + ry + 10}`,
          `M${cx + rx + 20} ${cy + ry - 20} L${cx + rx + 20} ${cy + ry + 10} L${cx + rx - 10} ${cy + ry + 10}`,
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
        ))}

        <text
          x={cx}
          y={cy + ry + 28}
          textAnchor="middle"
          fill={stroke}
          fontSize="12"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="700"
          opacity="0.98"
        >
          {detected ? 'Looking good' : 'Center your face in the oval'}
        </text>

        {needsArrow && (
          <g transform={`translate(${cx}, ${cy}) rotate(${arrowAngle})`}>
            <path
              d="M0 -50 L8 -38 L4 -38 L4 -30 L-4 -30 L-4 -38 L-8 -38 Z"
              fill={stroke}
              opacity="0.85"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

function StatusItem({
  done,
  loading,
  label,
  doneText,
  loadingText,
  pendingText,
}: {
  done: boolean;
  loading: boolean;
  label: string;
  doneText: string;
  loadingText: string;
  pendingText: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'h-2 w-2 shrink-0 rounded-full transition-colors duration-500',
            done ? 'bg-[#a6a867]' : loading ? 'animate-pulse bg-[#e3dc95]' : 'bg-[#51513d]/20',
          )}
        />
        <span className="text-sm font-medium text-[#1b2021]">{label}</span>
      </div>
      <span
        className={cn(
          'text-xs transition-colors duration-300',
          done ? 'font-medium text-[#51513d]' : loading ? 'text-[#8b6f25]' : 'text-[#51513d]/65',
        )}
      >
        {done ? doneText : loading ? loadingText : pendingText}
      </span>
    </div>
  );
}

function TipItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 leading-snug">
      <span className="mt-0.5 shrink-0 text-[#a6a867]">-</span>
      <span>{children}</span>
    </li>
  );
}

function shortenCameraLabel(label: string): string {
  const s = label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*/gi, '').trim();
  return s.length > 38 ? `${s.slice(0, 35)}...` : s;
}
