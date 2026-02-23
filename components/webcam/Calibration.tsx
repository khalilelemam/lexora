import type { ReactNode } from "react";

function CenterCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-xl w-full">
        <h2 className="text-xl font-semibold mb-6 text-center">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Calibration({ onComplete }: { onComplete: () => void }) {
  return (
    <CenterCard title="Calibration">
      <p className="mb-4">
        Please look at the dots as they appear on the screen.
      </p>

      {/* PLACEHOLDER FOR CALIBRATION DOTS */}
      <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-6" />

      <button className="btn-primary" onClick={onComplete}>
        Start Reading Test
      </button>
    </CenterCard>
  );
}
