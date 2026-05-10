import { render } from '@react-email/components';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins';
import { Resend } from 'resend';

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
