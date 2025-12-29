<script lang="ts">
    import { onMount } from "svelte";
    import backgroundImage from "$lib/assets/images/viewer-background.jpg";

    let mounted = false;

    onMount(() => {
        mounted = true;
    });
</script>

<div class="viewer-bg" class:mounted style="--bg-image: url({backgroundImage})">
    <!-- Dark overlay for readability -->
    <div class="dark-overlay"></div>

    <!-- Atmospheric overlay -->
    <div class="atmosphere-overlay"></div>
</div>

<style>
    .viewer-bg {
        position: fixed;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        background-color: #1a2332;
        background-image: var(--bg-image);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0;
        transition: opacity 1s ease;
    }

    .viewer-bg.mounted {
        opacity: 1;
    }

    /* Dark overlay for better text contrast */
    .dark-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            180deg,
            rgba(15, 20, 35, 0.3) 0%,
            rgba(15, 20, 35, 0.5) 50%,
            rgba(15, 20, 35, 0.7) 100%
        );
    }

    /* Atmospheric/misty effect */
    .atmosphere-overlay {
        position: absolute;
        inset: 0;
        background: radial-gradient(
            ellipse at center bottom,
            rgba(100, 140, 180, 0.15) 0%,
            transparent 60%
        );
        pointer-events: none;
    }
</style>
