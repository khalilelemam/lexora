<script lang="ts">
    export let className: string = "";
    export let variant: "default" | "subtle" | "strong" = "default";
</script>

<div class="glass-panel {variant} {className}">
    <div class="glass-refract-border"></div>
    <slot />
</div>

<style>
    .glass-panel {
        position: relative;
        /* Very low opacity - clear/transparent glass */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.02) 50%,
            rgba(255, 255, 255, 0.04) 100%
        );
        backdrop-filter: blur(var(--glass-blur, 12px)) saturate(140%);
        -webkit-backdrop-filter: blur(var(--glass-blur, 12px)) saturate(140%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: var(--radius-xl);
        overflow: hidden;

        /* Chromatic shadow for refraction effect */
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.08),
            0 0 40px rgba(93, 228, 216, 0.04),
            0 0 60px rgba(232, 121, 169, 0.02),
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05);

        transition: all 0.3s ease;
    }

    /* Refractive border overlay - simulates light catching edges */
    .glass-refract-border {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.3) 0%,
            transparent 30%,
            transparent 70%,
            rgba(93, 228, 216, 0.15) 100%
        );
        opacity: 0.6;
    }

    .glass-panel:hover {
        transform: translateY(-2px);
        box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.12),
            0 0 50px rgba(93, 228, 216, 0.06),
            0 0 80px rgba(232, 121, 169, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05);
    }

    /* Subtle variant - even more transparent */
    .subtle {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.01) 50%,
            rgba(255, 255, 255, 0.02) 100%
        );
        border-color: rgba(255, 255, 255, 0.1);
    }

    /* Strong variant - slightly more visible */
    .strong {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.04) 50%,
            rgba(255, 255, 255, 0.07) 100%
        );
        border-color: rgba(255, 255, 255, 0.25);
    }
</style>
