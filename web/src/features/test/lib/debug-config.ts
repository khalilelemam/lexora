/** Shows gaze debug UI when explicitly enabled for local/manual diagnosis. */
export const DEBUG_GAZE_OVERLAY = process.env.NEXT_PUBLIC_DEBUG_GAZE_OVERLAY === 'true';

/**
 * Enables verbose calibration diagnostics. Development builds log by default;
 * production builds require NEXT_PUBLIC_DEBUG_CALIBRATION_LOG=true.
 */
export const DEBUG_CALIBRATION_LOG =
  process.env.NEXT_PUBLIC_DEBUG_CALIBRATION_LOG === 'true' ||
  process.env.NODE_ENV !== 'production';

type LogArg = unknown | (() => unknown);
type LogMethod = 'debug' | 'info' | 'warn' | 'error';

function writeDebugLog(enabled: boolean, method: LogMethod, args: LogArg[]) {
  if (!enabled) return;
  console[method](...args.map((arg) => (typeof arg === 'function' ? arg() : arg)));
}

export const calibrationLogger = {
  enabled: DEBUG_CALIBRATION_LOG,
  debug: (...args: LogArg[]) => writeDebugLog(DEBUG_CALIBRATION_LOG, 'debug', args),
  info: (...args: LogArg[]) => writeDebugLog(DEBUG_CALIBRATION_LOG, 'info', args),
  warn: (...args: LogArg[]) => writeDebugLog(DEBUG_CALIBRATION_LOG, 'warn', args),
  error: (...args: LogArg[]) => writeDebugLog(DEBUG_CALIBRATION_LOG, 'error', args),
};
