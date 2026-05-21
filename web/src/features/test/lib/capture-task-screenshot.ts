import { toJpeg } from 'html-to-image';

/**
 * Captures a DOM element as a compressed JPEG data URL.
 *
 * Uses JPEG (not PNG) because the TaskDisplay is text on a solid
 * background — JPEG at 0.85 quality gives ~15-30KB per capture vs
 * 80-150KB for PNG. The slight compression artifacts are invisible
 * in the export since we composite a crisp SVG overlay on top.
 *
 * pixelRatio is fixed at 1 to avoid retina-inflated image sizes.
 * The export pipeline resizes to the standard 1920×1080 viewport anyway.
 *
 * @returns JPEG data URL, or null if capture fails (non-blocking).
 */
export async function captureTaskScreenshot(element: HTMLElement): Promise<string | null> {
  try {
    // Use the element's actual rendered dimensions. For `position: fixed`
    // elements, getBoundingClientRect gives the correct viewport size.
    const rect = element.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;

    const dataUrl = await toJpeg(element, {
      quality: 0.85,
      pixelRatio: 1,
      width: w,
      height: h,
      // Skip font downloads to avoid cross-origin issues and speed up capture.
      skipFonts: true,
      // Filter out overlays that shouldn't be in the screenshot.
      filter: (node: HTMLElement) => {
        // Skip the tracking indicator dot at bottom of screen.
        if (node.classList?.contains('animate-pulse')) return false;
        return true;
      },
    });

    return dataUrl;
  } catch (error) {
    // Screenshot capture is best-effort — never block the test flow.
    console.error('[captureTaskScreenshot] capture failed, skipping', error);
    return null;
  }
}
