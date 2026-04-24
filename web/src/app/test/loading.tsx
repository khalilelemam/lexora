import { LoadingScreen } from '@/components/shared';

export default function TestLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingScreen message="Loading test..." />
    </div>
  );
}
