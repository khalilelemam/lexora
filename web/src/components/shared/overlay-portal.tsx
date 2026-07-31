'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const subscribeToNothing = () => () => {};
const onClient = () => false;
const onServer = () => true;

/**
 * Renders children into `document.body`.
 *
 * Fullscreen overlays position themselves with `position: fixed`, which is
 * resolved against the nearest ancestor that establishes a containing block —
 * any ancestor carrying `transform`, `translate`, `filter`, `backdrop-filter`,
 * `perspective`, `contain`, or `will-change`. The history/admin attempt cards
 * animate on hover (`hover:-translate-y-0.5`) and clip with `overflow-hidden`,
 * so an overlay rendered inside a card collapses into that card's box the
 * moment the pointer touches it.
 *
 * Portalling to `document.body` keeps the overlay anchored to the viewport no
 * matter how the trigger is styled.
 */
export function OverlayPortal({ children }: { children: ReactNode }) {
  // Renders nothing while server rendering and hydrating, so the markup on
  // both sides matches; a client-only mount portals on its first render.
  const isServerRender = useSyncExternalStore(subscribeToNothing, onClient, onServer);

  return isServerRender ? null : createPortal(children, document.body);
}
