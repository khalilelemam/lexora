<script lang="ts">
    interface NeurologicalEvent {
        type: "REGRESSION" | "FIXATION" | "SACCADE";
        target: string;
        duration: string;
        timestamp: string;
    }

    export let events: NeurologicalEvent[] = [
        {
            type: "REGRESSION",
            target: '"Summer"',
            duration: "672ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION",
            target: '"the"',
            duration: "177ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION",
            target: '"quick"',
            duration: "621ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION",
            target: '"tick"',
            duration: "672ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION",
            target: '"sick"',
            duration: "672ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION",
            target: '"flick"',
            duration: "672ms",
            timestamp: "21:51:59",
        },
    ];

    export let title: string = "Neurological Events";
</script>

<div class="events-container glass-panel">
    <h3 class="events-title">{title}</h3>

    <div class="events-list">
        {#each events as event}
            <div class="event-item">
                <div class="event-indicator"></div>
                <div class="event-content">
                    <div class="event-header-row">
                        <span class="event-badge">{event.type}</span>
                        <span class="event-time">{event.timestamp}</span>
                    </div>
                    <span class="event-target"
                        >Target: {event.target} ({event.duration})</span
                    >
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .events-container {
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
        max-height: 400px;
        overflow-y: auto;
    }

    /* Refractive highlight overlay */
    .events-container::before {
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

    .events-title {
        position: relative;
        z-index: 1;
        font-size: var(--text-sm);
        font-weight: var(--weight-semibold);
        color: var(--color-dark);
        margin-bottom: var(--space-4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        position: sticky;
        top: 0;
        background: transparent;
        padding-bottom: var(--space-2);
    }

    .events-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .event-item {
        display: flex;
        align-items: stretch;
        gap: var(--space-3);
        padding: var(--space-3);
        background: rgba(255, 255, 255, 0.3);
        border-radius: var(--radius-md);
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: all 0.2s ease;
    }

    .event-item:hover {
        background: rgba(255, 255, 255, 0.45);
        transform: translateX(4px);
    }

    .event-indicator {
        width: 4px;
        background: linear-gradient(
            180deg,
            var(--color-secondary) 0%,
            rgba(93, 228, 216, 0.5) 100%
        );
        border-radius: 2px;
        flex-shrink: 0;
    }

    .event-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
    }

    .event-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .event-badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: var(--weight-bold);
        border-radius: var(--radius-sm);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        background: rgba(93, 228, 216, 0.2);
        color: var(--color-secondary);
        border: 1px solid var(--color-secondary);
    }

    .event-target {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
    }

    .event-time {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
        font-family: monospace;
    }

    /* Scrollbar styling */
    .events-container::-webkit-scrollbar {
        width: 6px;
    }

    .events-container::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 3px;
    }

    .events-container::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.15);
        border-radius: 3px;
    }

    .events-container::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.25);
    }
</style>
