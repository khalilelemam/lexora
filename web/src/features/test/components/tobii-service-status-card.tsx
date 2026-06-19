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
    <div className="w-full border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[10px_10px_0_rgba(81,81,61,.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#1b2021]">Tobii Service Status</p>
          <p className="mt-1 text-xs leading-relaxed text-[#1b2021]/58">
            Lexora checks the local Tobii helper service on{' '}
            <code className="border border-[#51513d]/15 bg-[#e3dcc2] px-1 py-0.5 font-mono text-[10px]">
              localhost:28980
            </code>
          </p>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-[11px] font-black tracking-wider uppercase ${
            serviceChecking
              ? 'bg-[#51513d]/10 text-[#51513d]'
              : serviceRunning
                ? 'bg-[#a6a867] text-[#1b2021]'
                : 'bg-[#e3dc95] text-[#51513d]'
          }`}
        >
          {serviceChecking ? 'Checking…' : serviceRunning ? 'Running' : 'Not running'}
        </span>
      </div>

      {serviceRunning ? (
        <div className="mt-5 space-y-2 border border-[#a6a867]/30 bg-[#a6a867]/8 p-4 text-sm">
          <p className="font-black text-[#1b2021]">Connected to the Tobii helper app.</p>
          <p className="text-[#1b2021]/64">
            {serviceDevice?.deviceName ?? 'Tobii Pro device'} (
            {serviceDevice?.model ?? 'Unknown model'})
          </p>
          <p className="text-xs text-[#1b2021]/50">
            Serial: {serviceDevice?.serialNumber ?? 'N/A'}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4 border border-[#e3dc95]/60 bg-[#e3dc95]/15 p-4 text-sm">
          <div>
            <p className="font-black text-[#1b2021]">Tobii helper is not reachable.</p>
            <p className="mt-1 text-[#1b2021]/64">
              Install or start the Lexora Tobii Service app on your computer before running the Tobii
              test. Follow these steps:
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border border-[#e3dc95]/40 bg-[#f3edd7]/50 p-3">
              <div className="aspect-video w-full overflow-hidden rounded-md border border-[#51513d]/10 bg-[#e3dcc2] shadow-inner relative flex items-center justify-center">
                <span className="text-xs font-bold text-[#51513d]/40">Screenshot: System Tray</span>
                {/* <Image src="/images/guide/tobii-tray.png" alt="Open the app from the system tray" fill className="object-cover" /> */}
              </div>
              <p className="text-xs text-[#1b2021]/70">
                1. Click <strong>Open Service</strong> below, or find the Lexora icon in your Windows system tray.
              </p>
            </div>
            
            <div className="flex flex-col gap-2 rounded-lg border border-[#e3dc95]/40 bg-[#f3edd7]/50 p-3">
              <div className="aspect-video w-full overflow-hidden rounded-md border border-[#51513d]/10 bg-[#e3dcc2] shadow-inner relative flex items-center justify-center">
                <span className="text-xs font-bold text-[#51513d]/40">Screenshot: App Start Button</span>
                {/* <Image src="/images/guide/tobii-start.png" alt="Click start inside the Tobii helper app" fill className="object-cover" /> */}
              </div>
              <p className="text-xs text-[#1b2021]/70">
                2. Inside the desktop app, click the <strong>Start</strong> button to connect your Tobii tracker to the browser.
              </p>
            </div>
          </div>

          {serviceError && <p className="text-xs text-[#51513d]">{serviceError}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {!serviceRunning && (
          <a
            href="/api/download/service"
            className="bg-[#51513d] px-5 py-2.5 text-sm font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
          >
            Download Service
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            if (typeof window === 'undefined') return;
            if (serviceRunning) {
              const TOBII_SERVICE_URL =
                process.env.NEXT_PUBLIC_TOBII_SERVICE_URL ?? 'http://localhost:28980';
              window.open(TOBII_SERVICE_URL, '_blank');
            } else {
              window.location.href = 'lexora://open';
            }
          }}
          className={
            serviceRunning
              ? 'bg-[#51513d] px-5 py-2.5 text-sm font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]'
              : 'border border-[#51513d]/25 bg-[#e3dcc2] px-5 py-2.5 text-sm font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10'
          }
        >
          Open Service
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="border border-[#51513d]/25 bg-[#e3dcc2] px-5 py-2.5 text-sm font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}
