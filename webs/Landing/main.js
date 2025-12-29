/**
 * EXIA Landing Page - Main JavaScript
 * Handles interactions, animations, and WebGL glass effects
 */

// Store glass effect instances
const glassEffects = [];

document.addEventListener('DOMContentLoaded', () => {
    initNavbarScroll();
    initSmoothScroll();
    initCardHover();
    initFormValidation();
    initGlassEffects();
    initGlassControls();
});

/**
 * Initialize WebGL Glass Effects on elements
 */
function initGlassEffects() {
    // Check if Three.js and GlassEffect are available
    if (typeof THREE === 'undefined' || typeof GlassEffect === 'undefined') {
        console.warn('Three.js or GlassEffect not loaded, falling back to CSS glass');
        return;
    }

    // Navbar glass - subtle effect
    const navbar = document.getElementById('navbar-glass');
    if (navbar) {
        const navGlass = new GlassEffect(navbar, {
            lightDirection: { x: 0.7, y: 0.3 },
            refractionLevel: 0.15,
            depth: 0.3,
            dispersion: 0.08,
            frost: 0.2
        });
        glassEffects.push({ element: navbar, instance: navGlass });
    }

    // Card 1 - light glass
    const card1 = document.getElementById('card1-glass');
    if (card1) {
        const card1Glass = new GlassEffect(card1, {
            lightDirection: { x: 0.6, y: 0.4 },
            refractionLevel: 0.25,
            depth: 0.4,
            dispersion: 0.12,
            frost: 0.15
        });
        glassEffects.push({ element: card1, instance: card1Glass });
    }

    // Card 2 - featured, more depth
    const card2 = document.getElementById('card2-glass');
    if (card2) {
        const card2Glass = new GlassEffect(card2, {
            lightDirection: { x: 0.4, y: 0.6 },
            refractionLevel: 0.3,
            depth: 0.6,
            dispersion: 0.18,
            frost: 0.1
        });
        glassEffects.push({ element: card2, instance: card2Glass });
    }

    // Stats section
    const stats = document.getElementById('stats-glass');
    if (stats) {
        const statsGlass = new GlassEffect(stats, {
            lightDirection: { x: 0.5, y: 0.5 },
            refractionLevel: 0.2,
            depth: 0.35,
            dispersion: 0.1,
            frost: 0.25
        });
        glassEffects.push({ element: stats, instance: statsGlass });
    }

    // Newsletter section
    const newsletter = document.getElementById('newsletter-glass');
    if (newsletter) {
        const newsletterGlass = new GlassEffect(newsletter, {
            lightDirection: { x: 0.3, y: 0.7 },
            refractionLevel: 0.18,
            depth: 0.3,
            dispersion: 0.1,
            frost: 0.2
        });
        glassEffects.push({ element: newsletter, instance: newsletterGlass });
    }

    console.log(`Initialized ${glassEffects.length} WebGL glass effects`);
}

/**
 * Initialize glass shader controls (press 'G' to toggle)
 */
function initGlassControls() {
    const controls = document.getElementById('glass-controls');
    if (!controls) return;

    // Toggle controls with 'G' key
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
            controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
        }
    });

    // Bind control inputs
    const lightX = document.getElementById('ctrl-lightX');
    const lightY = document.getElementById('ctrl-lightY');
    const refraction = document.getElementById('ctrl-refraction');
    const depth = document.getElementById('ctrl-depth');
    const dispersion = document.getElementById('ctrl-dispersion');
    const frost = document.getElementById('ctrl-frost');

    const updateAll = () => {
        glassEffects.forEach(({ instance }) => {
            instance.updateParams({
                lightDirection: {
                    x: parseFloat(lightX.value),
                    y: parseFloat(lightY.value)
                },
                refractionLevel: parseFloat(refraction.value),
                depth: parseFloat(depth.value),
                dispersion: parseFloat(dispersion.value),
                frost: parseFloat(frost.value)
            });
        });
    };

    [lightX, lightY, refraction, depth, dispersion, frost].forEach(input => {
        if (input) input.addEventListener('input', updateAll);
    });
}

/**
 * Navbar background opacity on scroll
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navi-bar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/**
 * Smooth scroll for navigation links
 */
function initSmoothScroll() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const text = item.textContent.trim().toLowerCase();
            let targetSection = null;

            if (text === 'services') {
                targetSection = document.querySelector('.services');
            } else if (text === 'about us') {
                targetSection = document.querySelector('.about-us');
            } else if (text === 'download') {
                targetSection = document.querySelector('.cards-area');
            }

            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Enhanced card hover effects
 */
function initCardHover() {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.01)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

/**
 * Newsletter form validation
 */
function initFormValidation() {
    const form = document.querySelector('.form-newsletter');
    const emailInput = document.querySelector('.email-input');
    const submitBtn = document.querySelector('.submit-btn');

    if (!form || !emailInput || !submitBtn) return;

    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!email) {
            showFeedback(emailInput, 'Please enter your email', 'error');
            return;
        }

        if (!isValid) {
            showFeedback(emailInput, 'Please enter a valid email', 'error');
            return;
        }

        // Success state
        submitBtn.textContent = 'Subscribed!';
        submitBtn.style.background = 'linear-gradient(135deg, #58FCEC, #40E0D0)';
        submitBtn.style.color = '#303A2B';
        emailInput.value = '';

        setTimeout(() => {
            submitBtn.textContent = 'Submit';
            submitBtn.style.background = '';
            submitBtn.style.color = '';
        }, 3000);
    });
}

/**
 * Show form feedback
 */
function showFeedback(input, message, type) {
    input.style.borderColor = type === 'error' ? '#FF6B6B' : '#58FCEC';
    input.placeholder = message;
    input.value = '';

    setTimeout(() => {
        input.style.borderColor = '';
        input.placeholder = 'you@example.com';
    }, 2500);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    glassEffects.forEach(({ instance }) => instance.destroy());
});
