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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LexoraLogo } from '@/components/shared';
import { useTobiiStatus } from '../hooks';

interface DeviceCheckProps {
  onReady: () => void;
}

type SetupStep = 'install' | 'connect' | 'verify';

/**
 * Step-by-step wizard for Tobii eye tracker setup.
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
        <h2 className="text-2xl font-bold tracking-tight">Eye Tracker Setup</h2>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          Set up your Tobii eye tracker in a few simple steps.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex w-full max-w-md items-center gap-2">
        <StepDot
          active={step === 'install'}
          complete={step === 'connect' || step === 'verify'}
          label="1. Install"
        />
        <div className="bg-border h-px flex-1" />
        <StepDot active={step === 'connect'} complete={step === 'verify'} label="2. Connect" />
        <div className="bg-border h-px flex-1" />
        <StepDot active={step === 'verify'} complete={isConnected} label="3. Verify" />
      </div>

      {/* Step content */}
      {step === 'install' && (
        <Card className="w-full max-w-md">
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold">Install Lexora Tobii Service</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  The desktop service streams gaze data from your Tobii device to Lexora. It runs as
                  a small tray application on your computer.
                </p>
              </div>
            </div>

            {/* Platform-specific instructions */}
            <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
              <p className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                <Monitor className="h-3.5 w-3.5" />
                {platform === 'windows'
                  ? 'Windows'
                  : platform === 'macos'
                    ? 'macOS'
                    : 'Your platform'}
              </p>
              <ol className="text-muted-foreground list-inside list-decimal space-y-2 text-xs">
                <li>Download the Tobii Service installer from GitHub</li>
                <li>Run the installer and follow the setup wizard</li>
                <li>The service will appear as a tray icon</li>
                <li>Make sure it shows a green status indicator</li>
              </ol>
              <a
                href="/api/download/service"
                className="text-primary inline-flex items-center gap-1.5 text-xs font-medium underline-offset-4 hover:underline"
              >
                Download Tobii Service
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="border-border bg-background text-muted-foreground rounded-2xl border p-4 text-sm">
              <p className="text-foreground mb-2 text-xs font-semibold">Supported Tobii Devices</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Tobii Pro Fusion</li>
                <li>Tobii Pro Spectrum</li>
                <li>Tobii Pro Nano</li>
              </ul>
              <p className="text-muted-foreground mt-3 text-xs">
                Only Tobii Pro devices with SDK support are compatible. Consumer trackers such as
                Tobii Eye Tracker 5 are not supported.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  checkStatus();
                  setStep('verify');
                }}
              >
                Already installed? Skip →
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.location.href = '/api/download/service';
                }}
              >
                Download Service
              </Button>
              <Button size="sm" onClick={() => setStep('connect')}>
                I&apos;ve installed it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'connect' && (
        <Card className="w-full max-w-md">
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Usb className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold">Connect Your Eye Tracker</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Plug your Tobii eye tracker into a USB port, then make sure the Tobii Service tray
                  app shows a green indicator.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 space-y-2 rounded-lg border p-4">
              <p className="text-foreground text-xs font-medium">Checklist:</p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1.5 text-xs">
                <li>Eye tracker connected via USB</li>
                <li>Tobii Service tray icon is green</li>
                <li>Tracker positioned on the bottom edge of your monitor</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep('install')}>
                ← Back
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  checkStatus();
                  setStep('verify');
                }}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Check Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'verify' && (
        <Card className="w-full max-w-md">
          <CardContent className="space-y-5 pt-6">
            {checking ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <RefreshCw className="text-primary h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">Checking connection...</p>
              </div>
            ) : isConnected && status?.device ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold">Device Connected</p>
                    <p className="text-muted-foreground text-xs">Ready for calibration</p>
                  </div>
                </div>
                <div className="bg-muted/50 space-y-1.5 rounded-lg border p-4 text-xs">
                  <p>
                    <span className="text-foreground font-medium">Device:</span>{' '}
                    <span className="text-muted-foreground">{status.device.deviceName}</span>
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Model:</span>{' '}
                    <span className="text-muted-foreground">{status.device.model}</span>
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Serial:</span>{' '}
                    <span className="text-muted-foreground">{status.device.serialNumber}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-destructive h-6 w-6" />
                  <div>
                    <p className="text-sm font-semibold">Device Not Found</p>
                    <p className="text-muted-foreground text-xs">
                      {error || 'Could not connect to the Tobii service'}
                    </p>
                  </div>
                </div>
                <div className="bg-destructive/5 border-destructive/20 space-y-2 rounded-lg border p-4">
                  <p className="text-foreground text-xs font-medium">Troubleshooting:</p>
                  <ul className="text-muted-foreground list-inside list-disc space-y-1.5 text-xs">
                    <li>Make sure the Lexora Tobii Service app is running</li>
                    <li>Check that your Tobii tracker is plugged in via USB</li>
                    <li>Try restarting the service app</li>
                    <li>Ensure no other application is using the eye tracker</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep('install')}>
                ← Start Over
              </Button>
              <Button variant="outline" size="sm" onClick={checkStatus} disabled={checking}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
                Retry
              </Button>
              {!isConnected && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.location.href = '/api/download/service';
                  }}
                >
                  Download Service
                </Button>
              )}
              {isConnected && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.location.href = 'lexora://open';
                  }}
                >
                  Open Service
                </Button>
              )}
              {isConnected && (
                <Button size="sm" onClick={onReady} className="px-6">
                  Continue to Calibration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepDot({
  active,
  complete,
  label,
}: {
  active: boolean;
  complete: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`h-3 w-3 rounded-full transition-colors ${
          complete ? 'bg-emerald-600' : active ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      />
      <span
        className={`text-[10px] ${active || complete ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </div>
  );
}
