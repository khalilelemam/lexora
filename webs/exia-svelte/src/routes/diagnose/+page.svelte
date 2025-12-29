<script lang="ts">
    import { onMount } from "svelte";
    // UI Components
    import DiagnosticBackground from "$lib/components/ui/DiagnosticBackground.svelte";
    // Diagnose Feature Components
    import UserHeader from "$lib/components/diagnose/UserHeader.svelte";
    import StatCard from "$lib/components/diagnose/StatCard.svelte";
    import FixationChart from "$lib/components/diagnose/FixationChart.svelte";
    import GazeHeatmap from "$lib/components/diagnose/GazeHeatmap.svelte";
    import NeurologicalEvents from "$lib/components/diagnose/NeurologicalEvents.svelte";
    // Global Styles
    import "$lib/styles/global.css";

    let mounted = false;

    onMount(() => {
        mounted = true;
    });

    // Mock data - in production, this would come from your analysis API
    const userData = {
        name: "Jane doe",
        age: 120,
        sessionId: "#EX-2025-8492",
        avatarUrl: "",
    };

    const stats = {
        dyslexiaRisk: 44,
        readingSpeed: 172,
        eventCount: 4,
    };

    const fixationData = [200, 400, 300, 650, 500, 350, 250, 300];

    const gazeWords = [
        { word: "The", time: 500, state: "fluent" as const },
        { word: "qucik", time: 500, state: "hesitant" as const },
        { word: "brown", time: 500, state: "fluent" as const },
        { word: "fox", time: 500, state: "fluent" as const },
        { word: "jumps", time: 500, state: "fluent" as const },
        { word: "over", time: 500, state: "fluent" as const },
        { word: "The", time: 500, state: "hesitant" as const },
        { word: "Big", time: 500, state: "fluent" as const },
        { word: "Bug", time: 500, state: "fluent" as const },
        { word: "Hot", time: 500, state: "struggle" as const },
        { word: "Hot", time: 500, state: "struggle" as const },
        { word: "Hot", time: 500, state: "hesitant" as const },
        { word: "Hot", time: 500, state: "fluent" as const },
        { word: "Hot", time: 500, state: "fluent" as const },
        { word: "Bug", time: 500, state: "fluent" as const },
        { word: "Hot", time: 500, state: "struggle" as const },
    ];

    const neurologicalEvents = [
        {
            type: "REGRESSION" as const,
            target: '"Summer"',
            duration: "672ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION" as const,
            target: '"the"',
            duration: "177ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION" as const,
            target: '"quick"',
            duration: "621ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION" as const,
            target: '"tick"',
            duration: "672ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION" as const,
            target: '"sick"',
            duration: "672ms",
            timestamp: "21:51:59",
        },
        {
            type: "REGRESSION" as const,
            target: '"flick"',
            duration: "672ms",
            timestamp: "21:51:59",
        },
    ];
</script>

<svelte:head>
    <title>Diagnosing - Exia</title>
    <meta name="description" content="Live dyslexia diagnosis session" />
</svelte:head>

<!-- Diagnostic Background with Image -->
<DiagnosticBackground />

<main class="diagnose-container" class:mounted>
    <!-- User Header -->
    <UserHeader
        userName={userData.name}
        userAge={userData.age}
        sessionId={userData.sessionId}
        avatarUrl={userData.avatarUrl}
        isLive={true}
    />

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
        <!-- Left Column: Stats + Heatmap -->
        <div class="left-column">
            <!-- Stats Row -->
            <div class="stats-row">
                <StatCard
                    title="Dyslexia Risk"
                    value={stats.dyslexiaRisk}
                    unit="%"
                    subLabel="Confidence Interval: 94%"
                    variant="primary"
                />
                <StatCard
                    title="Reading Speed"
                    value={stats.readingSpeed}
                    unit="WPM"
                    subLabel="↓ 12% below avg"
                    variant="secondary"
                />
                <StatCard
                    title="Reading Speed"
                    value={stats.eventCount}
                    unit="Events"
                    subLabel="Avg Distance: 3 words"
                    variant="accent"
                />
            </div>

            <!-- Gaze Heatmap -->
            <GazeHeatmap words={gazeWords} />
        </div>

        <!-- Right Column: Chart + Events -->
        <div class="right-column">
            <FixationChart data={fixationData} />
            <NeurologicalEvents events={neurologicalEvents} />
        </div>
    </div>
</main>

<style>
    .diagnose-container {
        position: relative;
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: clamp(1rem, 3vw, 2rem);
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
        min-height: 100vh;
        opacity: 0;
        transform: translateY(20px);
        transition:
            opacity 0.6s ease,
            transform 0.6s ease;
    }

    .diagnose-container.mounted {
        opacity: 1;
        transform: translateY(0);
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: var(--space-6);
    }

    .left-column {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .stats-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-4);
    }

    .right-column {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    /* Responsive */
    @media (max-width: 1024px) {
        .dashboard-grid {
            grid-template-columns: 1fr;
        }

        .stats-row {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 640px) {
        .stats-row {
            grid-template-columns: 1fr;
        }
    }
</style>
