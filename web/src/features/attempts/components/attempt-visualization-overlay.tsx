'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FullscreenGazeReplay } from '@/features/test/components/fullscreen-gaze-replay';
import type { AttemptVisualization } from '@/features/attempts/types';
import type { TaskType } from '@/features/test/types';

interface AttemptVisualizationOverlayProps {
  visualizations: AttemptVisualization[];
  onClose: () => void;
}

export function AttemptVisualizationOverlay({
  visualizations,
  onClose,
}: AttemptVisualizationOverlayProps) {
  const [activeTaskType, setActiveTaskType] = useState<TaskType>(visualizations[0].taskType);
  const activeVisualization = useMemo(
    () =>
      visualizations.find((visualization) => visualization.taskType === activeTaskType) ??
      visualizations[0],
    [activeTaskType, visualizations],
  );

  return (
    <FullscreenGazeReplay
      key={`${activeVisualization.taskType}-${activeVisualization.features.length}`}
      taskType={activeVisualization.taskType}
      content={activeVisualization.content}
      features={activeVisualization.features}
      onClose={onClose}
      toolbarSlot={
        visualizations.length > 1 ? (
          <div className="flex max-w-[42vw] flex-wrap items-center justify-center gap-1.5">
            {visualizations.map((visualization) => {
              const isActive = visualization.taskType === activeVisualization.taskType;

              return (
                <Button
                  key={visualization.taskType}
                  type="button"
                  size="xs"
                  variant={isActive ? 'default' : 'outline'}
                  className={
                    isActive
                      ? 'bg-[#4A7C59] text-white hover:bg-[#3D6A4B]'
                      : 'border-[#D4CBBD] bg-white/80 text-[#6B6560] hover:bg-[#F5F0E8]'
                  }
                  onClick={() => setActiveTaskType(visualization.taskType)}
                >
                  {visualization.label}
                </Button>
              );
            })}
          </div>
        ) : null
      }
    />
  );
}
