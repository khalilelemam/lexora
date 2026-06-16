import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface MagicLinkEmailProps {
  url: string;
}

/**
 * Branded email template for Lexora magic-link sign in.
 * Rendered server-side via `react-email` and sent through Resend.
 */
export function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to Lexora — your link is ready</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Brand header */}
          <Section style={header}>
            <Heading as="h1" style={logo}>
              Lexora
            </Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Sign in to Lexora
            </Heading>

            <Text style={text}>
              Click the button below to securely sign in. This link will expire in{' '}
              <strong>15 minutes</strong> and can only be used once.
            </Text>

            <Section style={buttonContainer}>
              <Button href={url} style={button}>
                Sign in to Lexora
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={footer}>
              If you didn&apos;t request this email, you can safely ignore it. No account changes
              will be made.
            </Text>

            <Text style={linkFallback}>
              Button not working? Copy and paste this URL into your browser:
              <br />
              <span style={urlText}>{url}</span>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ── Styles ─────────────────────────────────────────────── */

const body: React.CSSProperties = {
  backgroundColor: '#f5f3ec',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: '480px',
  margin: '0 auto',
  padding: '40px 0',
};

const header: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: '24px 0 16px',
};

const logo: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#51513d',
  letterSpacing: '-0.5px',
  margin: 0,
};

const content: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '40px 32px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  border: '1px solid #e8e5db',
};

const heading: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 600,
  color: '#1b2021',
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const text: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#555555',
  textAlign: 'center' as const,
  margin: '0 0 28px',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '0 0 28px',
};

const button: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#51513d',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  padding: '14px 40px',
  borderRadius: '10px',
  textDecoration: 'none',
};

const divider: React.CSSProperties = {
  borderTop: '1px solid #e8e5db',
  margin: '24px 0',
};

const footer: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const linkFallback: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#bbbbbb',
  textAlign: 'center' as const,
  margin: 0,
};

const urlText: React.CSSProperties = {
  color: '#51513d',
  wordBreak: 'break-all' as const,
};
