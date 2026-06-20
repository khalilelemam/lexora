'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, Eye, Monitor, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import {
  INCOMPATIBLE_DEVICES,
  LEGACY_DEVICES,
  SUPPORTED_DEVICES,
  type DeviceInfo,
} from '../lib/hardware';

interface SupportedHardwareProps {
  onContinue?: () => void;
}

const STATUS_STYLES: Record<DeviceInfo['status'], string> = {
  supported: 'bg-[#a6a867] text-[#1b2021]',
  legacy: 'bg-[#e3dc95] text-[#51513d]',
  incompatible: 'bg-[#9e5a5a] text-[#e3dcc2]',
};

const STATUS_ICON = {
  supported: CheckCircle2,
  legacy: Clock,
  incompatible: XCircle,
};

function StatusBadge({ status }: { status: DeviceInfo['status'] }) {
  const Icon = STATUS_ICON[status];
  const label =
    status === 'supported' ? 'Supported' : status === 'legacy' ? 'Legacy' : 'Not compatible';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] uppercase ${STATUS_STYLES[status]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function DeviceRow({ device, index }: { device: DeviceInfo; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 bg-[#e3dcc2] p-3"
    >
      <div className="flex h-10 w-10 items-center justify-center bg-[#f3edd7] text-[#51513d]">
        <Monitor className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-black text-[#1b2021]">{device.name}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {device.hz && <span className="text-[11px] text-[#1b2021]/56">{device.hz}</span>}
          {device.note && <span className="text-[11px] text-[#1b2021]/56">{device.note}</span>}
        </div>
      </div>
      <StatusBadge status={device.status} />
    </motion.div>
  );
}

function DeviceGroup({
  title,
  subtitle,
  icon,
  devices,
  offset = 0,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  devices: DeviceInfo[];
  offset?: number;
}) {
  return (
    <section className="w-full">
      <div className="mb-3 flex items-center gap-2 text-[#51513d]">
        {icon}
        <h2 className="text-sm font-black tracking-[0.14em] uppercase">{title}</h2>
        {subtitle && <span className="text-[11px] text-[#1b2021]/48">{subtitle}</span>}
      </div>
      <div className="grid gap-px overflow-hidden border border-[#51513d]/18 bg-[#51513d]/18">
        {devices.map((device, i) => (
          <DeviceRow key={device.name} device={device} index={i + offset} />
        ))}
      </div>
    </section>
  );
}

export function SupportedHardware({ onContinue }: SupportedHardwareProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8">
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-[#51513d] p-7 text-[#e3dcc2] shadow-[12px_12px_0_rgba(81,81,61,.12)] md:p-12"
      >
        <div className="absolute right-0 bottom-0 h-48 w-48 translate-x-12 translate-y-12 rounded-full bg-[#a6a867]/22" />

        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <LexoraLogo
              size="lg"
              className="mb-8 [&_img]:h-auto [&_img]:w-full [&_img]:max-w-[14rem] [&_img]:brightness-0 [&_img]:invert [&_span]:text-[#e3dcc2]"
            />
            <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#e3dc95] uppercase">
              Tobii hardware
            </p>
            <h1 className="text-4xl leading-tight font-black text-balance md:text-5xl">
              Confirm the tracker first.
            </h1>
            <p className="mt-5 leading-7 text-[#e3dcc2]/70">
              Lexora&apos;s Tobii flow is tuned for screen-based Tobii Pro devices. Consumer and
              wearable trackers are listed separately so the setup starts with the right
              expectation.
            </p>
          </div>
          <div className="hidden shrink-0 items-center justify-center rounded-full bg-[#a6a867] p-8 text-[#1b2021] md:flex">
            <Eye className="h-16 w-16" />
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
        <DeviceGroup
          title="Fully supported"
          subtitle="Current models"
          icon={<CheckCircle2 className="h-4 w-4" />}
          devices={SUPPORTED_DEVICES}
        />
        <DeviceGroup
          title="Legacy devices"
          subtitle="Discontinued, may still work"
          icon={<Clock className="h-4 w-4" />}
          devices={LEGACY_DEVICES}
          offset={SUPPORTED_DEVICES.length}
        />
        <DeviceGroup
          title="Not compatible"
          icon={<XCircle className="h-4 w-4" />}
          devices={INCOMPATIBLE_DEVICES}
          offset={SUPPORTED_DEVICES.length + LEGACY_DEVICES.length}
        />
      </div>

      {onContinue && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-4 flex flex-col items-center justify-center gap-3 border border-[#51513d]/18 bg-[#f3edd7] p-8 text-center"
        >
          <Button
            size="lg"
            onClick={onContinue}
            className="bg-[#51513d] px-8 py-6 text-lg text-[#e3dcc2] hover:bg-[#1b2021]"
          >
            I have a compatible device
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-2 text-sm leading-5 text-[#1b2021]/58">
            No Tobii device? Use the webcam-based screening path from the landing page.
          </p>
        </motion.div>
      )}
    </div>
  );
}
