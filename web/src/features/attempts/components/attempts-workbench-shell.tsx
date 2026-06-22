'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Camera, History, LayoutDashboard, Monitor } from 'lucide-react';

import { LexoraLogo } from '@/components/shared/lexora-logo';
import { UserNav } from '@/components/shared/user-nav';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

interface WorkbenchStat {
  label: string;
  value: string;
  detail: string;
}

interface WorkbenchAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  variant?: 'primary' | 'outline';
}

interface AttemptsWorkbenchShellProps {
  title: string;
  eyebrow: string;
  description: string;
  activeSection: 'history' | 'admin';
  icon: LucideIcon;
  stats: WorkbenchStat[];
  actions: WorkbenchAction[];
  children: ReactNode;
}

const NAV_ITEMS = [
  { label: 'History', href: '/history', value: 'history' as const, icon: History },
  { label: 'Admin', href: '/admin/dashboard', value: 'admin' as const, icon: LayoutDashboard },
];

export function AttemptsWorkbenchShell({
  title,
  eyebrow,
  description,
  activeSection,
  icon: Icon,
  stats,
  actions,
  children,
}: AttemptsWorkbenchShellProps) {
  const { data: session } = authClient.useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const navItems = NAV_ITEMS.filter(
    (item) => item.value !== 'admin' || isAdmin || activeSection === 'admin',
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#e3dcc2] text-[#1b2021]">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(81,81,61,.08) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.08) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(227,220,149,0.54),transparent_25rem),radial-gradient(circle_at_84%_18%,rgba(166,168,103,0.28),transparent_23rem),linear-gradient(115deg,rgba(255,255,255,.32)_0_24%,transparent_24%_100%)]" />
      <div className="pointer-events-none absolute top-24 right-8 hidden h-28 w-44 bg-[#51513d] shadow-[12px_12px_0_rgba(27,32,33,.12)] lg:block" />
      <div className="pointer-events-none absolute top-44 right-28 hidden h-14 w-14 bg-[#a6a867] shadow-[8px_8px_0_rgba(81,81,61,.12)] lg:block" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-3 z-30 border border-[#51513d]/18 bg-[#e3dcc2]/82 px-3 py-3 shadow-[8px_8px_0_rgba(81,81,61,.1)] backdrop-blur-xl sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="shrink-0" aria-label="Lexora home">
              <LexoraLogo size="sm" />
            </Link>

            <nav aria-label="Workbench" className="order-3 flex w-full gap-2 sm:order-0 sm:w-auto">
              {navItems.map((item) => {
                const ItemIcon = item.icon;
                const active = activeSection === item.value;

                return (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 flex-1 rounded-md px-3 font-black tracking-[0.08em] uppercase sm:flex-none',
                      active
                        ? 'bg-[#1b2021] text-[#e3dcc2] hover:bg-[#51513d] hover:text-[#e3dcc2]'
                        : 'text-[#1b2021]/68 hover:bg-[#51513d]/10 hover:text-[#1b2021]',
                    )}
                  >
                    <Link href={item.href}>
                      <ItemIcon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden border-[#51513d]/28 bg-[#e3dcc2]/70 font-bold text-[#1b2021] hover:bg-[#e3dc95]/55 md:inline-flex"
              >
                <Link href="/test/webcam">
                  <Camera className="h-4 w-4" />
                  Webcam
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden border-[#51513d]/28 bg-[#e3dcc2]/70 font-bold text-[#1b2021] hover:bg-[#e3dc95]/55 md:inline-flex"
              >
                <Link href="/test/tobii">
                  <Monitor className="h-4 w-4" />
                  Tobii
                </Link>
              </Button>
              <UserNav />
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="border border-[#51513d]/18 bg-[#f3edd7]/74 p-5 shadow-[12px_12px_0_rgba(81,81,61,.12)] backdrop-blur-sm sm:p-7">
            <div className="mb-5 inline-flex items-center gap-2 border border-[#51513d]/22 bg-[#e3dcc2]/72 px-3 py-2 text-[10px] font-black tracking-[0.24em] text-[#51513d] uppercase">
              <Icon className="h-4 w-4" />
              {eyebrow}
            </div>
            <h1 className="max-w-3xl text-4xl leading-[0.95] font-black tracking-[0.04em] text-balance sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#1b2021]/68 sm:text-base">
              {description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {actions.map((action) => {
                const ActionIcon = action.icon;
                const className =
                  action.variant === 'outline' ? outlineActionClass : primaryActionClass;
                const variant = action.variant === 'outline' ? 'outline' : 'default';

                return action.href ? (
                  <Button
                    key={action.label}
                    asChild
                    size="sm"
                    variant={variant}
                    className={className}
                  >
                    <Link href={action.href}>
                      <ActionIcon className="h-4 w-4" />
                      {action.label}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={variant}
                    className={className}
                    onClick={action.onClick}
                  >
                    <ActionIcon className="h-4 w-4" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-px overflow-hidden border border-[#51513d]/18 bg-[#51513d]/18 shadow-[10px_10px_0_rgba(81,81,61,.1)] sm:grid-cols-3 lg:grid-cols-1">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-[#e3dcc2]/92 p-4">
                <p className="text-[10px] font-black tracking-[0.2em] text-[#51513d] uppercase">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-[#1b2021]">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#1b2021]/58">{stat.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-10">{children}</section>
      </div>
    </main>
  );
}

const primaryActionClass =
  'h-10 rounded-md bg-[#1b2021] px-4 font-black text-[#e3dcc2] shadow-[5px_5px_0_rgba(81,81,61,.14)] hover:bg-[#51513d]';

const outlineActionClass =
  'h-10 rounded-md border-[#51513d]/30 bg-[#e3dcc2]/70 px-4 font-black text-[#1b2021] hover:bg-[#e3dc95]/55';
