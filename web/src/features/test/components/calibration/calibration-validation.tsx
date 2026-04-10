'use client';

interface CalibrationValidationProps {
  currentStep: number;
  totalSteps: number;
  holdProgress: number;
  target: { x: number; y: number } | null;
  gazeCursor: { x: number; y: number } | null;
}

export function CalibrationValidation({
  currentStep,
  totalSteps,
  holdProgress,
  target,
  gazeCursor,
}: CalibrationValidationProps) {
  return (
    <div className="z-50 fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_45%),hsl(var(--background))] cursor-none">
      {/* Top HUD */}
      <div className="top-8 left-1/2 absolute bg-card/85 backdrop-blur-md px-5 py-3.5 border rounded-xl w-[min(640px,90vw)] text-muted-foreground text-sm text-center -translate-x-1/2 shadow-sm">
        <div className="font-semibold text-foreground text-sm">
          Quick validation {currentStep} / {totalSteps}
        </div>
        <div className="mt-1 text-xs">Look at each target and hold until its ring fills.</div>
        <div className="mt-2.5">
          <div className="bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary rounded-full h-full transition-all duration-150"
              style={{ width: `${Math.round(holdProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Target */}
      {target && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}
        >
          <div
            className="relative rounded-full w-20 h-20"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${holdProgress * 360}deg, rgba(148,163,184,0.35) 0deg)`,
            }}
          >
            <div className="absolute inset-1.75 bg-primary/15 shadow-[0_0_36px_rgba(59,130,246,0.45)] border-2 border-primary/80 rounded-full" />
          </div>
        </div>
      )}

      {/* Gaze cursor */}
      {gazeCursor && (
        <div
          className="absolute bg-cyan-300/70 shadow-[0_0_12px_rgba(34,211,238,0.8)] border border-white/80 rounded-full w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: gazeCursor.x, top: gazeCursor.y }}
        />
      )}
    </div>
  );
}
