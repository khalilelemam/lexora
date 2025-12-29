<script lang="ts">
    interface WordData {
        word: string;
        time: number;
        state: "hesitant" | "fluent" | "struggle";
    }

    export let words: WordData[] = [
        { word: "The", time: 500, state: "fluent" },
        { word: "qucik", time: 500, state: "hesitant" },
        { word: "brown", time: 500, state: "fluent" },
        { word: "fox", time: 500, state: "fluent" },
        { word: "jumps", time: 500, state: "fluent" },
        { word: "over", time: 500, state: "fluent" },
        { word: "The", time: 500, state: "hesitant" },
        { word: "Big", time: 500, state: "fluent" },
        { word: "Bug", time: 500, state: "fluent" },
        { word: "Hot", time: 500, state: "struggle" },
        { word: "Hot", time: 500, state: "struggle" },
        { word: "Hot", time: 500, state: "hesitant" },
        { word: "Hot", time: 500, state: "fluent" },
        { word: "Hot", time: 500, state: "fluent" },
        { word: "Bug", time: 500, state: "fluent" },
        { word: "Hot", time: 500, state: "struggle" },
    ];

    export let title: string = "Real-Time Gaze Heatmap";
</script>

<div class="heatmap-container glass-panel">
    <div class="heatmap-header">
        <div class="title-section">
            <span class="eye-icon">
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <circle cx="12" cy="12" r="3" />
                    <path
                        d="M12 5v2M12 17v2M5 12h2M17 12h2M7.05 7.05l1.41 1.41M15.54 15.54l1.41 1.41M7.05 16.95l1.41-1.41M15.54 8.46l1.41-1.41"
                    />
                </svg>
            </span>
            <h3 class="heatmap-title">{title}</h3>
        </div>
        <div class="legend">
            <span class="legend-item hesitant">Hesitant</span>
            <span class="legend-item fluent">Fluent</span>
            <span class="legend-item struggle">Struggle</span>
        </div>
    </div>

    <div class="words-grid">
        {#each words as { word, time, state }}
            <div class="word-item {state}">
                <span class="word-time">{time}ms</span>
                <span class="word-text">{word}</span>
            </div>
        {/each}
    </div>
</div>

<style>
    .heatmap-container {
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
    .heatmap-container::before {
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
        z-index: 0;
    }

    .heatmap-header {
        position: relative;
        z-index: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-5);
        flex-wrap: wrap;
        gap: var(--space-3);
    }

    .title-section {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .eye-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-secondary);
    }

    .heatmap-title {
        font-size: var(--text-sm);
        font-weight: var(--weight-semibold);
        color: var(--color-dark);
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .legend {
        display: flex;
        gap: var(--space-3);
    }

    .legend-item {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
    }

    /* 5-column grid layout to match Figma */
    .words-grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: var(--space-4);
        padding: var(--space-4);
        background: rgba(255, 255, 255, 0.08);
        border-radius: var(--radius-lg);
    }

    .word-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1);
    }

    .word-time {
        font-size: 10px;
        font-weight: var(--weight-semibold);
        padding: 3px 8px;
        border-radius: var(--radius-sm);
        background: var(--color-secondary);
        color: var(--color-dark);
    }

    .word-text {
        font-size: var(--text-xl);
        font-weight: var(--weight-bold);
        color: var(--color-dark);
    }

    /* State colors for word times */
    .hesitant .word-time {
        background: var(--color-secondary);
        color: var(--color-dark);
    }

    .fluent .word-time {
        background: var(--color-secondary);
        color: var(--color-dark);
    }

    .struggle .word-time {
        background: var(--color-secondary);
        color: var(--color-dark);
    }

    /* Responsive - stack to 3 columns on smaller screens */
    @media (max-width: 768px) {
        .words-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: var(--space-3);
        }
    }

    @media (max-width: 480px) {
        .words-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>
