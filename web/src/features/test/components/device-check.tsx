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
      className="flex flex-col items-center gap-8 max-w-lg mx-auto"
      style={{ animation: 'float-up 0.5s ease-out' }}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <LexoraLogo size="sm" showText={false} animate={checking} />
        <h2 className="font-bold text-2xl tracking-tight">Eye Tracker Setup</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
          Set up your Tobii eye tracker in a few simple steps.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 w-full max-w-md">
        <StepDot
          active={step === 'install'}
          complete={step === 'connect' || step === 'verify'}
          label="1. Install"
        />
        <div className="flex-1 h-px bg-border" />
        <StepDot
          active={step === 'connect'}
          complete={step === 'verify'}
          label="2. Connect"
        />
        <div className="flex-1 h-px bg-border" />
        <StepDot
          active={step === 'verify'}
          complete={isConnected}
          label="3. Verify"
        />
      </div>

      {/* Step content */}
      {step === 'install' && (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Install Lexora Tobii Service</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The desktop service streams gaze data from your Tobii device to Lexora.
                  It runs as a small tray application on your computer.
                </p>
              </div>
            </div>

            {/* Platform-specific instructions */}
            <div className="rounded-lg bg-muted/50 border p-4 space-y-3">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                {platform === 'windows' ? 'Windows' : platform === 'macos' ? 'macOS' : 'Your platform'}
              </p>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Download the Tobii Service installer from GitHub</li>
                <li>Run the installer and follow the setup wizard</li>
                <li>The service will appear as a tray icon</li>
                <li>Make sure it shows a green status indicator</li>
              </ol>
              <a
                href="https://github.com/khalilelemam/eglex/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4"
              >
                Download from GitHub Releases
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex gap-3 pt-1">
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
              <Button size="sm" onClick={() => setStep('connect')}>
                I&apos;ve installed it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'connect' && (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                <Usb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Connect Your Eye Tracker</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Plug your Tobii eye tracker into a USB port, then make sure the Tobii
                  Service tray app shows a green indicator.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
              <p className="text-xs font-medium text-foreground">Checklist:</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
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
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Check Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'verify' && (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-5">
            {checking ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Checking connection...</p>
              </div>
            ) : isConnected && status?.device ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-sm">Device Connected</p>
                    <p className="text-xs text-muted-foreground">Ready for calibration</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 border p-4 space-y-1.5 text-xs">
                  <p>
                    <span className="font-medium text-foreground">Device:</span>{' '}
                    <span className="text-muted-foreground">{status.device.deviceName}</span>
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Model:</span>{' '}
                    <span className="text-muted-foreground">{status.device.model}</span>
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Serial:</span>{' '}
                    <span className="text-muted-foreground">{status.device.serialNumber}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                  <div>
                    <p className="font-semibold text-sm">Device Not Found</p>
                    <p className="text-xs text-muted-foreground">
                      {error || 'Could not connect to the Tobii service'}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 space-y-2">
                  <p className="text-xs font-medium text-foreground">Troubleshooting:</p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Make sure the Lexora Tobii Service app is running</li>
                    <li>Check that your Tobii tracker is plugged in via USB</li>
                    <li>Try restarting the service app</li>
                    <li>Ensure no other application is using the eye tracker</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('install')}
              >
                ← Start Over
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={checkStatus}
                disabled={checking}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? 'animate-spin' : ''}`} />
                Retry
              </Button>
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
        className={`w-3 h-3 rounded-full transition-colors ${
          complete
            ? 'bg-emerald-600'
            : active
              ? 'bg-primary'
              : 'bg-muted-foreground/30'
        }`}
      />
      <span className={`text-[10px] ${active || complete ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
