'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TobiiGazePoint, TobiiStatus } from '../types';

const TOBII_BASE_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_TOBII_SERVICE_URL ?? 'http://localhost:28980')
    : '';

// ─── Status Hook ─────────────────────────────────────────

export function useTobiiStatus() {
  const [status, setStatus] = useState<TobiiStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch(`${TOBII_BASE_URL}/tobii/status`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = (await response.json()) as TobiiStatus;
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to Tobii Helper app');
      setStatus(null);
    } finally {
      setChecking(false);
    }
  }, []);

  return { status, checking, error, checkStatus };
}

// ─── Gaze Stream Hook ───────────────────────────────────

interface UseTobiiGazeStreamOptions {
  /** Whether to actively collect gaze data */
  enabled: boolean;
  /** Callback for each batch of gaze points */
  onGazeData?: (points: TobiiGazePoint[]) => void;
}

export function useTobiiGazeStream({ enabled, onGazeData }: UseTobiiGazeStreamOptions) {
  const [connected, setConnected] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onGazeDataRef = useRef(onGazeData);

  useEffect(() => {
    onGazeDataRef.current = onGazeData;
  }, [onGazeData]);

  useEffect(() => {
    if (!enabled) {
      // Close any existing connection when disabled
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const wsUrl = TOBII_BASE_URL.replace(/^http/, 'ws') + '/tobii/gaze';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const points = JSON.parse(event.data as string) as TobiiGazePoint[];
        if (Array.isArray(points) && points.length > 0) {
          onGazeDataRef.current?.(points);
          setPointCount((prev) => prev + points.length);
        }
      } catch {
        // Ignore invalid messages
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled]);

  const resetCount = useCallback(() => setPointCount(0), []);

  return { connected, pointCount, error, resetCount };
}
