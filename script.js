// Funcionalidad del modo noche
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Verificar si hay un tema guardado en localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
    }
    
    // Función para cambiar el tema
    function toggleTheme() {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    // Event listener para el botón de toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Smooth scrolling para los enlaces de navegación
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Animaciones de scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Elementos que se animan al hacer scroll
    const animateElements = document.querySelectorAll(
        '.section-title, .project-card, .skill-category, .about-card, .soft-skill-item, .contact-info'
    );
    
    animateElements.forEach((el, index) => {
        // Añadir clases de animación con delay escalonado
        el.classList.add('animate-on-scroll');
        el.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(el);
    });
    
    // Animaciones especiales para elementos específicos
    const leftElements = document.querySelectorAll('.about-text, .hero-content');
    leftElements.forEach(el => {
        el.classList.add('animate-slide-left');
        observer.observe(el);
    });
    
    const rightElements = document.querySelectorAll('.about-image, .hero-image');
    rightElements.forEach(el => {
        el.classList.add('animate-slide-right');
        observer.observe(el);
    });
    
    const scaleElements = document.querySelectorAll('.profile-photo, .stat');
    scaleElements.forEach(el => {
        el.classList.add('animate-scale');
        observer.observe(el);
    });
    
    // Animación de contadores para métricas
    const metricNumbers = document.querySelectorAll('.metric-number');
    const metricsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                animateCounter(entry.target, target);
                metricsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    metricNumbers.forEach(number => {
        metricsObserver.observe(number);
    });
});

// Función para animar contadores
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const duration = 2000; // 2 segundos
    const stepTime = duration / 100;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        // Formatear números grandes
        let displayValue;
        if (target >= 1000) {
            displayValue = Math.floor(current).toLocaleString();
        } else {
            displayValue = Math.floor(current);
        }
        
        element.textContent = displayValue;
    }, stepTime);
}

// Filtros de proyectos
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover clase active de todos los botones
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Añadir clase active al botón clickeado
            button.classList.add('active');
            
            const filterValue = button.getAttribute('data-filter');
            
            projectCards.forEach(card => {
                if (filterValue === 'all') {
                    card.style.display = 'block';
                    card.style.animation = 'fadeInUp 0.5s ease forwards';
                } else {
                    const cardCategory = card.getAttribute('data-category');
                    if (cardCategory === filterValue) {
                        card.style.display = 'block';
                        card.style.animation = 'fadeInUp 0.5s ease forwards';
                    } else {
                        card.style.animation = 'fadeOut 0.3s ease forwards';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                }
            });
        });
    });
});

// Animaciones para filtros
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// Inicializar EmailJS
(function() {
    emailjs.init({
        publicKey: "kyFzQFk61mcbcSSrQ", // Tu Public Key real
    });
})();

// Manejar envío del formulario de contacto
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Mostrar estado de carga
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;
            
            // Configurar parámetros del template
            const templateParams = {
                from_name: this.name.value,
                from_email: this.email.value,
                subject: this.subject.value,
                message: this.message.value,
                to_name: 'Jorge Acedo', // Tu nombre
            };
            
            // Enviar email usando EmailJS
            emailjs.send(
                'service_l1jb4ws', // Tu Service ID real
                'template_2ks43wf', // Tu Template ID real
                templateParams
            )
            .then(function(response) {
                console.log('Email enviado exitosamente:', response);
                
                // Mostrar mensaje de éxito
                showNotification('¡Mensaje enviado exitosamente! Te responderé pronto.', 'success');
                
                // Limpiar formulario
                contactForm.reset();
                
            }, function(error) {
                console.error('Error al enviar email:', error);
                
                // Mostrar mensaje de error
                showNotification('Error al enviar el mensaje. Por favor, inténtalo de nuevo o contáctame directamente.', 'error');
            })
            .finally(function() {
                // Restaurar botón
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
        });
    }
});

// Función para mostrar notificaciones
function showNotification(message, type) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: linear-gradient(135deg, #4CAF50, #45a049);' : 'background: linear-gradient(135deg, #f44336, #da190b);'}
    `;
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}