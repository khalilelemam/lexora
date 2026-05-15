'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, Eye, Monitor, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

interface SupportedHardwareProps {
  onContinue: () => void;
}

interface DeviceInfo {
  name: string;
  type: 'screen-based' | 'portable';
  status: 'supported' | 'legacy' | 'incompatible';
  hz?: string;
  note?: string;
}

const parseEnvList = (envValue: string | undefined, fallback: DeviceInfo[]): DeviceInfo[] => {
  if (!envValue) return fallback;
  try {
    return JSON.parse(envValue);
  } catch (e) {
    console.error('Failed to parse device list from env', e);
    return fallback;
  }
};

const SUPPORTED_DEVICES_FALLBACK: DeviceInfo[] = [
  { name: 'Tobii Pro Spectrum', type: 'screen-based', status: 'supported', hz: 'Up to 1200 Hz' },
  { name: 'Tobii Pro Fusion', type: 'screen-based', status: 'supported', hz: 'Up to 250 Hz' },
  { name: 'Tobii Pro Spark', type: 'screen-based', status: 'supported', hz: '60 Hz' },
  { name: 'Tobii Pro Nano', type: 'screen-based', status: 'supported', hz: '60 Hz' },
];

const LEGACY_DEVICES_FALLBACK: DeviceInfo[] = [
  { name: 'Tobii Pro X3-120', type: 'screen-based', status: 'legacy', hz: '120 Hz' },
  { name: 'Tobii Pro X2-60', type: 'screen-based', status: 'legacy', hz: '60 Hz' },
  { name: 'Tobii Pro X2-30', type: 'screen-based', status: 'legacy', hz: '30 Hz' },
  {
    name: 'Tobii Pro TX300',
    type: 'screen-based',
    status: 'legacy',
    hz: '300 Hz',
    note: 'Firmware >= 1.0.0',
  },
  { name: 'Tobii Pro T60 XL', type: 'screen-based', status: 'legacy', note: 'Firmware >= 2.0.0' },
  { name: 'Tobii T60 / T120', type: 'screen-based', status: 'legacy', note: 'Firmware >= 2.0.0' },
  { name: 'Tobii X60 / X120', type: 'screen-based', status: 'legacy', note: 'Firmware >= 2.0.0' },
];

const INCOMPATIBLE_DEVICES_FALLBACK: DeviceInfo[] = [
  {
    name: 'Tobii Eye Tracker 5',
    type: 'screen-based',
    status: 'incompatible',
    note: 'Consumer / gaming device',
  },
  {
    name: 'Tobii Eye Tracker 5L',
    type: 'screen-based',
    status: 'incompatible',
    note: 'Consumer / gaming device',
  },
  {
    name: 'Tobii Eye Tracker 4C',
    type: 'screen-based',
    status: 'incompatible',
    note: 'Consumer / gaming device',
  },
  {
    name: 'Tobii Pro Glasses 2',
    type: 'portable',
    status: 'incompatible',
    note: 'Wearable, not supported',
  },
  {
    name: 'Tobii Pro Glasses 3',
    type: 'portable',
    status: 'incompatible',
    note: 'Wearable, not supported',
  },
  { name: 'VR Headsets (all)', type: 'portable', status: 'incompatible', note: 'Not supported' },
];

const SUPPORTED_DEVICES = parseEnvList(
  process.env.NEXT_PUBLIC_SUPPORTED_DEVICES,
  SUPPORTED_DEVICES_FALLBACK,
);
const LEGACY_DEVICES = parseEnvList(
  process.env.NEXT_PUBLIC_LEGACY_DEVICES,
  LEGACY_DEVICES_FALLBACK,
);
const INCOMPATIBLE_DEVICES = parseEnvList(
  process.env.NEXT_PUBLIC_INCOMPATIBLE_DEVICES,
  INCOMPATIBLE_DEVICES_FALLBACK,
);

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
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[0.8fr_1.2fr]">
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-[#51513d] p-7 text-[#e3dcc2] shadow-[12px_12px_0_rgba(81,81,61,.12)]"
      >
        <div className="absolute right-0 bottom-0 h-32 w-32 translate-x-10 translate-y-10 rounded-full bg-[#a6a867]/22" />
        <LexoraLogo
          size="md"
          className="mb-16 [&_img]:brightness-0 [&_img]:invert [&_span]:text-[#e3dcc2]"
        />
        <p className="mb-4 text-xs font-black tracking-[0.3em] text-[#e3dc95] uppercase">
          Tobii hardware
        </p>
        <h1 className="text-4xl leading-tight font-black text-balance">
          Confirm the tracker first.
        </h1>
        <p className="mt-5 leading-7 text-[#e3dcc2]/70">
          Lexora&apos;s Tobii flow is tuned for screen-based Tobii Pro devices. Consumer and
          wearable trackers are listed separately so the setup starts with the right expectation.
        </p>
        <div className="mt-8 flex h-16 w-16 items-center justify-center bg-[#a6a867] text-[#1b2021]">
          <Eye className="h-8 w-8" />
        </div>
      </motion.section>

      <div className="flex flex-col gap-7">
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col items-start gap-3 border border-[#51513d]/18 bg-[#f3edd7] p-5"
        >
          <Button
            size="lg"
            onClick={onContinue}
            className="bg-[#51513d] px-8 text-[#e3dcc2] hover:bg-[#1b2021]"
          >
            I have a compatible device
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs leading-5 text-[#1b2021]/58">
            No Tobii device? Use the webcam-based screening path from the landing page.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
