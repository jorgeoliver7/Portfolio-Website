document.addEventListener('DOMContentLoaded', function () {

    // ── Tema claro/oscuro ──────────────────────────────────────────────────────
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function updateThemeIcon(theme) {
        if (!themeToggle) return;
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            const current = body.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            body.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateThemeIcon(next);
        });
    }

    // ── Menú hamburguesa ──────────────────────────────────────────────────────
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function () {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }

    // ── Smooth scrolling ──────────────────────────────────────────────────────
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ── Animaciones al scroll ─────────────────────────────────────────────────
    if (!prefersReducedMotion) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll(
            '.section-title, .project-card, .skill-category, .about-card, .soft-skill-item, .contact-info'
        ).forEach((el, i) => {
            el.classList.add('animate-on-scroll');
            el.style.transitionDelay = `${i * 0.05}s`;
            observer.observe(el);
        });

        document.querySelectorAll('.about-text, .hero-content').forEach(el => {
            el.classList.add('animate-slide-left');
            observer.observe(el);
        });

        document.querySelectorAll('.about-image, .hero-image').forEach(el => {
            el.classList.add('animate-slide-right');
            observer.observe(el);
        });

        document.querySelectorAll('.profile-photo, .stat').forEach(el => {
            el.classList.add('animate-scale');
            observer.observe(el);
        });
    }

    // ── Contadores animados (métricas) ────────────────────────────────────────
    const metricNumbers = document.querySelectorAll('.metric-number');
    const metricsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'), 10);
                if (!isNaN(target)) animateCounter(entry.target, target);
                metricsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    metricNumbers.forEach(el => metricsObserver.observe(el));

    // ── Filtros de proyectos ──────────────────────────────────────────────────
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');

            projectCards.forEach(card => {
                const match = filter === 'all' || card.getAttribute('data-category') === filter;
                if (match) {
                    card.style.display = 'block';
                    card.classList.remove('card-hidden');
                } else {
                    card.classList.add('card-hidden');
                    setTimeout(() => {
                        if (card.classList.contains('card-hidden')) card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    // ── Formulario de contacto ────────────────────────────────────────────────
    emailjs.init({ publicKey: "kyFzQFk61mcbcSSrQ" });

    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = this.name.value.trim();
            const email = this.email.value.trim();
            const subject = this.subject.value.trim();
            const message = this.message.value.trim();

            if (!name || !email || !subject || !message) {
                showNotification('Por favor, rellena todos los campos.', 'error');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showNotification('Introduce un email válido.', 'error');
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;

            emailjs.send(
                'service_l1jb4ws',
                'template_2ks43wf',
                { from_name: name, from_email: email, subject, message, to_name: 'Jorge Acedo' }
            )
            .then(() => {
                showNotification('¡Mensaje enviado! Te responderé pronto.', 'success');
                contactForm.reset();
            })
            .catch((err) => {
                console.error('EmailJS error:', JSON.stringify(err));
                showNotification('Error al enviar. Contáctame directamente por email.', 'error');
            })
            .finally(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
        });
    }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function animateCounter(element, target) {
    const duration = 2000;
    const steps = 100;
    const increment = target / steps;
    const stepTime = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = target >= 1000
            ? Math.floor(current).toLocaleString()
            : Math.floor(current);
    }, stepTime);
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.add('notification-visible');
    });

    setTimeout(() => {
        notification.classList.remove('notification-visible');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}
