'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Apple, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

const GITHUB_RELEASE_BASE = 'https://github.com/khalilelemam/eglex/releases/latest';

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
    icon: <Monitor className="h-5 w-5" />,
    assetKeyword: 'windows',
    extension: '.exe',
    available: true,
  },
  macos: {
    label: 'macOS',
    icon: <Apple className="h-5 w-5" />,
    assetKeyword: 'macos',
    extension: '.dmg',
    available: false,
  },
  linux: {
    label: 'Linux',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02 0 0 0 0v.015a.503.503 0 01-.213.418.81.81 0 01-.472.15h-.005a.57.57 0 01-.514-.34c-.018-.04-.028-.053-.037-.116a1.35 1.35 0 01-.027-.263v-.015c0-.263.047-.51.145-.72.05-.107.123-.199.221-.271a.51.51 0 01.244-.08h.006zm-2.156.071c.095.004.183.04.272.093.089.07.155.146.226.27.039.067.069.146.088.217.035.134.061.266.061.404v.02a.39.39 0 01-.14.311.467.467 0 01-.362.14h-.005c-.166.003-.298-.076-.382-.216a.74.74 0 01-.084-.263.737.737 0 01-.01-.218c.003-.086.01-.181.04-.27a.68.68 0 01.152-.332.458.458 0 01.312-.15l.052-.005h-.02zm2.372 1.938c.157 0 .273.075.352.177.153.2.189.512.13.832-.062.31-.199.612-.418.808a.56.56 0 01-.327.126.386.386 0 01-.332-.203c-.09-.166-.121-.398-.062-.64.058-.237.197-.466.368-.599.065-.058.143-.1.217-.1h.002l.07-.001zm-2.82.094c.087-.002.167.04.231.088.18.146.303.398.34.645.035.249-.015.501-.145.662a.33.33 0 01-.259.146.317.317 0 01-.247-.124c-.13-.167-.188-.418-.168-.665.02-.252.098-.488.234-.639a.274.274 0 01.205-.114l.009.001z" />
      </svg>
    ),
    assetKeyword: 'linux',
    extension: '.AppImage',
    available: false,
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
          {platformKeys.map((key) => {
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
                  <a href={GITHUB_RELEASE_BASE} target="_blank" rel="noopener noreferrer">
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
          <a
            href={GITHUB_RELEASE_BASE}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground inline-flex items-center gap-1 transition-colors"
          >
            View all releases on GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </section>
  );
}
