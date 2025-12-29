<script lang="ts">
    import { onMount } from "svelte";
    import backgroundImage from "$lib/assets/images/diagnostic-background.png";

    let mounted = false;

    onMount(() => {
        mounted = true;
    });
</script>

<div
    class="diagnostic-bg"
    class:mounted
    style="--bg-image: url({backgroundImage})"
>
    <!-- Gradient overlay to blend with glass effects -->
    <div class="gradient-overlay"></div>

    <!-- Noise overlay for texture -->
    <div class="noise-overlay"></div>
</div>

<style>
    .diagnostic-bg {
        position: fixed;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        /* Blue-teal base color as fallback and blend */
        background-color: #c5dbe8;
        background-image: var(--bg-image);
        background-size: cover;
        background-position: top right;
        background-repeat: no-repeat;
    }

    /* Gradient overlay for better glass contrast */
    .gradient-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            135deg,
            rgba(200, 220, 235, 0.4) 0%,
            rgba(180, 210, 225, 0.2) 50%,
            rgba(200, 220, 235, 0.3) 100%
        );
        opacity: 0;
        transition: opacity 1s ease;
    }

    .diagnostic-bg.mounted .gradient-overlay {
        opacity: 1;
    }

    /* Noise Overlay for texture */
    .noise-overlay {
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        opacity: 0.02;
        pointer-events: none;
    }
</style>
