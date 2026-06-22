import { redirect } from 'next/navigation';

import { AttemptsAuthError, requireAttemptsUser } from '@/features/attempts/server/auth';
import { HistoryPage } from '@/features/attempts/components/history-page';

export default async function Page() {
  try {
    await requireAttemptsUser();
  } catch (error) {
    if (error instanceof AttemptsAuthError) {
      redirect('/sign-in?callbackUrl=/history');
    }

    throw error;
  }

  return <HistoryPage />;
}
