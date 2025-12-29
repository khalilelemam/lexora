<script lang="ts">
    import { onMount } from "svelte";
    import LiquidGlass from "$lib/components/ui/LiquidGlass.svelte";
    import OrganicBackground from "$lib/components/ui/OrganicBackground.svelte";
    import "$lib/styles/global.css";

    let mounted = false;

    onMount(() => {
        mounted = true;
    });

    // Form handling
    let email = "";
    let submitState: "idle" | "success" | "error" = "idle";

    function handleSubmit(e: Event) {
        e.preventDefault();
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!email || !isValid) {
            submitState = "error";
            setTimeout(() => (submitState = "idle"), 2500);
            return;
        }

        submitState = "success";
        email = "";
        setTimeout(() => (submitState = "idle"), 3000);
    }
</script>

<svelte:head>
    <title>Exia - Dyslexia Diagnosis</title>
    <meta
        name="description"
        content="See the unseen. Diagnose dyslexia in minutes with advanced eye-tracking technology."
    />
</svelte:head>

<!-- Organic Background -->
<OrganicBackground />

<main class="main-container">
    <!-- Navigation -->
    <nav class="navbar glass-clear" class:mounted>
        <div class="nav-content">
            <a href="/" class="logo">
                <span class="logo-icon">◈</span>
                <span class="logo-text">Exia</span>
            </a>

            <div class="nav-links">
                <a href="#services" class="nav-link">Services</a>
                <a href="#about" class="nav-link">About</a>
                <a href="#download" class="nav-link">Download</a>
            </div>

            <a href="#contact" class="contact-btn">
                <span>Contact</span>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </a>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content" class:mounted>
            <h1 class="hero-title animate-fade-in-up">
                <span class="hero-accent">See the unseen.</span>
                <br />
                <span>Diagnose in minutes.</span>
            </h1>
            <p class="hero-description animate-fade-in-up delay-2">
                Traditional assessments take hours. Exia uses advanced
                eye-tracking algorithms to identify reading patterns associated
                with dyslexia instantly.
            </p>
            <div class="hero-cta animate-fade-in-up delay-3">
                <button class="btn-primary">Get Started</button>
                <button class="btn-secondary">Learn More</button>
            </div>
        </div>
        <div class="hero-visual animate-fade-in-right delay-3" class:mounted>
            <div class="hero-image-wrapper glass-clear">
                <div class="hero-visual-content">
                    <div class="eye-graphic">
                        <div class="eye-outer"></div>
                        <div class="eye-inner"></div>
                        <div class="eye-pupil"></div>
                        <div class="scan-line"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <div class="divider"></div>

    <!-- Mission Label -->
    <div class="section-label animate-fade-in-up" class:mounted>
        <span class="label-line"></span>
        <span class="label-text">OUR MISSION</span>
    </div>

    <!-- Services Section -->
    <section id="services" class="services">
        <header class="services-header animate-fade-in-up" class:mounted>
            <h2>
                <span class="text-gradient">Services</span>
                <br />
                <span class="services-subtitle"
                    >Choose Your Diagnostic Power</span
                >
            </h2>
            <p class="services-tagline">
                From instant screening to clinical-grade analysis
            </p>
        </header>

        <div id="download" class="cards-grid">
            <!-- Card 1 -->
            <article
                class="card glass-clear animate-fade-in-up delay-2"
                class:mounted
            >
                <div class="card-glow card-glow-pink"></div>
                <div class="card-content">
                    <div class="card-header">
                        <h3 class="card-title accent">Exia Web</h3>
                        <span class="badge badge-outline">Instant Access</span>
                    </div>
                    <p class="card-description">
                        Rapid screening using your browser's webcam. Perfect for
                        a quick initial assessment at home.
                    </p>
                    <ul class="feature-list">
                        <li>
                            <span class="feature-icon">✦</span> No installation required
                        </li>
                        <li>
                            <span class="feature-icon">✦</span> Instant "Risk Probability"
                            score
                        </li>
                        <li>
                            <span class="feature-icon">✦</span> Standard 30fps tracking
                        </li>
                    </ul>
                    <button class="card-btn">Launch Web App</button>
                </div>
            </article>

            <!-- Card 2 - Featured -->
            <article
                class="card card-featured glass-clear animate-fade-in-up delay-3"
                class:mounted
            >
                <div class="card-glow card-glow-cyan"></div>
                <div class="card-content">
                    <div class="card-header">
                        <h3 class="card-title">Desktop Pro</h3>
                        <span class="badge badge-filled">Recommended</span>
                    </div>
                    <p class="card-description">
                        Clinical-grade precision using local hardware
                        acceleration. The standard for formal diagnosis.
                    </p>
                    <ul class="feature-list">
                        <li>
                            <span class="feature-icon cyan">✦</span> High-Fidelity
                            60Hz+ Tracking
                        </li>
                        <li>
                            <span class="feature-icon cyan">✦</span> Offline & Secure
                            Processing
                        </li>
                        <li>
                            <span class="feature-icon cyan">✦</span> Full Clinical
                            Report Generation
                        </li>
                    </ul>
                    <button class="card-btn card-btn-primary"
                        >Download Now</button
                    >
                </div>
            </article>
        </div>
    </section>

    <div class="divider"></div>

    <!-- About Section -->
    <section id="about" class="about animate-fade-in-up" class:mounted>
        <h2 class="about-title">
            Democratizing diagnosis for the
            <span class="text-gradient">1 in 5.</span>
        </h2>
        <div class="about-content">
            <p>
                Dyslexia is not a disease; it's a different way of thinking.
                Yet, millions of brilliant minds go undiagnosed because
                traditional testing is expensive, slow, and inaccessible.
            </p>
            <p>
                <strong>Exia</strong> was born from a simple question: "What if a
                standard webcam could see what a specialist sees?" By combining neuroscience
                with computer vision, we're turning every screen into a diagnostic
                tool.
            </p>
        </div>
    </section>

    <!-- Stats Section -->
    <section
        class="stats glass-clear animate-fade-in-scale delay-2"
        class:mounted
    >
        <div class="stat-item">
            <span class="stat-number">98%</span>
            <span class="stat-label">Accuracy vs. Clinical Standard</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">&lt;5 min</span>
            <span class="stat-label">Average Assessment Time</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">0</span>
            <span class="stat-label">Waiting List Time</span>
        </div>
    </section>

    <div class="divider"></div>

    <!-- Newsletter -->
    <section
        id="contact"
        class="newsletter glass-clear animate-fade-in-up"
        class:mounted
    >
        <div class="newsletter-content">
            <h3>Stay in the loop</h3>
            <p>Get updates on new features and research</p>
        </div>
        <form class="newsletter-form" on:submit={handleSubmit}>
            <input
                type="email"
                bind:value={email}
                placeholder="you@example.com"
                class="email-input"
                class:error={submitState === "error"}
            />
            <button
                type="submit"
                class="submit-btn"
                class:success={submitState === "success"}
            >
                {submitState === "success" ? "Subscribed!" : "Subscribe"}
            </button>
        </form>
    </section>
