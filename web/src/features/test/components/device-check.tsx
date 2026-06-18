'use client';

import { useEffect, useState } from 'react';
import {
  Monitor,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Usb,
  Play,
} from 'lucide-react';
import { LexoraLogo } from '@/components/shared';
import { useTobiiStatus } from '../hooks';

interface DeviceCheckProps {
  onReady: () => void;
}

type SetupStep = 'install' | 'connect' | 'verify';

/**
 * Step-by-step wizard for Tobii eye tracker setup — codex editorial style.
 *
 * Flow:
 * 1. Install — download link + instructions for Tobii service
 * 2. Connect — plug in the tracker via USB
 * 3. Verify — auto-detect the device and show details
 *
 * Users who already have the service running can skip directly
 * to verification via the "Already installed" shortcut.
 */
export function DeviceCheck({ onReady }: DeviceCheckProps) {
  const { status, checking, error, checkStatus } = useTobiiStatus();
  const [step, setStep] = useState<SetupStep>('install');

  const isConnected = status?.connected === true;

  // Detect platform for download link context (client-only to avoid hydration mismatch)
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux' | 'unknown'>('unknown');
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    queueMicrotask(() => {
      if (ua.includes('win')) setPlatform('windows');
      else if (ua.includes('mac')) setPlatform('macos');
      else if (ua.includes('linux')) setPlatform('linux');
    });
  }, []);

  // Auto-check on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-advance to verify step when connected
  useEffect(() => {
    if (isConnected) queueMicrotask(() => setStep('verify'));
  }, [isConnected]);

  return (
    <div
      className="mx-auto flex max-w-lg flex-col items-center gap-8"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <LexoraLogo size="sm" showText={false} animate={checking} />
        <p className="text-xs font-black tracking-[0.3em] text-[#51513d] uppercase">Setup</p>
        <h2 className="text-3xl font-black tracking-tight text-[#1b2021]">Eye Tracker Setup</h2>
        <p className="max-w-md text-sm leading-relaxed text-[#1b2021]/64">
          Set up your Tobii eye tracker in a few simple steps.
        </p>
      </div>

      {/* Step indicator — codex-style bottom-border bar */}
      <div className="flex w-full max-w-md items-stretch">
        <StepBlock
          active={step === 'install'}
          complete={step === 'connect' || step === 'verify'}
          label="Install"
          num={1}
        />
        <StepBlock
          active={step === 'connect'}
          complete={step === 'verify'}
          label="Connect"
          num={2}
        />
        <StepBlock active={step === 'verify'} complete={isConnected} label="Verify" num={3} />
      </div>

      {/* Step content */}
      {step === 'install' && (
        <div className="w-full max-w-md border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[10px_10px_0_rgba(81,81,61,.08)]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#51513d]/10">
              <Download className="h-5 w-5 text-[#51513d]" />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-black text-[#1b2021]">
                Install Lexora Tobii Service
              </h3>
              <p className="text-xs leading-relaxed text-[#1b2021]/64">
                The desktop service streams gaze data from your Tobii device to Lexora. It runs as a
                small tray application on your computer.
              </p>
            </div>
          </div>

          {/* Platform-specific instructions */}
          <div className="mt-5 space-y-3 border border-[#51513d]/12 bg-[#e3dcc2]/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-black text-[#1b2021]">
              <Monitor className="h-3.5 w-3.5 text-[#51513d]" />
              {platform === 'windows'
                ? 'Windows'
                : platform === 'macos'
                  ? 'macOS'
                  : 'Your platform'}
            </p>
            <ol className="list-inside list-decimal space-y-2 text-xs text-[#1b2021]/64">
              <li>Download the Tobii Service installer from GitHub</li>
              <li>Run the installer and follow the setup wizard</li>
              <li>The service will appear as a tray icon</li>
              <li>Make sure it shows a green status indicator</li>
            </ol>
            <a
              href="/api/download/service"
              className="inline-flex items-center gap-1.5 text-xs font-black text-[#51513d] underline-offset-4 hover:underline"
            >
              Download Tobii Service
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-5 border border-[#51513d]/18 bg-[#e3dcc2] p-4 text-sm">
            <p className="mb-2 text-xs font-black tracking-[0.15em] text-[#51513d] uppercase">
              Supported Tobii Devices
            </p>
            <div className="grid gap-px overflow-hidden border border-[#51513d]/12 bg-[#51513d]/12">
              {['Tobii Pro Fusion', 'Tobii Pro Spectrum', 'Tobii Pro Nano'].map((d) => (
                <div key={d} className="bg-[#f3edd7] px-3 py-1.5 text-xs font-black text-[#1b2021]">
                  {d}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#1b2021]/52">
              Only Tobii Pro devices with SDK support are compatible. Consumer trackers such as
              Tobii Eye Tracker 5 are not supported.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                checkStatus();
                setStep('verify');
              }}
              className="border border-[#51513d]/25 bg-[#e3dcc2] px-4 py-2.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
            >
              Already installed? Skip →
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = '/api/download/service')}
              className="border border-[#51513d]/25 bg-[#e3dc95]/40 px-4 py-2.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#e3dc95]/60"
            >
              Download Service
            </button>
            <button
              type="button"
              onClick={() => setStep('connect')}
              className="bg-[#51513d] px-4 py-2.5 text-xs font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
            >
              I&apos;ve installed it
            </button>
          </div>
        </div>
      )}

      {step === 'connect' && (
        <div className="w-full max-w-md border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[10px_10px_0_rgba(81,81,61,.08)]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#51513d]/10">
              <Usb className="h-5 w-5 text-[#51513d]" />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-black text-[#1b2021]">Connect Your Eye Tracker</h3>
              <p className="text-xs leading-relaxed text-[#1b2021]/64">
                Plug your Tobii eye tracker into a USB port, then make sure the Tobii Service tray
                app shows a green indicator.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2 border border-[#51513d]/12 bg-[#e3dcc2]/60 p-4">
            <p className="text-xs font-black text-[#1b2021]">Checklist:</p>
            <ul className="list-inside list-disc space-y-1.5 text-xs text-[#1b2021]/64">
              <li>Eye tracker connected via USB</li>
              <li>Tobii Service tray icon is green</li>
              <li>Tracker positioned on the bottom edge of your monitor</li>
            </ul>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setStep('install')}
              className="border border-[#51513d]/25 bg-[#e3dcc2] px-4 py-2.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => {
                checkStatus();
                setStep('verify');
              }}
              className="inline-flex items-center bg-[#51513d] px-4 py-2.5 text-xs font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Check Connection
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="w-full max-w-md border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[10px_10px_0_rgba(81,81,61,.08)]">
          {checking ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <RefreshCw className="h-8 w-8 animate-spin text-[#51513d]" />
              <p className="text-sm text-[#1b2021]/64">Checking connection...</p>
            </div>
          ) : isConnected && status?.device ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-[#a6a867]" />
                <div>
                  <p className="text-sm font-black text-[#1b2021]">Device Connected</p>
                  <p className="text-xs text-[#1b2021]/58">Ready for calibration</p>
                </div>
              </div>
              <div className="space-y-1.5 border border-[#a6a867]/25 bg-[#a6a867]/8 p-4 text-xs">
                <p>
                  <span className="font-black text-[#1b2021]">Device:</span>{' '}
                  <span className="text-[#1b2021]/68">{status.device.deviceName}</span>
                </p>
                <p>
                  <span className="font-black text-[#1b2021]">Model:</span>{' '}
                  <span className="text-[#1b2021]/68">{status.device.model}</span>
                </p>
                <p>
                  <span className="font-black text-[#1b2021]">Serial:</span>{' '}
                  <span className="text-[#1b2021]/68">{status.device.serialNumber}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-[#51513d]" />
                <div>
                  <p className="text-sm font-black text-[#1b2021]">Device Not Found</p>
                  <p className="text-xs text-[#1b2021]/58">
                    {error || 'Could not connect to the Tobii service'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 border border-[#e3dc95]/50 bg-[#e3dc95]/12 p-4">
                <p className="text-xs font-black text-[#1b2021]">Troubleshooting:</p>
                <ul className="list-inside list-disc space-y-1.5 text-xs text-[#1b2021]/64">
                  <li>Make sure the Lexora Tobii Service app is running</li>
                  <li>Check that your Tobii tracker is plugged in via USB</li>
                  <li>Try restarting the service app</li>
                  <li>Ensure no other application is using the eye tracker</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep('install')}
              className="border border-[#51513d]/25 bg-[#e3dcc2] px-4 py-2.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
            >
              ← Start Over
            </button>
            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="inline-flex items-center border border-[#51513d]/25 bg-[#e3dcc2] px-4 py-2.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10 disabled:opacity-40"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
              Retry
            </button>
            {!isConnected && (
              <button
                type="button"
                onClick={() => (window.location.href = '/api/download/service')}
                className="border border-[#51513d]/25 bg-[#e3dc95]/40 px-4 py-2.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#e3dc95]/60"
              >
                Download Service
              </button>
            )}
            {isConnected && (
              <button
                type="button"
                onClick={() => (window.location.href = 'lexora://open')}
                className="border border-[#51513d]/25 bg-[#e3dc95]/40 px-4 py-2.5 text-xs font-black text-[#51513d] transition-colors hover:bg-[#e3dc95]/60"
              >
                Open Service
              </button>
            )}
            {isConnected && (
              <button
                type="button"
                onClick={onReady}
                className="bg-[#51513d] px-6 py-2.5 text-xs font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
              >
                Continue to Calibration
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepBlock({
  active,
  complete,
  label,
  num,
}: {
  active: boolean;
  complete: boolean;
  label: string;
  num: number;
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-2 border-b-[3px] px-3 py-2.5 transition-colors ${
        complete
          ? 'border-[#a6a867] bg-[#a6a867]/8'
          : active
            ? 'border-[#51513d] bg-[#51513d]/8'
            : 'border-[#51513d]/12 bg-transparent'
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center font-mono text-[10px] font-black ${
          complete
            ? 'bg-[#a6a867] text-[#1b2021]'
            : active
              ? 'bg-[#51513d] text-[#e3dcc2]'
              : 'bg-[#51513d]/10 text-[#51513d]/50'
        }`}
      >
        {complete ? '✓' : num}
      </span>
      <span
        className={`text-[10px] font-black tracking-[0.1em] uppercase ${
          active ? 'text-[#1b2021]' : complete ? 'text-[#51513d]' : 'text-[#51513d]/40'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
