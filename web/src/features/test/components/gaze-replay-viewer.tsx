'use client';

import { useState } from 'react';
import { Eye, Play } from 'lucide-react';

import { FullscreenGazeReplay } from './fullscreen-gaze-replay';
import type { GazeFeature } from '../types';

interface GazeReplayViewerProps {
  /** The reading content that was displayed during the test */
  content: string;
  /** Per-fixation features from the ML service */
  features: GazeFeature[];
  /** Task type used by TaskDisplay layout */
  taskType?: string;
  /** Kept for backwards compatibility; TaskDisplay currently renders LTR. */
  direction?: 'ltr' | 'rtl';
}

export function GazeReplayViewer({
  content,
  features,
  taskType = 'paragraph',
}: GazeReplayViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canReplay = features.length > 0;

  return (
    <>
      <div className="flex w-full items-center justify-between gap-4 border border-[#51513d]/18 bg-[#f3edd7] px-4 py-3 text-[#1b2021]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#51513d] text-[#f3edd7]">
            <Eye className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black">Gaze replay</p>
            <p className="truncate text-xs text-[#51513d]/75">
              {canReplay
                ? `${features.length} model fixations mapped onto the original reading screen`
                : 'No fixation data available yet'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canReplay}
          onClick={() => setIsOpen(true)}
          className="flex h-9 shrink-0 items-center gap-2 bg-[#51513d] px-3 text-xs font-black text-[#f3edd7] transition-colors hover:bg-[#1b2021] disabled:cursor-not-allowed disabled:bg-[#51513d]/35"
        >
          <Play className="h-3.5 w-3.5" />
          Open
        </button>
      </div>

      {isOpen && (
        <FullscreenGazeReplay
          taskType={taskType}
          content={content}
          features={features}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
