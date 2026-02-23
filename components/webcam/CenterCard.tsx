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
