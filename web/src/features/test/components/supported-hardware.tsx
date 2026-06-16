'use client';

import { motion } from 'framer-motion';
import { Monitor, CheckCircle2, XCircle, Clock, ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  INCOMPATIBLE_DEVICES,
  LEGACY_DEVICES,
  SUPPORTED_DEVICES,
  type DeviceInfo,
} from '../lib/hardware';

interface SupportedHardwareProps {
  onContinue: () => void;
}

function StatusBadge({ status }: { status: DeviceInfo['status'] }) {
  if (status === 'supported') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Supported
      </span>
    );
  }
  if (status === 'legacy') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
        <Clock className="h-3 w-3" /> Legacy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
      <XCircle className="h-3 w-3" /> Not Compatible
    </span>
  );
}

function DeviceRow({ device, index }: { device: DeviceInfo; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-border bg-background hover:bg-muted/40 flex items-center justify-between rounded-xl border px-4 py-3 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Monitor className="text-muted-foreground h-4 w-4" />
        <div>
          <p className="text-sm font-medium">{device.name}</p>
          <div className="flex items-center gap-2">
            {device.hz && <span className="text-muted-foreground text-[11px]">{device.hz}</span>}
            {device.note && (
              <span className="text-muted-foreground text-[11px] italic">{device.note}</span>
            )}
          </div>
        </div>
      </div>
      <StatusBadge status={device.status} />
    </motion.div>
  );
}

/**
 * Full-page supported hardware listing.
 * Shown immediately after clicking the Tobii test button,
 * before proceeding to device setup / calibration.
 */
export function SupportedHardware({ onContinue }: SupportedHardwareProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-8 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 text-center"
      >
        <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-2xl">
          <Eye className="text-primary h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Compatible Eye Trackers</h1>
        <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
          Lexora works with Tobii Pro screen-based eye trackers. Check that your device is on the
          supported list before proceeding.
        </p>
      </motion.div>

      {/* Supported (current) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold">Fully Supported</h2>
          <span className="text-muted-foreground text-[11px]">(Current models)</span>
        </div>
        <div className="space-y-2">
          {SUPPORTED_DEVICES.map((device, i) => (
            <DeviceRow key={device.name} device={device} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Legacy */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full"
      >
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold">Legacy Devices</h2>
          <span className="text-muted-foreground text-[11px]">(Discontinued — may still work)</span>
        </div>
        <div className="space-y-2">
          {LEGACY_DEVICES.map((device, i) => (
            <DeviceRow key={device.name} device={device} index={i + SUPPORTED_DEVICES.length} />
          ))}
        </div>
      </motion.div>

      {/* Incompatible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full"
      >
        <div className="mb-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold">Not Compatible</h2>
        </div>
        <div className="space-y-2">
          {INCOMPATIBLE_DEVICES.map((device, i) => (
            <DeviceRow
              key={device.name}
              device={device}
              index={i + SUPPORTED_DEVICES.length + LEGACY_DEVICES.length}
            />
          ))}
        </div>
      </motion.div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex w-full flex-col items-center gap-3 pt-2"
      >
        <Button size="lg" onClick={onContinue} className="gap-2 px-8">
          I have a compatible device — Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-muted-foreground text-[11px]">
          You can also use the webcam-based test if you don&apos;t have a Tobii device.
        </p>
      </motion.div>
    </div>
  );
}
