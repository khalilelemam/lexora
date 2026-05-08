import { LoadingScreen } from '@/components/shared';

export default function TestLoading() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <LoadingScreen message="Loading test..." />
    </div>
  );
}
