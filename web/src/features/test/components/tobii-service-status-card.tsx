'use client';

import Link from 'next/link';
import { CheckCircle2, ExternalLink, MonitorCheck, Power, RefreshCw } from 'lucide-react';

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
  const openDesktopService = () => {
    if (typeof window === 'undefined') return;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'lexora://open';
    document.body.appendChild(iframe);
    setTimeout(() => iframe.remove(), 2000);
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
        <div className="mt-5 space-y-3 border border-[#a6a867]/30 bg-[#a6a867]/8 p-4 text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#51513d]" />
            <div>
              <p className="font-black text-[#1b2021]">Tobii helper app is reachable.</p>
              <p className="mt-1 text-xs text-[#1b2021]/58">
                {serviceDevice
                  ? 'Supported tracker detected. Lexora will continue automatically.'
                  : 'Service is running locally. Connect a supported tracker to continue.'}
              </p>
            </div>
          </div>
          {serviceDevice && (
            <div>
              <p className="text-[#1b2021]/64">
                {serviceDevice.deviceName} ({serviceDevice.model})
              </p>
              <p className="text-xs text-[#1b2021]/50">Serial: {serviceDevice.serialNumber}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-2 border border-[#e3dc95]/60 bg-[#e3dc95]/15 p-4 text-sm">
          <p className="font-black text-[#1b2021]">Tobii helper is not reachable.</p>
          <p className="text-[#1b2021]/64">
            The service must be running in the background to connect to your eye tracker.
          </p>
          {serviceError && (
            <p className="mt-2 text-xs text-[#51513d]">
              <span className="font-bold">Error:</span> {serviceError}
            </p>
          )}
        </div>
      )}

      <Link
        href="/test/supported-hardware"
        target="_blank"
        className="mt-4 flex items-start gap-3 border border-[#51513d]/18 bg-[#e3dcc2]/70 p-3 text-[#1b2021] transition-all hover:-translate-y-0.5 hover:border-[#51513d]/35 hover:bg-[#e3dcc2]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#51513d]/10 text-[#51513d]">
          <MonitorCheck className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black">Check supported hardware</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-[#1b2021]/58">
            Confirm compatible Tobii Pro devices and known unsupported consumer trackers.
          </span>
        </span>
        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[#51513d]" />
      </Link>

      <div className="mt-5 flex flex-col gap-4">
        {!serviceRunning && (
          <div className="space-y-3">
            <p className="text-xs font-black tracking-wider text-[#51513d] uppercase">
              Download for your platform
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <a
                href="/api/download/service?platform=windows"
                className="group flex items-center gap-3 border border-[#51513d]/18 bg-[#e3dcc2] p-3 transition-all hover:-translate-y-0.5 hover:border-[#51513d]/40 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#51513d] text-lg text-[#e3dcc2]">
                  ⊞
                </div>
                <div>
                  <p className="text-sm font-black text-[#1b2021]">Windows</p>
                  <p className="text-[10px] text-[#1b2021]/50">.exe installer</p>
                </div>
              </a>
              <a
                href="/api/download/service?platform=macos"
                className="group flex items-center gap-3 border border-[#51513d]/18 bg-[#e3dcc2] p-3 transition-all hover:-translate-y-0.5 hover:border-[#51513d]/40 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#51513d] text-lg text-[#e3dcc2]">
                  ⌘
                </div>
                <div>
                  <p className="text-sm font-black text-[#1b2021]">macOS</p>
                  <p className="text-[10px] text-[#1b2021]/50">.pkg installer</p>
                </div>
              </a>
              <a
                href="/api/download/service?platform=linux"
                className="group flex items-center gap-3 border border-[#51513d]/18 bg-[#e3dcc2] p-3 transition-all hover:-translate-y-0.5 hover:border-[#51513d]/40 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#51513d] text-lg text-[#e3dcc2]">
                  ◆
                </div>
                <div>
                  <p className="text-sm font-black text-[#1b2021]">Linux</p>
                  <p className="text-[10px] text-[#1b2021]/50">.deb package</p>
                </div>
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!serviceRunning && (
            <button
              type="button"
              onClick={openDesktopService}
              className="inline-flex items-center gap-2 border border-[#51513d]/25 bg-[#e3dcc2] px-5 py-2.5 text-sm font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
            >
              <Power className="h-4 w-4" />
              Open Service
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex cursor-pointer items-center gap-2 border border-[#51513d]/25 bg-[#e3dcc2] px-5 py-2.5 text-sm font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
          >
            <RefreshCw className={`h-4 w-4 ${serviceChecking ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          {!serviceRunning && (
            <div className="flex w-full items-center text-xs text-[#1b2021]/60">
              * After starting the app, click Refresh Status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
