'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, LogOut, User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';

/**
 * Auth-aware navigation control.
 *
 * - **Guest**: renders a "Sign In" button.
 * - **Authenticated**: renders an avatar that opens a dropdown
 *   with user info and actions (sign out, etc.).
 */
export function UserNav() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  }, [router]);

  /* ── Loading skeleton ─────────────────────────────────── */
  if (isPending) {
    return <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />;
  }

  /* ── Guest ────────────────────────────────────────────── */
  if (!session?.user) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-[oklch(0.70_0.10_115/0.4)] text-[oklch(0.40_0.04_110)] hover:border-[oklch(0.70_0.10_115)] hover:bg-[oklch(0.70_0.10_115/0.1)]"
      >
        <Link href="/sign-in">Sign In</Link>
      </Button>
    );
  }

  /* ── Authenticated ────────────────────────────────────── */
  const { user } = session;
  const initials = (user.name || user.email || '?')
    .split(/[\s@]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-8 w-8">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || 'User avatar'}
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            ) : (
              <AvatarFallback className="text-xs font-semibold">
                {initials || <User className="h-4 w-4" />}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            {user.name && <p className="text-sm leading-none font-medium">{user.name}</p>}
            <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/history" className="cursor-pointer">
            <History className="mr-2 h-4 w-4" />
            Test history
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
