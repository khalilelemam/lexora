<script lang="ts">
    export let title: string;
    export let value: string | number;
    export let unit: string = "";
    export let subLabel: string = "";
    export let variant: "primary" | "secondary" | "accent" = "primary";
</script>

<div class="stat-card {variant}">
    <h3 class="stat-title">{title}</h3>
    <div class="stat-value">
        <span class="value">{value}</span>
        {#if unit}
            <span class="unit">{unit}</span>
        {/if}
    </div>
    {#if subLabel}
        <p class="stat-sublabel">{subLabel}</p>
    {/if}
</div>

<style>
    .stat-card {
        position: relative;
        padding: var(--space-5) var(--space-6);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);

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

        transition: all 0.3s ease;
    }

    /* Refractive highlight overlay */
    .stat-card::before {
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

    .stat-card:hover {
        transform: translateY(-3px);
        box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.12),
            0 0 40px rgba(93, 228, 216, 0.06),
            0 0 60px rgba(232, 121, 169, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05);
    }

    .stat-title {
        position: relative;
        font-size: var(--text-sm);
        font-weight: var(--weight-semibold);
        color: var(--color-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .stat-value {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
    }

    .value {
        font-family: var(--font-display);
        font-size: clamp(3rem, 6vw, 4.5rem);
        font-weight: var(--weight-bold);
        color: var(--color-dark);
        line-height: 1;
    }

    .unit {
        font-size: var(--text-xl);
        font-weight: var(--weight-medium);
        color: var(--color-text-muted);
    }

    .stat-sublabel {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
    }

    /* Variants */
    .primary .stat-title {
        color: var(--color-secondary);
    }

    .secondary .stat-title {
        color: var(--color-secondary);
    }

    .secondary .stat-sublabel {
        color: var(--color-primary);
    }

    .accent .stat-title {
        color: var(--color-secondary);
    }
</style>
