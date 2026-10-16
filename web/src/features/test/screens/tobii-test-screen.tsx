'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/shared';

export default function TobiiTestScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/test/webcam');
  }, [router]);

  return <LoadingScreen message="جاري الانتقال إلى اختبار كاميرا الويب..." />;
}
