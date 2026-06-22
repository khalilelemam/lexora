import { notFound, redirect } from 'next/navigation';

import {
  AttemptsAuthError,
  AttemptsForbiddenError,
  requireAdminAttemptsUser,
} from '@/features/attempts/server/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdminAttemptsUser();
  } catch (error) {
    if (error instanceof AttemptsAuthError) {
      redirect('/sign-in?callbackUrl=/admin/dashboard');
    }

    if (error instanceof AttemptsForbiddenError) {
      notFound();
    }

    throw error;
  }

  return children;
}
