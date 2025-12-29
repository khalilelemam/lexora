<script lang="ts">
    import { onMount } from "svelte";

    let mounted = false;

    onMount(() => {
        mounted = true;
    });
</script>

<div class="organic-bg" class:mounted>
    <!-- Base gradient matching Figma -->
    <div class="base-gradient"></div>

    <!-- Organic coral/nature element on the right -->
    <div class="organic-element">
        <svg
            viewBox="0 0 400 500"
            class="coral-svg"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient
                    id="coralGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                >
                    <stop
                        offset="0%"
                        style="stop-color: rgba(0, 180, 180, 0.6)"
                    />
                    <stop
                        offset="50%"
                        style="stop-color: rgba(0, 150, 160, 0.5)"
                    />
                    <stop
                        offset="100%"
                        style="stop-color: rgba(0, 120, 140, 0.4)"
                    />
                </linearGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <!-- Organic coral shapes -->
            <g filter="url(#glow)">
                <path
                    d="M200 50 C280 80, 350 150, 320 250 C290 350, 180 400, 100 380 C20 360, 50 280, 80 200 C110 120, 120 20, 200 50"
                    fill="url(#coralGradient)"
                    opacity="0.7"
                />
                <path
                    d="M250 100 C320 120, 380 200, 350 300 C320 400, 200 450, 120 420"
                    fill="none"
                    stroke="rgba(0, 180, 180, 0.4)"
                    stroke-width="3"
                />
                <path
                    d="M180 80 C240 100, 300 180, 280 280"
                    fill="none"
                    stroke="rgba(0, 160, 170, 0.3)"
                    stroke-width="2"
                />
            </g>
        </svg>
    </div>

    <!-- Floating shapes with blue-teal colors -->
    <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
    </div>

    <!-- Noise overlay for texture -->
    <div class="noise-overlay"></div>
</div>

<style>
    .organic-bg {
        position: fixed;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        /* Blue-teal gradient matching Figma */
        background: linear-gradient(
            145deg,
            #b8d4de 0%,
            #9ec8d8 25%,
            #a5cfe0 50%,
            #b0d9e5 75%,
            #c5e0ea 100%
        );
    }

    /* Base gradient overlay */
    .base-gradient {
        position: absolute;
        inset: 0;
        background: radial-gradient(
                ellipse 60% 50% at 30% 30%,
                rgba(180, 215, 230, 0.6) 0%,
                transparent 60%
            ),
            radial-gradient(
                ellipse 50% 60% at 70% 60%,
                rgba(140, 200, 210, 0.5) 0%,
                transparent 50%
            );
    }

    /* Organic coral element positioned on the right */
    .organic-element {
        position: absolute;
        right: -50px;
        top: 10%;
        width: 450px;
        height: 550px;
        opacity: 0;
        transition: opacity 1.5s ease;
        pointer-events: none;
    }

    .organic-bg.mounted .organic-element {
        opacity: 1;
    }

    .coral-svg {
        width: 100%;
        height: 100%;
        animation: gentleSway 15s ease-in-out infinite;
    }

    @keyframes gentleSway {
        0%,
        100% {
            transform: translateY(0) rotate(0deg);
        }
        50% {
            transform: translateY(-15px) rotate(2deg);
        }
    }

    /* Floating Shapes */
    .floating-shapes {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    .shape {
        position: absolute;
        border-radius: 50%;
        filter: blur(50px);
        opacity: 0;
        transition: opacity 1.5s ease;
    }

    .organic-bg.mounted .shape {
        opacity: 1;
    }

    .shape-1 {
        width: 300px;
        height: 300px;
        background: linear-gradient(
            135deg,
            rgba(0, 180, 200, 0.25),
            rgba(100, 200, 210, 0.15)
        );
        top: -80px;
        left: -80px;
        animation: float1 18s ease-in-out infinite;
    }

    .shape-2 {
        width: 250px;
        height: 250px;
        background: linear-gradient(
            135deg,
            rgba(93, 228, 216, 0.3),
            rgba(150, 240, 235, 0.15)
        );
        bottom: 15%;
        left: 20%;
        animation: float2 22s ease-in-out infinite;
    }

    .shape-3 {
        width: 200px;
        height: 200px;
        background: linear-gradient(
            135deg,
            rgba(0, 140, 160, 0.25),
            rgba(60, 180, 190, 0.15)
        );
        top: 50%;
        right: 30%;
        animation: float3 16s ease-in-out infinite;
    }

    @keyframes float1 {
        0%,
        100% {
            transform: translate(0, 0) scale(1);
        }
        33% {
            transform: translate(20px, 30px) scale(1.05);
        }
        66% {
            transform: translate(-15px, 15px) scale(0.95);
        }
    }

    @keyframes float2 {
        0%,
        100% {
            transform: translate(0, 0) scale(1);
        }
        50% {
            transform: translate(30px, -20px) scale(1.08);
        }
    }

    @keyframes float3 {
        0%,
        100% {
            transform: translate(0, 0);
        }
        50% {
            transform: translate(-25px, 25px);
        }
    }

    /* Noise Overlay for texture */
    .noise-overlay {
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        opacity: 0.025;
        pointer-events: none;
    }
</style>
