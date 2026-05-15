import { LoadingScreen } from '@/components/shared';

export default function TestLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e3dcc2] text-[#1b2021]">
      <LoadingScreen message="Loading test..." />
    </div>
  );
}
