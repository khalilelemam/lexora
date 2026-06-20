'use client';

import { useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Shield, Zap } from 'lucide-react';
import { FaWindows, FaApple, FaLinux } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { LexoraLogo } from '@/components/shared/lexora-logo';

type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

const DOWNLOAD_BASE = '/api/download/service';

interface PlatformInfo {
  label: string;
  icon: React.ReactNode;
  assetKeyword: string;
  extension: string;
  available: boolean;
}

const PLATFORMS: Record<Exclude<Platform, 'unknown'>, PlatformInfo> = {
  windows: {
    label: 'Windows',
    icon: <FaWindows className="h-6 w-6" />,
    assetKeyword: 'windows',
    extension: '.exe',
    available: true,
  },
  macos: {
    label: 'macOS',
    icon: <FaApple className="h-6 w-6" />,
    assetKeyword: 'macos',
    extension: '.pkg',
    available: true,
  },
  linux: {
    label: 'Linux',
    icon: <FaLinux className="h-6 w-6" />,
    assetKeyword: 'linux',
    extension: '.deb',
    available: true,
  },
};

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

const noop = () => () => {};

export function DownloadPageUI() {
  const currentPlatform = useSyncExternalStore(noop, detectPlatform, () => 'unknown' as Platform);
  const platformKeys = Object.keys(PLATFORMS) as Array<Exclude<Platform, 'unknown'>>;

  const recommendedPlatform = currentPlatform === 'unknown' ? 'windows' : currentPlatform;
  const recommendedInfo = PLATFORMS[recommendedPlatform];

  const otherPlatforms = platformKeys.filter((k) => k !== recommendedPlatform);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#51513d] py-24 text-[#e3dcc2] md:py-32">
        <div className="absolute top-0 right-0 h-96 w-96 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#a6a867]/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/4 translate-y-1/4 rounded-full bg-[#e3dc95]/10 blur-2xl" />

        <div className="relative z-10 container mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <LexoraLogo
              size="lg"
              showText={false}
              className="mb-8 [&_img]:h-20 [&_img]:w-auto [&_img]:brightness-0 [&_img]:invert"
            />
            <h1 className="mb-6 text-5xl font-black tracking-tight md:text-7xl">
              Lexora Tobii Service
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-[#e3dcc2]/80 md:text-xl">
              Unlock the full potential of your Tobii eye tracker. The local service streams raw
              gaze data with ultra-low latency directly to your browser.
            </p>

            <div className="flex w-full max-w-sm flex-col items-center gap-4">
              <Button
                size="lg"
                className="group flex h-16 w-full items-center gap-3 bg-[#a6a867] text-lg font-bold text-[#1b2021] shadow-[0_0_40px_-10px_rgba(166,168,103,0.5)] transition-all hover:scale-[1.02] hover:bg-[#c4c680]"
                onClick={() => {
                  if (recommendedInfo.available) {
                    window.location.href = `${DOWNLOAD_BASE}?platform=${recommendedPlatform}`;
                  }
                }}
                disabled={!recommendedInfo.available}
              >
                <Download className="h-6 w-6 transition-transform group-hover:-translate-y-1" />
                {recommendedInfo.available
                  ? `Download for ${recommendedInfo.label}`
                  : `${recommendedInfo.label} (Coming Soon)`}
              </Button>
              <p className="text-sm font-medium text-[#e3dc95]">
                Version 1.0.0 &bull; {recommendedInfo.extension}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Other Platforms */}
      <section className="bg-[#f3edd7] py-16 text-[#1b2021]">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="mb-8 text-center">
            <h3 className="text-xl font-bold">Also available for</h3>
          </div>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            {otherPlatforms.map((key, i) => {
              const info = PLATFORMS[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  {info.available ? (
                    <a href={`${DOWNLOAD_BASE}?platform=${key}`} className="block">
                      <div className="flex items-center justify-between rounded-xl border border-[#51513d]/15 bg-white p-5 shadow-sm transition-all hover:border-[#a6a867] hover:shadow-md">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3edd7] text-[#51513d]">
                            {info.icon}
                          </div>
                          <div className="text-left">
                            <p className="font-bold">{info.label}</p>
                            <p className="text-xs text-[#1b2021]/60">Download {info.extension}</p>
                          </div>
                        </div>
                        <Download className="h-5 w-5 text-[#51513d]/40" />
                      </div>
                    </a>
                  ) : (
                    <div className="flex cursor-not-allowed items-center justify-between rounded-xl border border-[#51513d]/10 bg-white/50 p-5 opacity-60 grayscale">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3edd7]">
                          {info.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-bold">{info.label}</p>
                          <p className="text-xs">Coming soon</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-24 text-[#1b2021]">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-black md:text-4xl">Why do I need this?</h2>
            <p className="mt-4 text-lg text-[#1b2021]/60">
              Modern browsers restrict direct hardware access for security. Our local service
              bridges the gap safely.
            </p>
          </div>

          <div className="grid gap-12 md:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Ultra-Low Latency"
              description="Streams 60Hz to 1200Hz gaze data via WebSockets directly to the web application without delays."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Privacy First"
              description="No data leaves your computer. The service acts purely as a local router between your tracker and your browser."
            />
            <FeatureCard
              icon={<Monitor className="h-8 w-8" />}
              title="Native Drivers"
              description="Utilizes the official Tobii Pro SDK natively on your OS, ensuring maximum compatibility and accuracy."
            />
          </div>
        </div>
      </section>

      {/* Setup Guide */}
      <section className="bg-[#51513d] py-24 text-[#e3dcc2]">
        <div className="container mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-3xl font-black md:text-4xl">Quick Setup</h2>
          <div className="space-y-8">
            <Step number={1} title="Download and Install">
              Run the downloaded installer and follow the standard installation prompts for your
              operating system.
            </Step>
            <Step number={2} title="Run the Service">
              Launch &quot;Lexora Tobii Service&quot; from your applications menu. It will run
              silently in your system tray or menu bar.
            </Step>
            <Step number={3} title="Connect your Tracker">
              Plug in your Tobii Pro eye tracker via USB. Lexora will automatically detect the
              stream when you start a test.
            </Step>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f3edd7] text-[#a6a867]">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-bold">{title}</h3>
      <p className="leading-relaxed text-[#1b2021]/70">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-6 md:gap-8">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#a6a867] bg-[#51513d] text-xl font-black text-[#a6a867]">
        {number}
      </div>
      <div className="pt-2">
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        <p className="leading-relaxed text-[#e3dcc2]/70">{children}</p>
      </div>
    </div>
  );
}
