import type { ReactNode } from "react";

export function CenterCard({
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

function Registration({ onNext }: { onNext: () => void }) {
  return (
    <CenterCard title="Student Registration">
      <input className="input" placeholder="First Name" />
      <input className="input" placeholder="Last Name" />
      <input className="input" placeholder="Email" />
      <button className="btn-primary mt-6" onClick={onNext}>
        Continue
      </button>
    </CenterCard>
  );
}
