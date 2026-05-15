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
  const openTobiiService = () => {
    if (typeof window === 'undefined') return;
    const TOBII_SERVICE_URL = process.env.NEXT_PUBLIC_TOBII_SERVICE_URL ?? 'http://localhost:28980';
    const url = serviceRunning ? TOBII_SERVICE_URL : '/api/download/service';
    window.open(url, '_blank');
  };

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
            {serviceDevice?.deviceName ?? 'Tobii Pro device'} ({serviceDevice?.model ?? 'Unknown model'})
          </p>
          <p className="text-xs text-[#1b2021]/50">Serial: {serviceDevice?.serialNumber ?? 'N/A'}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-2 border border-[#e3dc95]/60 bg-[#e3dc95]/15 p-4 text-sm">
          <p className="font-black text-[#1b2021]">Tobii helper is not reachable.</p>
          <p className="text-[#1b2021]/64">
            Install or start the Lexora Tobii Service app on your computer before running the Tobii
            test.
          </p>
          {serviceError && <p className="text-xs text-[#51513d]">{serviceError}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={openTobiiService}
          className="bg-[#51513d] px-5 py-2.5 text-sm font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
        >
          {serviceRunning ? 'Open Tobii Service' : 'Download Tobii Service'}
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
