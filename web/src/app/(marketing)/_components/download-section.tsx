'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { FaWindows, FaApple, FaLinux } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    icon: <FaWindows className="h-5 w-5" />,
    assetKeyword: 'windows',
    extension: '.exe',
    available: true,
  },
  macos: {
    label: 'macOS',
    icon: <FaApple className="h-5 w-5" />,
    assetKeyword: 'macos',
    extension: '.pkg',
    available: true,
  },
  linux: {
    label: 'Linux',
    icon: <FaLinux className="h-5 w-5" />,
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

/**
 * OS-specific download buttons section.
 * Auto-detects the user's OS and highlights the matching button.
 * Links to GitHub Releases latest assets.
 */
export function DownloadSection() {
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    // @ts-expect-error - necessary to avoid hydration mismatch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPlatform(detectPlatform());
  }, []);

  const platformKeys = Object.keys(PLATFORMS) as Array<Exclude<Platform, 'unknown'>>;

  return (
    <section id="download" className="px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Download className="text-muted-foreground/60 mx-auto mb-4 h-8 w-8" />
          <h2 className="mb-3 text-3xl font-bold">Download Tobii Service</h2>
          <p className="text-muted-foreground mx-auto mb-10 max-w-lg">
            To use Lexora with a Tobii eye tracker, download the desktop service for your operating
            system. The service runs locally and streams gaze data to the web app.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-3">
          {currentPlatform === 'unknown'
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border-border/60 bg-muted/50 flex h-[124px] w-full animate-pulse flex-col items-center justify-center gap-2 rounded-md border py-5"
                />
              ))
            : platformKeys.map((key) => {
                const info = PLATFORMS[key];
                const isCurrent = key === currentPlatform;

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: platformKeys.indexOf(key) * 0.1 }}
                  >
                    {info.available ? (
                      <a href={`${DOWNLOAD_BASE}?platform=${key}`}>
                        <Button
                          variant={isCurrent ? 'default' : 'outline'}
                          className={cn(
                            'flex h-auto w-full flex-col items-center gap-2 py-5 transition-all',
                            isCurrent &&
                              'bg-[oklch(0.40_0.04_110)] text-[oklch(0.94_0.02_90)] shadow-md ring-2 ring-[oklch(0.70_0.10_115/0.3)] hover:bg-[oklch(0.35_0.04_110)]',
                            !isCurrent && 'border-border/60 hover:bg-muted/50',
                          )}
                        >
                          {info.icon}
                          <span className="text-sm font-semibold">{info.label}</span>
                          <span className="text-[10px] opacity-60">{info.extension}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-medium tracking-wider uppercase opacity-80">
                              Recommended
                            </span>
                          )}
                        </Button>
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        disabled
                        className="flex h-auto w-full cursor-not-allowed flex-col items-center gap-2 py-5 opacity-50"
                      >
                        {info.icon}
                        <span className="text-sm font-semibold">{info.label}</span>
                        <span className="text-[10px] opacity-60">Coming soon</span>
                      </Button>
                    )}
                  </motion.div>
                );
              })}
        </div>

        <p className="text-muted-foreground/50 mt-6 text-xs">
          The service runs locally on your machine and streams gaze data to the web app.
        </p>
      </div>
    </section>
  );
}
