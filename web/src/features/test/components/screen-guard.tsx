'use client';

import { useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';

const MIN_WIDTH = 1024;
const MIN_HEIGHT = 600;

interface ScreenGuardProps {
  children: React.ReactNode;
}

export function ScreenGuard({ children }: ScreenGuardProps) {
  const [screenInfo] = useState(() => {
    if (typeof window === 'undefined') return null;

    const w = window.screen.width;
    const h = window.screen.height;

    return {
      width: w,
      height: h,
      tooSmall: w < MIN_WIDTH || h < MIN_HEIGHT,
    };
  });

  if (!screenInfo) return null;

  if (screenInfo.tooSmall) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e3dcc2] p-8 text-[#1b2021]">
        <div className="grid w-full max-w-4xl overflow-hidden border border-[#51513d]/18 bg-[#f3edd7] shadow-[0_24px_70px_rgba(27,32,33,0.16)] md:grid-cols-[0.86fr_1.14fr]">
          <div className="flex min-h-72 flex-col justify-between bg-[#51513d] p-8 text-[#e3dcc2]">
            <LexoraLogo size="sm" color="text-[#e3dcc2]" />
            <div>
              <div className="mb-5 flex h-16 w-16 items-center justify-center border border-[#e3dcc2]/25 bg-[#1b2021]/25">
                <MonitorSmartphone className="h-8 w-8 text-[#e3dc95]" />
              </div>
              <p className="text-[10px] font-semibold tracking-[0.32em] text-[#e3dc95] uppercase">
                Display Check
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Screen Too Small</h2>
            </div>
          </div>
          <div className="flex flex-col justify-center p-8">
            <p className="max-w-xl text-base leading-7 text-[#1b2021]/70">
              Eye-tracking tests require at least {MIN_WIDTH}x{MIN_HEIGHT} pixels for accurate
              results. Please use a laptop or desktop monitor before starting the reading session.
            </p>
            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
              <div className="border border-[#51513d]/18 bg-[#e3dcc2]/45 p-4">
                <p className="text-[10px] font-semibold tracking-[0.24em] text-[#51513d]/60 uppercase">
                  Required
                </p>
                <p className="mt-2 font-mono text-lg font-bold text-[#51513d]">
                  {MIN_WIDTH}x{MIN_HEIGHT}
                </p>
              </div>
              <div className="border border-[#51513d]/18 bg-[#e3dcc2]/45 p-4">
                <p className="text-[10px] font-semibold tracking-[0.24em] text-[#51513d]/60 uppercase">
                  Current
                </p>
                <p className="mt-2 font-mono text-lg font-bold text-[#51513d]">
                  {screenInfo.width}x{screenInfo.height}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
