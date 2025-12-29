/**
 * Diagnose Page Utilities
 * Helper functions for data processing and chart configuration
 */

/**
 * Format duration in milliseconds to readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Calculate average from array of numbers
 * @param {number[]} values - Array of numbers
 * @returns {number} - Average value
 */
export function calculateAverage(values: number[]): number {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Get status color based on value
 * @param {number} status - Status value (negative = below avg)
 * @returns {string} - CSS color value
 */
export function getStatusColor(status: number): string {
    if (status < 0) return '#FF4D6D';
    if (status > 0) return '#00D4AA';
    return '#7B8794';
}

/**
 * Parse time string to Date object
 * @param {string} timeStr - Time string (HH:MM:SS)
 * @returns {Date} - Date object
 */
export function parseTime(timeStr: string): Date {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds);
    return date;
}

/**
 * Normalize data values for chart rendering
 * @param {Array} data - Raw data array
 * @param {string} key - Key to normalize
 * @returns {Array} - Normalized data
 */
export function normalizeChartData<T extends Record<string, number>>(
    data: T[],
    key: keyof T
): (T & { normalized: number })[] {
    const values = data.map(d => d[key] as number);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return data.map(d => ({
        ...d,
        normalized: ((d[key] as number) - min) / range
    }));
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
