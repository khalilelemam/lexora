import { render } from 'react-email';
import { APIError } from 'better-auth/api';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins';
import { Resend } from 'resend';

import { parseConsentCookie } from '@/lib/consent';
import { MagicLinkEmail } from '@/emails/magic-link';
import { prisma } from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: process.env.BETTER_AUTH_URL,

  /* ── Social providers ─────────────────────────────────── */
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      mapProfileToUser: (profile) => ({
        image: profile.picture,
      }),
    },
  },

  /* ── Account linking ──────────────────────────────────── */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  /* ── User fields ──────────────────────────────────────── */
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'USER',
        input: false,
      },
      termsAcceptedAt: {
        type: 'date',
        required: false,
        input: false,
      },
      rawDataConsent: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },

  /* ── Database hooks — consent capture ────── */
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const cookieHeader = ctx?.headers?.get?.('cookie') ?? null;
          const consent = parseConsentCookie(cookieHeader);

          if (!consent?.terms) {
            throw new APIError('BAD_REQUEST', {
              message: 'Terms and Privacy Policy must be accepted before creating an account.',
            });
          }

          return {
            data: {
              ...user,
              termsAcceptedAt: new Date(consent.ts),
              rawDataConsent: consent.rawData ?? false,
            },
          };
        },
      },
    },
    session: {
      create: {
        /**
         * On every new session (including returning-user sign-ins),
         * update `termsAcceptedAt` from the consent cookie if present.
         * We intentionally do NOT overwrite `rawDataConsent` for existing
         * users — changes to that require contacting support (github issue #45).
         */
        after: async (session, ctx) => {
          const cookieHeader = ctx?.headers?.get?.('cookie') ?? null;
          const consent = parseConsentCookie(cookieHeader);

          if (consent?.terms) {
            await prisma.user.update({
              where: { id: session.userId },
              data: { termsAcceptedAt: new Date(consent.ts) },
            });
          }
        },
      },
    },
  },

  /* ── Plugins ──────────────────────────────────────────── */
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const html = await render(MagicLinkEmail({ url }));

        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Lexora <noreply@lexora.page>',
          to: email,
          subject: 'Sign in to Lexora',
          html,
        });
      },
      expiresIn: 900,
      allowedAttempts: 1,
    }),
    nextCookies(), // must be last
  ],
});

export type Session = typeof auth.$Infer.Session;
