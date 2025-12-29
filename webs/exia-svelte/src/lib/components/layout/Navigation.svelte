<script lang="ts">
    import { page } from "$app/stores";

    interface NavLink {
        href: string;
        label: string;
    }

    const navLinks: NavLink[] = [
        { href: "/", label: "Landing" },
        { href: "/diagnose", label: "Diagnostic" },
        { href: "/viewer", label: "Viewer" },
    ];
</script>

<nav class="main-nav glass-refract">
    <div class="nav-brand">
        <a href="/" class="logo">
            <span class="logo-icon">◈</span>
            <span class="logo-text">Exia</span>
        </a>
    </div>

    <div class="nav-links">
        {#each navLinks as link}
            <a
                href={link.href}
                class="nav-link"
                class:active={$page.url.pathname === link.href}
            >
                {link.label}
            </a>
        {/each}
    </div>
</nav>

<style>
    .main-nav {
        position: fixed;
        bottom: var(--space-6);
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        display: flex;
        align-items: center;
        gap: var(--space-6);
        padding: var(--space-3) var(--space-6);

        /* Refractive glass */
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08) 0%,
            rgba(255, 255, 255, 0.03) 50%,
            rgba(255, 255, 255, 0.06) 100%
        );
        backdrop-filter: blur(16px) saturate(150%);
        -webkit-backdrop-filter: blur(16px) saturate(150%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: var(--radius-full);

        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 0 40px rgba(93, 228, 216, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .nav-brand {
        display: flex;
        align-items: center;
    }

    .logo {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        text-decoration: none;
        transition: transform 0.3s ease;
    }

    .logo:hover {
        transform: scale(1.05);
    }

    .logo-icon {
        font-size: var(--text-xl);
        color: var(--color-primary);
    }

    .logo-text {
        font-family: var(--font-display);
        font-size: var(--text-lg);
        font-weight: var(--weight-bold);
        color: var(--color-primary);
    }

    .nav-links {
        display: flex;
        align-items: center;
        gap: var(--space-1);
    }

    .nav-link {
        padding: var(--space-2) var(--space-4);
        font-size: var(--text-sm);
        font-weight: var(--weight-medium);
        color: var(--color-text);
        text-decoration: none;
        border-radius: var(--radius-lg);
        transition: all 0.2s ease;
    }

    .nav-link:hover {
        background: rgba(255, 255, 255, 0.15);
        color: var(--color-primary);
    }

    .nav-link.active {
        background: linear-gradient(
            135deg,
            rgba(232, 121, 169, 0.2) 0%,
            rgba(93, 228, 216, 0.15) 100%
        );
        color: var(--color-primary);
        font-weight: var(--weight-semibold);
    }

    /* Dark theme variant for viewer page */
    :global(body.dark-theme) .main-nav {
        background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.4) 0%,
            rgba(0, 0, 0, 0.2) 50%,
            rgba(0, 0, 0, 0.3) 100%
        );
        border-color: rgba(255, 255, 255, 0.1);
    }

    :global(body.dark-theme) .nav-link {
        color: rgba(255, 255, 255, 0.7);
    }

    :global(body.dark-theme) .nav-link:hover,
    :global(body.dark-theme) .nav-link.active {
        color: #58fcec;
    }

    :global(body.dark-theme) .logo-text,
    :global(body.dark-theme) .logo-icon {
        color: #58fcec;
    }
</style>
