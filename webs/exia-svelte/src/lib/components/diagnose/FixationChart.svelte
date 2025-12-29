<script lang="ts">
    export let data: number[] = [200, 400, 300, 600, 500, 350, 250, 300];
    export let title: string = "Fixation Duration (ms)";

    // Generate SVG path from data
    $: chartPath = generatePath(data);
    $: areaPath = generateAreaPath(data);
    $: gradientId = `chart-gradient-${Math.random().toString(36).substr(2, 9)}`;
    $: areaGradientId = `area-gradient-${Math.random().toString(36).substr(2, 9)}`;

    function generatePath(values: number[]): string {
        if (values.length === 0) return "";

        const maxVal = Math.max(...values);
        const height = 120;
        const width = 300;
        const stepX = width / (values.length - 1);

        let path = `M 0 ${height - (values[0] / maxVal) * height}`;

        for (let i = 1; i < values.length; i++) {
            const x = i * stepX;
            const y = height - (values[i] / maxVal) * height;

            // Smooth curve using quadratic bezier
            const prevX = (i - 1) * stepX;
            const prevY = height - (values[i - 1] / maxVal) * height;
            const cpX = (prevX + x) / 2;

            path += ` Q ${cpX} ${prevY}, ${x} ${y}`;
        }

        return path;
    }

    function generateAreaPath(values: number[]): string {
        if (values.length === 0) return "";

        const maxVal = Math.max(...values);
        const height = 120;
        const width = 300;
        const stepX = width / (values.length - 1);

        let path = `M 0 ${height} L 0 ${height - (values[0] / maxVal) * height}`;

        for (let i = 1; i < values.length; i++) {
            const x = i * stepX;
            const y = height - (values[i] / maxVal) * height;

            const prevX = (i - 1) * stepX;
            const prevY = height - (values[i - 1] / maxVal) * height;
            const cpX = (prevX + x) / 2;

            path += ` Q ${cpX} ${prevY}, ${x} ${y}`;
        }

        path += ` L ${width} ${height} Z`;
        return path;
    }

    $: yLabels = [800, 600, 400, 200];
</script>

<div class="chart-container glass-panel">
    <h3 class="chart-title">{title}</h3>
    <div class="chart-wrapper">
        <div class="y-axis">
            {#each yLabels as label}
                <span class="y-label">{label}</span>
            {/each}
        </div>
        <svg viewBox="0 0 300 120" class="chart-svg" preserveAspectRatio="none">
            <defs>
                <linearGradient
                    id={gradientId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                >
                    <stop
                        offset="0%"
                        style="stop-color: #FF6B8A; stop-opacity: 1"
                    />
                    <stop
                        offset="100%"
                        style="stop-color: #FF9DB5; stop-opacity: 1"
                    />
                </linearGradient>
                <linearGradient
                    id={areaGradientId}
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                >
                    <stop
                        offset="0%"
                        style="stop-color: #FF6B8A; stop-opacity: 0.2"
                    />
                    <stop
                        offset="100%"
                        style="stop-color: #FF6B8A; stop-opacity: 0"
                    />
                </linearGradient>
            </defs>

            <!-- Grid lines -->
            {#each [0, 40, 80, 120] as y}
                <line x1="0" y1={y} x2="300" y2={y} class="grid-line" />
            {/each}

            <!-- Area fill -->
            <path d={areaPath} fill={`url(#${areaGradientId})`} />

            <!-- Chart line -->
            <path
                d={chartPath}
                fill="none"
                stroke={`url(#${gradientId})`}
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            />

            <!-- Data points -->
            {#each data as value, i}
                {@const maxVal = Math.max(...data)}
                {@const x = i * (300 / (data.length - 1))}
                {@const y = 120 - (value / maxVal) * 120}
                <circle cx={x} cy={y} r="3" class="data-point" />
            {/each}
        </svg>
    </div>
</div>

<style>
    .chart-container {
        position: relative;
        padding: var(--space-5);

        /* Refractive glass - very low opacity, see-through */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.02) 50%,
            rgba(255, 255, 255, 0.04) 100%
        );
        backdrop-filter: blur(12px) saturate(140%);
        -webkit-backdrop-filter: blur(12px) saturate(140%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: var(--radius-xl);
        overflow: hidden;

        /* Chromatic shadow for light refraction effect */
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.08),
            0 0 30px rgba(93, 228, 216, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05);
    }

    /* Refractive highlight overlay */
    .chart-container::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.2) 0%,
            transparent 40%,
            transparent 60%,
            rgba(93, 228, 216, 0.1) 100%
        );
        opacity: 0.5;
    }

    .chart-title {
        position: relative;
        font-size: var(--text-sm);
        font-weight: var(--weight-semibold);
        color: var(--color-secondary);
        margin-bottom: var(--space-4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .chart-wrapper {
        display: flex;
        gap: var(--space-3);
        height: 150px;
    }

    .y-axis {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 0 var(--space-2);
    }

    .y-label {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        text-align: right;
        min-width: 30px;
    }

    .chart-svg {
        flex: 1;
        height: 120px;
    }

    .grid-line {
        stroke: rgba(0, 0, 0, 0.06);
        stroke-width: 1;
    }

    .data-point {
        fill: #ff6b8a;
        stroke: white;
        stroke-width: 1.5;
        transition: r 0.2s ease;
    }

    .data-point:hover {
        r: 5;
    }
</style>
