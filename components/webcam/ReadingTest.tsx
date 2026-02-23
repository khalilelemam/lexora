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
export function ReadingTest({
  onFinish,
}: {
  onFinish: (risk: "High Risk" | "Moderate Risk" | "Small Risk") => void;
}) {
  return (
    <CenterCard title="Reading Assessment">
      <p className="leading-relaxed text-lg mb-6">
        Dyslexia is a learning difficulty that affects reading, writing, and
        spelling. It is a neurological condition and is not related to
        intelligence...
      </p>

      <button className="btn-primary" onClick={() => onFinish("Moderate Risk")}>
        Finish Test
      </button>
    </CenterCard>
  );
}
