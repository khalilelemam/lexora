import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/download/service?platform=windows|macos|linux
 *
 * Proxies the latest Lexora Tobii Service installer from GitHub Releases.
 * Works even when the repo is private by using a server-side GitHub token.
 */

const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'khalilelemam';
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'eglex';
const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// Platform keywords that match our asset naming convention
const PLATFORM_MAP: Record<string, string> = {
  windows: 'Lexora-Setup.exe',
  macos: 'Lexora-macOS-Installer.pkg',
  linux: 'Lexora-Linux-Installer.deb',
};

function detectPlatform(ua: string): string {
  const lower = ua.toLowerCase();
  if (lower.includes('mac') || lower.includes('darwin')) return 'macos';
  if (lower.includes('linux')) return 'linux';
  return 'windows'; // default
}

export async function GET(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'Server misconfiguration: missing GITHUB_TOKEN' },
      { status: 500 },
    );
  }

  // Determine platform from query param or User-Agent
  const platform =
    req.nextUrl.searchParams.get('platform') ?? detectPlatform(req.headers.get('user-agent') ?? '');

  const expectedAsset = PLATFORM_MAP[platform];
  if (!expectedAsset) {
    return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
  }

  try {
    // Fetch latest release metadata
    const releaseRes = await fetch(RELEASES_API, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Lexora-Web-Downloader',
      },
      next: { revalidate: 300 }, // cache for 5 minutes
    });

    if (!releaseRes.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch release info from GitHub' },
        { status: releaseRes.status },
      );
    }

    const release = await releaseRes.json();

    // Find the matching asset
    const asset = release.assets?.find((a: { name: string }) => a.name === expectedAsset);

    if (!asset) {
      return NextResponse.json(
        { error: `No ${platform} installer found in latest release (${release.tag_name})` },
        { status: 404 },
      );
    }

    // Stream the binary from GitHub's API (works for private repos)
    const assetRes = await fetch(asset.url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/octet-stream',
        'User-Agent': 'Lexora-Web-Downloader',
      },
    });

    if (!assetRes.ok || !assetRes.body) {
      return NextResponse.json({ error: 'Failed to download asset from GitHub' }, { status: 502 });
    }

    // Stream it back to the user as a file download
    return new NextResponse(assetRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${expectedAsset}"`,
        ...(assetRes.headers.get('content-length')
          ? { 'Content-Length': assetRes.headers.get('content-length')! }
          : {}),
      },
    });
  } catch (err) {
    console.error('Download proxy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
