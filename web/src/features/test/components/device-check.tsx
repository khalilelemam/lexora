'use client';

import { useEffect } from 'react';
import { Monitor, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTobiiStatus } from '../hooks';

interface DeviceCheckProps {
  onReady: () => void;
}

export function DeviceCheck({ onReady }: DeviceCheckProps) {
  const { status, checking, error, checkStatus } = useTobiiStatus();

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const isConnected = status?.connected === true;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Monitor className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-semibold">Eye Tracker Setup</h2>
        <p className="mt-1 text-muted-foreground">
          Make sure the Tobii helper app is running and your eye tracker is connected.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {checking ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking connection...
              </>
            ) : isConnected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Device Connected
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                Device Not Found
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isConnected && status?.device ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Device:</span>{' '}
                {status.device.deviceName}
              </p>
              <p>
                <span className="font-medium text-foreground">Model:</span> {status.device.model}
              </p>
              <p>
                <span className="font-medium text-foreground">Serial:</span>{' '}
                {status.device.serialNumber}
              </p>
            </div>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Troubleshooting:</p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  <li>Make sure the Lexora Tobii Helper app is running</li>
                  <li>Check that your Tobii eye tracker is plugged in via USB</li>
                  <li>Try restarting the Tobii Helper app</li>
                </ul>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={checkStatus} disabled={checking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          Retry
        </Button>
        {isConnected && (
          <Button onClick={onReady}>Continue to Calibration</Button>
        )}
      </div>
    </div>
  );
}
