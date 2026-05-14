'use client';

interface TobiiServiceStatusCardProps {
  serviceChecking: boolean;
  serviceRunning: boolean;
  serviceDevice: {
    deviceName: string;
    model: string;
    serialNumber: string;
  } | null;
  serviceError: string | null;
  onRefresh: () => void;
}

export function TobiiServiceStatusCard({
  serviceChecking,
  serviceRunning,
  serviceDevice,
  serviceError,
  onRefresh,
}: TobiiServiceStatusCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="border-border bg-background rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Tobii Service Status</p>
            <p className="text-muted-foreground text-xs">
              Lexora checks the local Tobii helper service on <code>localhost:28980</code>.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
              serviceChecking
                ? 'bg-slate-200 text-slate-700'
                : serviceRunning
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
            }`}
          >
            {serviceChecking ? 'Checking…' : serviceRunning ? 'Running' : 'Not running'}
          </span>
        </div>

        {serviceRunning ? (
          <div className="mt-4 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm">
            <p className="text-foreground font-medium">Connected to the Tobii helper app.</p>
            <p className="text-muted-foreground">
              {serviceDevice?.deviceName ?? 'Tobii Pro device'} (
              {serviceDevice?.model ?? 'Unknown model'})
            </p>
            <p className="text-muted-foreground text-xs">
              Serial: {serviceDevice?.serialNumber ?? 'N/A'}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="text-foreground font-medium">Tobii helper is not reachable.</p>
            <p className="text-muted-foreground">
              Install or start the Lexora Tobii Service app on your computer before running the
              Tobii test.
            </p>
            {serviceError && <p className="text-xs text-amber-700">{serviceError}</p>}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {serviceRunning ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = 'lexora://open';
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md px-5 py-2 text-sm font-medium"
            >
              Open Tobii Service
            </button>
          ) : (
            <a
              href="/api/download/service"
              className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-medium"
            >
              Download Tobii Service
            </a>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="border-border bg-background text-foreground hover:bg-muted/70 inline-flex items-center justify-center rounded-md border px-5 py-2 text-sm font-medium"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}
