<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import ViewerBackground from "$lib/components/ui/ViewerBackground.svelte";
    import "$lib/styles/global.css";

    const dispatch = createEventDispatcher();

    let mounted = false;

    onMount(() => {
        mounted = true;
        // Add dark theme class for navigation styling
        document.body.classList.add("dark-theme");
    });

    onDestroy(() => {
        // Remove dark theme class when leaving page
        if (typeof document !== "undefined") {
            document.body.classList.remove("dark-theme");
        }
    });

    // Placeholder text for reading display
    const readingText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt`;

    function navigateBack() {
        dispatch("navigate", "landing");
    }
</script>

<svelte:head>
    <title>Reading Session - Exia</title>
    <meta
        name="description"
        content="Live reading session for dyslexia diagnosis"
    />
</svelte:head>

<ViewerBackground />

<main class="viewer-container" class:mounted>
    <!-- Back Navigation -->
    <button class="back-btn glass-refract" on:click={navigateBack}>
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
    </button>

    <!-- Main Content Grid -->
    <div class="content-grid">
        <!-- Left Side: Recording Panel -->
        <section class="recording-panel">
            <!-- Encouragement Banner -->
            <div class="encouragement glass-refract">
                <span class="encourage-text">You are doing Great ❤️‍</span>
            </div>

            <!-- Video Recording Area -->
            <div class="video-container glass-refract">
                <!-- Recording Indicator -->
                <div class="rec-indicator">
                    <span class="rec-dot"></span>
                    <span class="rec-text">REC</span>
                </div>

                <!-- Camera Off State -->
                <div class="camera-off-state">
                    <div class="user-avatar">
                        <svg
                            width="80"
                            height="90"
                            viewBox="0 0 160 180"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M158 177.5V158C158 147.657 153.891 137.737 146.577 130.423C139.263 123.109 129.343 119 119 119H41C30.6566 119 20.7368 123.109 13.4228 130.423C6.10892 137.737 2 147.657 2 158V177.5M119 41C119 62.5391 101.539 80 80 80C58.4609 80 41 62.5391 41 41C41 19.4609 58.4609 2 80 2C101.539 2 119 19.4609 119 41Z"
                                stroke="currentColor"
                                stroke-opacity="0.6"
                                stroke-width="4"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </div>
                    <div class="camera-icon">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 48 48"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <g clip-path="url(#clip0)">
                                <path
                                    d="M2 2L46 46M42 42H6C4.93913 42 3.92172 41.5786 3.17157 40.8284C2.42143 40.0783 2 39.0609 2 38V16C2 14.9391 2.42143 13.9217 3.17157 13.1716C3.92172 12.4214 4.93913 12 6 12H12M18 6H30L34 12H42C43.0609 12 44.0783 12.4214 44.8284 13.1716C45.5786 13.9217 46 14.9391 46 16V34.68M30.56 30.56C29.8962 31.5301 29.0268 32.342 28.0136 32.9379C27.0004 33.5339 25.8683 33.8992 24.6979 34.008C23.5275 34.1167 22.3475 33.9662 21.2418 33.5672C20.1362 33.1681 19.132 32.5303 18.3008 31.6992C17.4697 30.868 16.8319 29.8638 16.4328 28.7582C16.0338 27.6525 15.8833 26.4725 15.992 25.3021C16.1008 24.1317 16.4661 22.9996 17.0621 21.9864C17.658 20.9732 18.4699 20.1038 19.44 19.44"
                                    stroke="currentColor"
                                    stroke-opacity="0.6"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </g>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Voice Waveform -->
            <div class="voice-waveform glass-refract">
                <svg
                    class="waveform-svg"
                    viewBox="0 0 436 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M0 1.5C30.0389 1.5 24.3513 34.3402 54.3902 34.3402C84.4291 34.3402 78.7415 1.5 108.78 1.5C138.819 1.5 133.132 34.3402 163.171 34.3402C193.21 34.3402 187.522 1.5 217.561 1.5M217.756 1.5C247.795 1.5 242.107 34.3402 272.146 34.3402C302.185 34.3402 296.497 1.5 326.536 1.5C356.575 1.5 350.888 34.3402 380.927 34.3402C410.965 34.3402 405.278 1.5 435.317 1.5"
                        stroke="currentColor"
                        stroke-opacity="0.6"
                        stroke-width="3"
                    />
                </svg>
                <div class="waveform-label">Voice Activity</div>
            </div>
        </section>

        <!-- Right Side: Reading Text Display -->
        <section class="reading-panel">
            <div class="reading-content glass-refract">
                <h2 class="reading-title">Reading Passage</h2>
                <p class="reading-text">{readingText}</p>
                <div class="reading-hint">(next sentence up next)</div>
            </div>
        </section>
    </div>
</main>

<style>
    .viewer-container {
        position: relative;
        width: 100%;
        min-height: 100vh;
        padding: clamp(1.5rem, 4vw, 3rem);
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
        opacity: 0;
        transform: translateY(20px);
        transition:
            opacity 0.6s ease,
            transform 0.6s ease;
    }

    .viewer-container.mounted {
        opacity: 1;
        transform: translateY(0);
    }

    /* Refractive Glass Effect */
    .glass-refract {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.02) 50%,
            rgba(255, 255, 255, 0.04) 100%
        );
        backdrop-filter: blur(12px) saturate(120%);
        -webkit-backdrop-filter: blur(12px) saturate(120%);
        border: 1px solid transparent;
        border-image: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.4) 0%,
                rgba(255, 255, 255, 0.1) 50%,
                rgba(255, 255, 255, 0.25) 100%
            )
            1;
        border-radius: var(--radius-xl);
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    /* Override border-image for proper border-radius */
    .glass-refract {
        border: 1px solid rgba(255, 255, 255, 0.2);
        position: relative;
    }

    .glass-refract::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.5) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(88, 252, 236, 0.3) 100%
        );
        -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
        mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
    }

    /* Back Button */
    .back-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-5);
        color: white;
        font-size: var(--text-sm);
        font-weight: var(--weight-medium);
        cursor: pointer;
        transition: all 0.3s ease;
        width: fit-content;
    }

    .back-btn:hover {
        transform: translateX(-4px);
        background: rgba(255, 255, 255, 0.1);
    }

    /* Content Grid */
    .content-grid {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: var(--space-8);
        flex: 1;
        align-items: start;
    }

    /* Recording Panel */
    .recording-panel {
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
    }

    .encouragement {
        padding: var(--space-4) var(--space-6);
        text-align: center;
    }

    .encourage-text {
        color: #58fcec;
        font-size: var(--text-xl);
        font-weight: var(--weight-bold);
        text-shadow: 0 0 20px rgba(88, 252, 236, 0.3);
    }

    /* Video Container */
    .video-container {
        aspect-ratio: 4/3;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: rgba(15, 20, 35, 0.5);
    }

    .rec-indicator {
        position: absolute;
        top: var(--space-4);
        left: var(--space-4);
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .rec-dot {
        width: 12px;
        height: 12px;
        background: #ef4444;
        border-radius: 50%;
        animation: pulse-rec 1.5s ease-in-out infinite;
    }

    @keyframes pulse-rec {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.5;
            transform: scale(0.9);
        }
    }

    .rec-text {
        color: rgba(255, 255, 255, 0.6);
        font-size: var(--text-xs);
        font-weight: var(--weight-semibold);
        letter-spacing: 0.1em;
    }

    .camera-off-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-4);
        color: rgba(255, 255, 255, 0.5);
    }

    .user-avatar {
        opacity: 0.4;
    }

    .camera-icon {
        position: absolute;
        top: var(--space-4);
        right: var(--space-4);
        color: rgba(255, 255, 255, 0.5);
    }

    /* Voice Waveform */
    .voice-waveform {
        padding: var(--space-5);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
    }

    .waveform-svg {
        width: 100%;
        height: auto;
        color: #58fcec;
    }

    .waveform-label {
        font-size: var(--text-xs);
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 0.05em;
    }

    /* Reading Panel */
    .reading-panel {
        height: 100%;
    }

    .reading-content {
        padding: var(--space-8);
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .reading-title {
        font-size: var(--text-lg);
        font-weight: var(--weight-semibold);
        color: rgba(255, 255, 255, 0.7);
        letter-spacing: 0.02em;
    }

    .reading-text {
        font-size: var(--text-2xl);
        font-weight: var(--weight-bold);
        color: white;
        line-height: 1.8;
        flex: 1;
    }

    .reading-hint {
        font-size: var(--text-sm);
        color: rgba(255, 255, 255, 0.4);
        font-style: italic;
        text-align: right;
    }

    /* Responsive */
    @media (max-width: 1024px) {
        .content-grid {
            grid-template-columns: 1fr;
        }

        .recording-panel {
            order: 1;
        }

        .reading-panel {
            order: 0;
        }
    }

    @media (max-width: 640px) {
        .reading-text {
            font-size: var(--text-xl);
        }
    }
</style>
