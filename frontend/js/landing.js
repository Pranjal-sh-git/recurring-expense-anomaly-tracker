/**
 * landing.js — Landing Page Scroll Reveals, Sticky Navbar, and In-Page Routing
 *
 * Handles:
 *   - Sticky navbar blur and shadow on scroll
 *   - IntersectionObserver for smooth scroll reveals
 *   - In-page smooth anchor scrolling
 *   - CTA button triggers to launch the ExpenseTrack dashboard
 */

import { showDashboard, showLandingPage } from './ui/navigation.js';

export function initLandingPage() {
    _initStickyNavbar();
    _initScrollReveals();
    _initSmoothAnchors();
    _initDashboardTriggers();
}

/**
 * Handle sticky navbar style change on scroll
 */
function _initStickyNavbar() {
    const navbar = document.getElementById('landing-navbar');
    if (!navbar) return;

    const handleScroll = () => {
        if (window.scrollY > 20) {
            navbar.classList.add('landing-navbar--scrolled');
        } else {
            navbar.classList.remove('landing-navbar--scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
}

/**
 * Scroll reveal observer for elements with .reveal-on-scroll
 */
function _initScrollReveals() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (!revealElements.length) return;

    if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers
        revealElements.forEach(el => el.classList.add('revealed'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Unobserve after revealing once
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
}

/**
 * Smooth anchor scrolling for navbar and hero secondary buttons
 */
function _initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#landing' || targetId === '#') {
                e.preventDefault();
                showLandingPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            if (targetId.startsWith('#features') || targetId.startsWith('#how-it-works') || targetId.startsWith('#why') || targetId.startsWith('#pricing')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

/**
 * Bind all "Explore Dashboard" / "Go to Dashboard" CTA buttons
 */
function _initDashboardTriggers() {
    const triggerIds = [
        'btn-landing-nav-explore',
        'btn-hero-explore-dashboard',
        'btn-dark-cta-explore'
    ];

    triggerIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showDashboard('overview');
            });
        }
    });
}
