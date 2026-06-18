'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, LayoutDashboard, LogOut, User } from 'lucide-react';

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
    return <div className="h-8 w-8 animate-pulse bg-[#51513d]/15" />;
  }

  /* ── Guest ────────────────────────────────────────────── */
  if (!session?.user) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-[#51513d]/30 text-[#51513d] hover:border-[#51513d] hover:bg-[#51513d]/8"
      >
        <Link href="/sign-in">Sign In</Link>
      </Button>
    );
  }

  /* ── Authenticated ────────────────────────────────────── */
  const { user } = session;
  const isAdmin = (user as { role?: string }).role === 'ADMIN';
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
              <AvatarFallback className="bg-[#51513d] text-xs font-black text-[#e3dcc2]">
                {initials || <User className="h-4 w-4" />}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 border-[#51513d]/25 bg-[#e3dcc2] text-[#1b2021] shadow-xl shadow-[#1b2021]/10">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            {user.name && <p className="text-sm leading-none font-medium">{user.name}</p>}
            <p className="text-[#1b2021]/60 text-xs leading-none">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-[#51513d]/15" />

        <DropdownMenuItem asChild className="focus:bg-[#51513d]/10 focus:text-[#1b2021]">
          <Link href="/history" className="cursor-pointer">
            <History className="mr-2 h-4 w-4 text-[#51513d]" />
            Test history
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild className="focus:bg-[#51513d]/10 focus:text-[#1b2021]">
            <Link href="/admin/dashboard" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4 text-[#51513d]" />
              Admin dashboard
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer focus:bg-[#51513d]/10 focus:text-[#1b2021]">
          <LogOut className="mr-2 h-4 w-4 text-[#51513d]" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
