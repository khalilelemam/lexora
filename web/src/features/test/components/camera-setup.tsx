'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { cn } from '@/lib/utils';
import type { useWebcamGaze } from '../hooks';

interface CameraSetupProps {
  webcamGaze: ReturnType<typeof useWebcamGaze>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onReady: () => void;
}

/**
 * Camera Setup — redesigned premium layout
 *
 * Design philosophy:
 * - Full-page split: video preview fills the left; setup status on the right
 * - The user's first impression is their own face — not a loading screen
 * - Face centering guide gives directional arrows when face is off-center
 * - Camera quality and status info is shown clearly but without technical jargon
 * - The "Continue" button only enables when face is detected (enforcement)
 *
 * Research rationale:
 * - Requiring face presence ensures calibration has a valid signal from frame 1
 * - Operator-visible camera info (resolution) allows quality triage before calibration
 * - 480p minimum threshold is empirically documented for webcam eye tracking
 *   (Semmelmann & Weigelt 2018: "free-viewing eye-tracking on webcam")
 */
export function CameraSetup({ webcamGaze, videoRef, onReady }: CameraSetupProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const [initializing, setInitializing] = useState(false);
  const [cameraInfo, setCameraInfo] = useState<{
    label: string;
    width: number;
    height: number;
  } | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  // Face position offset — null means no face, {x,y} normalized −1..1 from center
  const [faceOffset, setFaceOffset] = useState<{ x: number; y: number } | null>(null);
  const faceCheckRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const { cameraReady, modelReady, error, initCamera, initModel } = webcamGaze;

  const runInitialization = useCallback(async () => {
    setInitializing(true);
    if (videoRef.current) await initCamera(videoRef.current);
    await initModel();
    setInitializing(false);
  }, [videoRef, initCamera, initModel]);

  // Auto-initialize on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => { await runInitialization(); if (cancelled) return; })();
    return () => { cancelled = true; };
  }, [runInitialization]);

  // Mirror the hidden tracking video to the visible preview
  useEffect(() => {
    if (cameraReady && previewRef.current && videoRef.current?.srcObject) {
      previewRef.current.srcObject = videoRef.current.srcObject;
    }
  }, [cameraReady, videoRef]);

  // Extract camera hardware info
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

  // Poll for face detection + position
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
      // Average left + right iris to get face center — normalized 0..1
      const centerX = (iris.leftX + iris.rightX) / 2;
      const centerY = (iris.leftY + iris.rightY) / 2;
      // Offset from screen center (normalized −1..1)
      const offsetX = (centerX - 0.5) * 2;
      const offsetY = (centerY - 0.5) * 2;
      setFaceOffset({ x: offsetX, y: offsetY });
    }, 200);
    return () => { if (faceCheckRef.current) clearInterval(faceCheckRef.current); };
  }, [cameraReady, modelReady, webcamGaze]);

  // Device change detection
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => { if (!cameraReady && !initializing) void runInitialization(); };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => { navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange); };
  }, [cameraReady, initializing, runInitialization]);

  const allReady = cameraReady && modelReady;
  const canProceed = allReady && faceDetected;
  const resolutionQuality: 'excellent' | 'good' | 'poor' | null = cameraInfo
    ? cameraInfo.width >= 1280 ? 'excellent' : cameraInfo.width >= 640 ? 'good' : 'poor'
    : null;

  return (
    <div className="z-50 fixed inset-0 bg-[#FDF8F0] flex overflow-hidden">

      {/* ── Left: Camera preview ── */}
      <div className="relative flex-1 bg-[#1C1A18] overflow-hidden">
        {/* Video */}
        <video
          ref={previewRef}
          className="w-full h-full object-cover"
          autoPlay playsInline muted
          style={{ transform: 'scaleX(-1)' /* mirror */ }}
        />

        {/* Loading state overlay */}
        {!cameraReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1C1A18]">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[#4A7C59]/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-[#4A7C59] animate-spin border-t-transparent" />
            </div>
            <p className="text-white/60 text-sm font-medium tracking-wide">
              {initializing ? 'Connecting camera…' : 'Camera not found'}
            </p>
          </div>
        )}

        {/* Face position guide overlay */}
        {cameraReady && (
          <FaceGuideOverlay detected={faceDetected} offset={faceOffset} />
        )}

        {/* Live badge + camera name */}
        {cameraReady && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                faceDetected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse',
              )} />
              <span className="text-white/90 text-xs font-medium">
                {faceDetected ? 'Face detected' : 'Looking for face…'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Setup panel ── */}
      <div className="w-[380px] shrink-0 flex flex-col bg-[#FDF8F0] border-l border-[#E8E0D4] overflow-y-auto">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#E8E0D4]">
          <LexoraLogo size="sm" className="mb-5" />
          <h2 className="font-bold text-xl tracking-tight text-[#2D2A26]">Camera Setup</h2>
          <p className="mt-1.5 text-[#6B6560] text-sm leading-relaxed">
            Position your face in the oval guide. The blue brackets will turn green when you&apos;re ready.
          </p>
        </div>

        {/* Status checklist */}
        <div className="px-8 py-5 space-y-3 border-b border-[#E8E0D4]">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#A09890] mb-4">Device Check</p>

          <StatusItem
            done={cameraReady}
            loading={initializing && !cameraReady}
            label="Camera"
            doneText={cameraInfo?.label ?? 'Connected'}
            loadingText="Connecting…"
            pendingText="Not found"
          />

          {/* Resolution sub-row */}
          {cameraInfo && (
            <div className="flex items-center justify-between pl-7 text-xs">
              <span className="text-[#A09890]">Resolution</span>
              <span className={cn(
                'font-medium tabular-nums',
                resolutionQuality === 'excellent' ? 'text-emerald-600' :
                resolutionQuality === 'good' ? 'text-[#4A7C59]' : 'text-amber-600',
              )}>
                {cameraInfo.width}×{cameraInfo.height}
                <span className="ml-1.5 font-normal text-[#A09890]">
                  {resolutionQuality === 'poor' ? '(low — may affect accuracy)' :
                   resolutionQuality === 'excellent' ? '(HD ✓)' : '(OK)'}
                </span>
              </span>
            </div>
          )}

          <StatusItem
            done={modelReady}
            loading={cameraReady && !modelReady}
            label="Eye tracking"
            doneText="Ready"
            loadingText="Loading…"
            pendingText="Waiting for camera"
          />

          <StatusItem
            done={faceDetected}
            loading={allReady && !faceDetected}
            label="Face detected"
            doneText="Looking good!"
            loadingText="Center your face in the oval"
            pendingText="Waiting for camera"
          />
        </div>

        {/* Positioning tips — context-aware */}
        <div className="px-8 py-5 flex-1">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#A09890] mb-3">Position tips</p>
          <ul className="space-y-2.5 text-[13px] text-[#6B6560]">
            <TipItem>Sit about <strong className="text-[#2D2A26]">arm&apos;s length</strong> from the screen</TipItem>
            <TipItem>Make sure your face is <strong className="text-[#2D2A26]">evenly lit</strong> — avoid bright light behind you</TipItem>
            <TipItem>Keep your <strong className="text-[#2D2A26]">head still</strong> — only move your eyes during calibration</TipItem>
            <TipItem>Remove glasses if possible to reduce reflections</TipItem>
          </ul>

          {/* Low-resolution warning */}
          {resolutionQuality === 'poor' && (
            <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Your camera resolution is below 640×480. Eye tracking accuracy may be reduced. Consider using a higher-quality camera.</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-8 mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="px-8 pb-8 pt-2 flex flex-col gap-3">
          <Button
            onClick={onReady}
            disabled={!canProceed}
            size="lg"
            className="w-full bg-[#4A7C59] hover:bg-[#3D6A4B] text-white disabled:opacity-40"
          >
            {canProceed ? (
              <>
                Continue to Calibration
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : !allReady ? (
              'Setting up…'
            ) : (
              'Center your face to continue'
            )}
          </Button>

          <button
            type="button"
            onClick={() => void runInitialization()}
            disabled={initializing}
            className="flex items-center justify-center gap-1.5 text-[#8B857E] text-xs hover:text-[#2D2A26] transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3 h-3', initializing && 'animate-spin')} />
            {initializing ? 'Retrying…' : 'Retry camera setup'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Face Guide Overlay ────────────────────────────────────────────── */

/**
 * SVG overlay on the camera feed:
 * - Darkened area outside the oval (keeps focus on face)
 * - Oval turns green when face is detected
 * - Directional arrow shows which way to move if face is off-center
 */
function FaceGuideOverlay({
  detected,
  offset,
}: {
  detected: boolean;
  offset: { x: number; y: number } | null;
}) {
  const stroke = detected ? '#10b981' : '#f59e0b';
  const dash = detected ? '' : '10 5';
  const cx = 200;
  const cy = 155;
  const rx = 90;
  const ry = 115;

  // Should we show a directional arrow?
  const needsArrow = !detected && offset !== null &&
    (Math.abs(offset.x) > 0.25 || Math.abs(offset.y) > 0.25);
  const arrowAngle = offset ? Math.atan2(offset.y, offset.x) * (180 / Math.PI) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 400 310"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <mask id="oval-mask">
            <rect width="400" height="310" fill="white" />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
          </mask>
        </defs>

        {/* Dark vignette outside oval */}
        <rect
          width="400" height="310"
          fill="black" opacity="0.35"
          mask="url(#oval-mask)"
        />

        {/* Oval guide */}
        <ellipse
          cx={cx} cy={cy} rx={rx} ry={ry}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeDasharray={dash}
          opacity="0.9"
        />

        {/* Corner brackets */}
        {[
          `M${cx - rx - 20} ${cy - ry + 20} L${cx - rx - 20} ${cy - ry - 10} L${cx - rx + 10} ${cy - ry - 10}`,
          `M${cx + rx + 20} ${cy - ry + 20} L${cx + rx + 20} ${cy - ry - 10} L${cx + rx - 10} ${cy - ry - 10}`,
          `M${cx - rx - 20} ${cy + ry - 20} L${cx - rx - 20} ${cy + ry + 10} L${cx - rx + 10} ${cy + ry + 10}`,
          `M${cx + rx + 20} ${cy + ry - 20} L${cx + rx + 20} ${cy + ry + 10} L${cx + rx - 10} ${cy + ry + 10}`,
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
        ))}

        {/* Status text below oval */}
        <text
          x={cx} y={cy + ry + 28}
          textAnchor="middle"
          fill={stroke}
          fontSize="12"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          opacity="0.95"
        >
          {detected ? '✓ Looking good!' : 'Center your face in the oval'}
        </text>

        {/* Directional arrow when face is detected but off-center */}
        {needsArrow && (
          <g transform={`translate(${cx}, ${cy}) rotate(${arrowAngle})`}>
            <path
              d="M0 -50 L8 -38 L4 -38 L4 -30 L-4 -30 L-4 -38 L-8 -38 Z"
              fill={stroke}
              opacity="0.8"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

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
        <div className={cn(
          'w-2 h-2 rounded-full shrink-0 transition-colors duration-500',
          done ? 'bg-emerald-500' : loading ? 'bg-amber-400 animate-pulse' : 'bg-[#D4CBBD]',
        )} />
        <span className="text-sm text-[#2D2A26] font-medium">{label}</span>
      </div>
      <span className={cn(
        'text-xs transition-colors duration-300',
        done ? 'text-emerald-600 font-medium' : loading ? 'text-amber-600' : 'text-[#A09890]',
      )}>
        {done ? doneText : loading ? loadingText : pendingText}
      </span>
    </div>
  );
}

function TipItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 leading-snug">
      <span className="text-[#4A7C59] mt-0.5 shrink-0">·</span>
      <span>{children}</span>
    </li>
  );
}

function shortenCameraLabel(label: string): string {
  const s = label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*/gi, '').trim();
  return s.length > 38 ? s.slice(0, 35) + '…' : s;
}
