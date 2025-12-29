<script lang="ts">
    export let userName: string = "Jane doe";
    export let userAge: number = 120;
    export let sessionId: string = "#EX-2025-8492";
    export let avatarUrl: string = "";
    export let isLive: boolean = true;
</script>

<header class="user-header glass-panel">
    <div class="user-info">
        <div class="avatar">
            {#if avatarUrl}
                <img src={avatarUrl} alt={userName} />
            {:else}
                <div class="avatar-placeholder">
                    {userName.charAt(0).toUpperCase()}
                </div>
            {/if}
        </div>
        <div class="user-details">
            <div class="name-row">
                <span class="name">{userName}</span>
                <span class="age-badge">AGE {userAge}</span>
            </div>
            <span class="session-id">SESSION: {sessionId}</span>
        </div>
    </div>

    <div class="header-actions">
        {#if isLive}
            <div class="live-indicator">
                <span class="live-dot"></span>
                <span class="live-text">LIVE ANALYSIS</span>
            </div>
        {/if}
        <button class="print-btn" aria-label="Print report">
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <path
                    d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"
                />
                <rect x="6" y="14" width="12" height="8" />
            </svg>
        </button>
    </div>
</header>

<style>
    .user-header {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-4) var(--space-6);

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
    }

    /* Refractive highlight overlay */
    .user-header::before {
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

    .user-info {
        display: flex;
        align-items: center;
        gap: var(--space-3);
    }

    .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid rgba(255, 255, 255, 0.5);
    }

    .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(
            135deg,
            var(--color-primary),
            var(--color-secondary)
        );
        color: white;
        font-weight: var(--weight-bold);
        font-size: var(--text-lg);
    }

    .user-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .name-row {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .name {
        font-weight: var(--weight-semibold);
        color: var(--color-dark);
    }

    .age-badge {
        padding: 2px 8px;
        background: var(--color-secondary);
        color: var(--color-dark);
        font-size: var(--text-xs);
        font-weight: var(--weight-semibold);
        border-radius: var(--radius-full);
    }

    .session-id {
        font-size: var(--text-xs);
        color: var(--color-text-muted);
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: var(--space-4);
    }

    .live-indicator {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        background: rgba(239, 68, 68, 0.1);
        border-radius: var(--radius-full);
    }

    .live-dot {
        width: 8px;
        height: 8px;
        background: #ef4444;
        border-radius: 50%;
        animation: pulse-live 1.5s ease-in-out infinite;
    }

    @keyframes pulse-live {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.6;
            transform: scale(1.1);
        }
    }

    .live-text {
        font-size: var(--text-xs);
        font-weight: var(--weight-semibold);
        color: #ef4444;
        letter-spacing: 0.05em;
    }

    .print-btn {
        padding: var(--space-2);
        background: rgba(255, 255, 255, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: var(--radius-md);
        color: var(--color-text);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .print-btn:hover {
        background: rgba(255, 255, 255, 0.5);
        transform: translateY(-1px);
    }
</style>