</main>

<style>
    /* Main Container */
    .main-container {
        position: relative;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: clamp(1rem, 4vw, 3rem);
        display: flex;
        flex-direction: column;
        gap: var(--space-10);
    }

    /* Clear Glass Effect - Refractive/Liquid Glass */
    .glass-clear {
        position: relative;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.02) 50%,
            rgba(255, 255, 255, 0.04) 100%
        );
        backdrop-filter: blur(12px) saturate(140%);
        -webkit-backdrop-filter: blur(12px) saturate(140%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.08),
            0 0 30px rgba(93, 228, 216, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05);
        overflow: hidden;
    }

    /* Refractive highlight overlay for glass-clear */
    .glass-clear::before {
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

    .glass-clear > * {
        position: relative;
        z-index: 1;
    }

    /* Navigation */
    .navbar {
        position: sticky;
        top: var(--space-4);
        z-index: 100;
        border-radius: var(--radius-xl);
        opacity: 0;
        transform: translateY(-20px);
        transition:
            opacity 0.6s ease,
            transform 0.6s ease,
            box-shadow 0.3s ease;
    }

    .navbar.mounted {
        opacity: 1;
        transform: translateY(0);
    }

    .navbar:hover {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    }

    .nav-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-4) var(--space-6);
        gap: var(--space-6);
    }

    .logo {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        transition: transform 0.3s ease;
    }

    .logo:hover {
        transform: scale(1.05);
    }

    .logo-icon {
        font-size: var(--text-2xl);
        color: var(--color-primary);
        animation: pulse 3s ease-in-out infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.8;
            transform: scale(1.1);
        }
    }

    .logo-text {
        font-family: var(--font-display);
        font-size: var(--text-xl);
        font-weight: var(--weight-bold);
        color: var(--color-primary);
    }

    .nav-links {
        display: flex;
        gap: var(--space-8);
    }

    .nav-link {
        font-size: var(--text-sm);
        font-weight: var(--weight-medium);
        color: var(--color-text);
        position: relative;
        transition: color 0.2s ease;
    }

    .nav-link::after {
        content: "";
        position: absolute;
        bottom: -4px;
        left: 0;
        width: 0;
        height: 2px;
        background: var(--color-primary);
        transition: width 0.3s ease;
    }

    .nav-link:hover {
        color: var(--color-primary);
    }

    .nav-link:hover::after {
        width: 100%;
    }

    .contact-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius-lg);
        font-size: var(--text-sm);
        font-weight: var(--weight-medium);
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.25),
            rgba(255, 255, 255, 0.1)
        );
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
    }

    .contact-btn:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.35),
            rgba(255, 255, 255, 0.2)
        );
    }

    /* Hero */
    .hero {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-12);
        align-items: center;
        padding: var(--space-16) 0;
    }

    .hero-content {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .hero-title {
        font-size: clamp(var(--text-3xl), 5vw, var(--text-5xl));
        font-weight: var(--weight-bold);
        line-height: 1.1;
    }

    .hero-accent {
        color: var(--color-primary);
        position: relative;
    }

    .hero-description {
        font-size: var(--text-base);
        color: var(--color-text-muted);
        max-width: 480px;
        line-height: 1.7;
    }

    .hero-cta {
        display: flex;
        gap: var(--space-4);
        margin-top: var(--space-4);
    }

    .btn-primary {
        padding: var(--space-3) var(--space-6);
        background: linear-gradient(
            135deg,
            var(--color-primary),
            var(--color-primary-light)
        );
        color: white;
        border-radius: var(--radius-lg);
        font-weight: var(--weight-semibold);
        font-size: var(--text-sm);
        transition: all 0.3s ease;
        box-shadow: 0 4px 16px rgba(232, 121, 169, 0.3);
    }

    .btn-primary:hover {
        transform: translateY(-3px) scale(1.02);
        box-shadow: 0 8px 24px rgba(232, 121, 169, 0.4);
    }

    .btn-secondary {
        padding: var(--space-3) var(--space-6);
        background: transparent;
        color: var(--color-text);
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--radius-lg);
        font-weight: var(--weight-medium);
        font-size: var(--text-sm);
        transition: all 0.3s ease;
    }

    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        border-color: rgba(0, 0, 0, 0.2);
    }

    .hero-visual {
        display: flex;
        justify-content: center;
    }

    .hero-image-wrapper {
        width: 100%;
        max-width: 400px;
        aspect-ratio: 4/3;
        border-radius: var(--radius-xl);
        overflow: hidden;
        transition: transform 0.4s ease;
    }

    .hero-image-wrapper:hover {
        transform: scale(1.02) rotate(1deg);
    }

    .hero-visual-content {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(
            135deg,
            rgba(232, 121, 169, 0.1) 0%,
            rgba(93, 228, 216, 0.1) 100%
        );
    }

    /* Eye Graphic */
    .eye-graphic {
        position: relative;
        width: 120px;
        height: 120px;
    }

    .eye-outer {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 3px solid var(--color-primary);
        opacity: 0.3;
        animation: eyePulse 2s ease-in-out infinite;
    }

    .eye-inner {
        position: absolute;
        inset: 20px;
        border-radius: 50%;
        background: linear-gradient(
            135deg,
            rgba(232, 121, 169, 0.2),
            rgba(93, 228, 216, 0.2)
        );
        border: 2px solid var(--color-secondary);
    }

    .eye-pupil {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--color-dark);
        animation: pupilMove 4s ease-in-out infinite;
    }

    .scan-line {
        position: absolute;
        top: 0;
        left: 50%;
        width: 2px;
        height: 100%;
        background: linear-gradient(
            to bottom,
            transparent,
            var(--color-secondary),
            transparent
        );
        animation: scan 2s ease-in-out infinite;
    }

    @keyframes eyePulse {
        0%,
        100% {
            transform: scale(1);
            opacity: 0.3;
        }
        50% {
            transform: scale(1.1);
            opacity: 0.5;
        }
    }

    @keyframes pupilMove {
        0%,
        100% {
            transform: translate(-50%, -50%);
        }
        25% {
            transform: translate(-40%, -45%);
        }
        50% {
            transform: translate(-50%, -55%);
        }
        75% {
            transform: translate(-60%, -50%);
        }
    }

    @keyframes scan {
        0% {
            transform: translateX(-50%) rotate(0deg);
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            transform: translateX(-50%) rotate(360deg);
            opacity: 0;
        }
    }

    /* Divider */
    .divider {
        height: 3px;
        background: linear-gradient(
            90deg,
            transparent,
            var(--color-primary-light),
            var(--color-primary),
            var(--color-secondary),
            var(--color-primary-light),
            transparent
        );
        border-radius: var(--radius-full);
        background-size: 200% 100%;
        animation: gradientShift 4s ease infinite;
    }

    /* Section Label */
    .section-label {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-4) 0;
    }

    .label-line {
        width: 24px;
        height: 2px;
        background: var(--color-primary);
    }

    .label-text {
        font-size: var(--text-xs);
        font-weight: var(--weight-semibold);
        letter-spacing: 0.15em;
        color: var(--color-text-muted);
    }

    /* Services */
    .services {
        display: flex;
        flex-direction: column;
        gap: var(--space-10);
    }

    .services-header h2 {
        font-size: clamp(var(--text-2xl), 4vw, var(--text-4xl));
        margin-bottom: var(--space-2);
    }

    .services-subtitle {
        font-size: var(--text-lg);
        font-weight: var(--weight-medium);
        color: var(--color-text);
    }

    .services-tagline {
        font-size: var(--text-base);
        color: var(--color-text-muted);
        margin-top: var(--space-2);
    }

    /* Cards */
    .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: var(--space-6);
    }

    .card {
        position: relative;
        padding: var(--space-8);
        border-radius: var(--radius-xl);
        overflow: hidden;
        transition:
            transform 0.4s ease,
            box-shadow 0.4s ease;
    }

    .card:hover {
        transform: translateY(-8px) scale(1.01);
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.1);
    }

    .card-glow {
        position: absolute;
        top: -50%;
        right: -50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0;
        transition: opacity 0.4s ease;
        pointer-events: none;
    }

    .card:hover .card-glow {
        opacity: 1;
    }

    .card-glow-pink {
        background: rgba(232, 121, 169, 0.3);
    }

    .card-glow-cyan {
        background: rgba(93, 228, 216, 0.3);
    }

    .card-content {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
    }

    .card-featured {
        border-color: rgba(93, 228, 216, 0.3);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: var(--space-3);
    }

    .card-title {
        font-size: var(--text-2xl);
        font-weight: var(--weight-bold);
        transition: color 0.3s ease;
    }

    .card:hover .card-title.accent {
        color: var(--color-primary);
    }

    .card-title.accent {
        color: var(--color-primary);
    }

    .badge {
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        font-size: var(--text-xs);
        font-weight: var(--weight-medium);
        transition: transform 0.3s ease;
    }

    .card:hover .badge {
        transform: scale(1.05);
    }

    .badge-outline {
        border: 1px solid var(--color-text-muted);
        background: rgba(255, 255, 255, 0.3);
    }

    .badge-filled {
        background: linear-gradient(
            135deg,
            var(--color-secondary) 0%,
            var(--color-secondary-light) 100%
        );
        color: var(--color-dark);
        box-shadow: 0 2px 8px rgba(93, 228, 216, 0.3);
    }

    .card-description {
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        line-height: 1.6;
    }

    .feature-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .feature-list li {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-size: var(--text-sm);
        font-weight: var(--weight-medium);
        transition: transform 0.2s ease;
    }

    .feature-list li:hover {
        transform: translateX(4px);
    }

    .feature-icon {
        color: var(--color-primary);
        font-size: var(--text-xs);
    }

    .feature-icon.cyan {
        color: var(--color-secondary);
    }

    .card-btn {
        margin-top: auto;
        padding: var(--space-3) var(--space-6);
        border-radius: var(--radius-lg);
        font-size: var(--text-sm);
        font-weight: var(--weight-semibold);
        background: rgba(255, 255, 255, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
    }

    .card-btn:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.6);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }

    .card-btn-primary {
        background: linear-gradient(
            135deg,
            var(--color-dark) 0%,
            var(--color-dark-soft) 100%
        );
        color: white;
        border: none;
    }

    .card-btn-primary:hover {
        background: linear-gradient(
            135deg,
            var(--color-dark-soft) 0%,
            var(--color-dark) 100%
        );
    }

    /* About */
    .about {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
        padding: var(--space-12) 0;
    }

    .about-title {
        font-size: clamp(var(--text-2xl), 3.5vw, var(--text-3xl));
        max-width: 600px;
    }

    .about-content {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        max-width: 800px;
    }

    .about-content p {
        font-size: var(--text-base);
        color: var(--color-text-muted);
        line-height: 1.7;
    }

    .about-content strong {
        color: var(--color-primary);
    }

    /* Stats */
    .stats {
        padding: var(--space-8);
        border-radius: var(--radius-xl);
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: var(--space-8);
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--space-2);
        transition: transform 0.3s ease;
    }

    .stat-item:hover {
        transform: scale(1.05);
    }

    .stat-number {
        font-family: var(--font-display);
        font-size: var(--text-3xl);
        font-weight: var(--weight-bold);
        background: linear-gradient(
            135deg,
            var(--color-primary),
            var(--color-secondary)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .stat-label {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
    }

    /* Newsletter */
    .newsletter {
        padding: var(--space-8);
        border-radius: var(--radius-xl);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-6);
        text-align: center;
    }

    .newsletter-content h3 {
        font-size: var(--text-lg);
        font-weight: var(--weight-semibold);
    }

    .newsletter-content p {
        font-size: var(--text-sm);
        color: var(--color-text-muted);
    }

    .newsletter-form {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
        justify-content: center;
    }

    .email-input {
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.4);
        font-size: var(--text-sm);
        min-width: 240px;
        transition: all 0.3s ease;
    }

    .email-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(232, 121, 169, 0.15);
        background: rgba(255, 255, 255, 0.6);
    }

    .email-input.error {
        border-color: #ef4444;
        animation: shake 0.4s ease;
    }

    @keyframes shake {
        0%,
        100% {
            transform: translateX(0);
        }
        25% {
            transform: translateX(-4px);
        }
        75% {
            transform: translateX(4px);
        }
    }

    .submit-btn {
        padding: var(--space-3) var(--space-6);
        background: linear-gradient(
            135deg,
            var(--color-dark) 0%,
            var(--color-dark-soft) 100%
        );
        color: white;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: var(--weight-semibold);
        transition: all 0.3s ease;
    }

    .submit-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .submit-btn.success {
        background: linear-gradient(
            135deg,
            var(--color-secondary) 0%,
            var(--color-secondary-light) 100%
        );
        color: var(--color-dark);
    }

    /* Responsive */
    @media (max-width: 768px) {
        .hero {
            grid-template-columns: 1fr;
            text-align: center;
            padding: var(--space-10) 0;
        }

        .hero-content {
            align-items: center;
        }

        .hero-description {
            text-align: center;
        }

        .hero-cta {
            justify-content: center;
        }

        .nav-links {
            display: none;
        }

        .cards-grid {
            grid-template-columns: 1fr;
        }

        .stats {
            flex-direction: column;
        }
    }
</style>
