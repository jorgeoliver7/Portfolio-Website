(function () {
  const A = window.PORTFOLIO_DATA || {};
  const CFG = window.PORTFOLIO_CONFIG || {};

  // ── THEME ─────────────────────────────────────────────────────────────────
  const root    = document.querySelector('.a-root');
  const toggle  = document.getElementById('theme-toggle');
  let theme     = localStorage.getItem('a-theme') || 'dark';

  function applyTheme(t) {
    theme = t;
    if (!root) return;
    root.classList.toggle('a-theme-light', t === 'light');
    document.documentElement.style.background = t === 'dark' ? '#0e1116' : '#f3efe6';
    if (toggle) toggle.textContent = t === 'dark' ? '◐' : '◑';
  }

  applyTheme(theme);

  if (toggle) {
    toggle.addEventListener('click', function () {
      const next = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('a-theme', next);
      applyTheme(next);
      toggle.classList.add('is-spinning');
      setTimeout(function () { toggle.classList.remove('is-spinning'); }, 400);
    });
  }

  // ── MOTION ────────────────────────────────────────────────────────────────
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = typeof IntersectionObserver !== 'undefined';

  const revealObserver = hasIO ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;

  const tlObserver = hasIO ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      tlObserver.unobserve(entry.target);
    });
  }, { threshold: 0.25 }) : null;

  function observeReveals(root) {
    if (!hasIO) {
      (root || document).querySelectorAll('.a-reveal, .a-reveal-scale, .a-tl-row, .a-lang-row').forEach(showVisible);
      return;
    }
    var scope = root || document;
    scope.querySelectorAll('.a-reveal:not(.is-visible), .a-reveal-scale:not(.is-visible), .a-reveal-left:not(.is-visible)').forEach(function (el) {
      revealObserver.observe(el);
    });
    scope.querySelectorAll('.a-tl-row:not(.is-visible)').forEach(function (el) {
      tlObserver.observe(el);
    });
    scope.querySelectorAll('.a-lang-row:not(.is-visible)').forEach(function (el) {
      tlObserver.observe(el);
    });
  }

  function showVisible(el) {
    if (el) el.classList.add('is-visible');
  }

  function animateCounter(el, text) {
    var match = String(text).match(/^(\d+)(.*)$/);
    if (!match || reducedMotion) {
      el.textContent = text;
      return;
    }
    var target = parseInt(match[1], 10);
    var suffix = match[2];
    var start = performance.now();
    var duration = 1100;
    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function animateMiniBars(container, heights) {
    if (!container) return;
    var bars = container.querySelectorAll('span');
    bars.forEach(function (bar, i) {
      var h = heights[i] || 50;
      bar.style.setProperty('--h', h + '%');
      if (reducedMotion) {
        bar.style.height = h + '%';
        return;
      }
      setTimeout(function () {
        bar.style.height = h + '%';
      }, 80 + i * 45);
    });
    container.classList.add('is-animated');
  }

  function initHeroMotion() {
    var frame = document.getElementById('hero-frame');
    var heroText = document.getElementById('hero-text');
    var typeEl = document.getElementById('hero-type');
    var eyebrow = typeEl && typeEl.closest('.a-hero-eyebrow');
    var portrait = document.getElementById('hero-portrait');
    var typeText = '◷ Software Developer × Data Analyst';

    if (!reducedMotion) {
      var portraitEl = document.querySelector('.a-hero-portrait.a-reveal-scale');
      if (portraitEl) {
        setTimeout(function () { showVisible(portraitEl); }, 120);
      }
    } else {
      document.querySelectorAll('.a-hero-main .a-reveal-scale').forEach(showVisible);
    }

    function startTextSequence() {
      if (!heroText || heroText.classList.contains('is-go')) return;
      heroText.classList.add('is-go');
      setTimeout(function () {
        heroText.classList.add('is-ready');
      }, 2200);
    }

    function forceHeroTextFallback() {
      if (frame) frame.classList.add('is-live');
      if (typeEl && !typeEl.textContent) typeEl.textContent = typeText;
      if (eyebrow) eyebrow.classList.add('is-typed');
      startTextSequence();
    }

    if (reducedMotion) {
      forceHeroTextFallback();
      return;
    }

    setTimeout(function () {
      if (frame) frame.classList.add('is-live');
    }, 80);

    if (typeEl && eyebrow) {
      setTimeout(function () {
        var i = 0;
        function typeChar() {
          if (i <= typeText.length) {
            typeEl.textContent = typeText.slice(0, i);
            i += 1;
            setTimeout(typeChar, i === 1 ? 0 : 26 + Math.random() * 16);
          } else {
            eyebrow.classList.add('is-typed');
            setTimeout(startTextSequence, 180);
          }
        }
        typeChar();
      }, 320);
    } else {
      setTimeout(startTextSequence, 400);
    }

    setTimeout(forceHeroTextFallback, 3000);

    if (portrait && window.matchMedia('(pointer: fine)').matches) {
      var portraitWrap = portrait.closest('.a-hero-portrait');
      var heroMain = portrait.closest('.a-hero-main');
      if (heroMain && portraitWrap) {
        heroMain.addEventListener('mousemove', function (e) {
          var rect = heroMain.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width - 0.5;
          var y = (e.clientY - rect.top) / rect.height - 0.5;
          portraitWrap.style.transform = 'translate(' + (x * 12).toFixed(1) + 'px,' + (y * 10).toFixed(1) + 'px)';
          var img = portrait.querySelector('img');
          if (img) img.style.transform = 'scale(1.05) translate(' + (x * -5).toFixed(1) + 'px,' + (y * -4).toFixed(1) + 'px)';
        });
        heroMain.addEventListener('mouseleave', function () {
          portraitWrap.style.transform = '';
          var img = portrait.querySelector('img');
          if (img) img.style.transform = '';
        });
      }
    }
  }

  function markSectionReveals() {
    document.querySelectorAll('.a-section-head').forEach(function (el) {
      el.classList.add('a-reveal');
    });
    document.querySelectorAll('.a-about-text, .a-disc-card').forEach(function (el, i) {
      el.classList.add('a-reveal');
      el.style.setProperty('--d', i % 4);
    });
    document.querySelectorAll('.a-skill-block, .a-edu-row').forEach(function (el, i) {
      el.classList.add('a-reveal');
      el.style.setProperty('--d', i % 4);
    });
    document.querySelectorAll('.a-contact-info, .a-contact-form').forEach(function (el, i) {
      el.classList.add('a-reveal');
      el.style.setProperty('--d', i);
    });
  }

  markSectionReveals();
  initHeroMotion();

  // ── MOBILE NAV ────────────────────────────────────────────────────────────
  const menuBtn   = document.getElementById('nav-menu-btn');
  const mobileNav = document.getElementById('nav-mobile');
  let menuOpen = false;

  function setMenuOpen(open) {
    menuOpen = open;
    if (menuBtn) {
      menuBtn.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }
    if (mobileNav) {
      mobileNav.classList.toggle('is-open', open);
      mobileNav.toggleAttribute('hidden', !open);
      mobileNav.setAttribute('aria-hidden', String(!open));
    }
    document.body.classList.toggle('a-nav-open', open);
  }

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      if (window.innerWidth > 900) return;
      setMenuOpen(!menuOpen);
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setMenuOpen(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) setMenuOpen(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) {
        if (menuOpen) setMenuOpen(false);
        mobileNav.setAttribute('hidden', '');
        mobileNav.classList.remove('is-open');
      }
    });
  }

  // ── HERO STRIP ────────────────────────────────────────────────────────────
  const heroStrip = document.getElementById('hero-strip');
  const barHeights = [42, 28, 58, 36, 70, 52, 44, 64, 48, 74, 60, 52];
  if (heroStrip) {
    heroStrip.innerHTML =
      (A.stats || []).map(function (s, i) {
        return '<div class="a-strip-item a-reveal" style="--d:' + i + '">' +
          '<div class="a-strip-value" data-count="' + s.value + '">0</div>' +
          '<div class="a-strip-label">' + s.label + '</div></div>';
      }).join('') +
      '<div class="a-strip-item a-strip-chart a-reveal" style="--d:4">' +
        '<div class="a-strip-label">stack split</div>' +
        '<div class="a-mini-bars" aria-hidden="true">' +
          barHeights.map(function (h) { return '<span data-h="' + h + '"></span>'; }).join('') +
        '</div></div>';

    heroStrip.classList.add('a-reveal');
    if (hasIO) {
      var stripObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll('.a-strip-value[data-count]').forEach(function (el) {
            animateCounter(el, el.dataset.count);
          });
          var bars = entry.target.querySelector('.a-mini-bars');
          if (bars) animateMiniBars(bars, barHeights);
          entry.target.querySelectorAll('.a-reveal').forEach(showVisible);
          showVisible(entry.target);
          stripObserver.unobserve(entry.target);
        });
      }, { threshold: 0.3 });
      stripObserver.observe(heroStrip);
    } else {
      heroStrip.querySelectorAll('.a-strip-value[data-count]').forEach(function (el) {
        animateCounter(el, el.dataset.count);
      });
      var bars = heroStrip.querySelector('.a-mini-bars');
      if (bars) animateMiniBars(bars, barHeights);
      showVisible(heroStrip);
    }
  }

  // ── PROJECTS ──────────────────────────────────────────────────────────────
  const FILTERS = [
    { id: 'all',       label: 'Todos' },
    { id: 'fullstack', label: 'Full Stack' },
    { id: 'frontend',  label: 'Frontend' },
    { id: 'backend',   label: 'Backend' },
    { id: 'data',      label: 'Datos & IA' },
  ];

  const filtersEl = document.getElementById('project-filters');
  const gridEl    = document.getElementById('projects-grid');
  const countEl   = document.getElementById('projects-count');
  let activeFilter = 'all';

  function catLabel(id) {
    return (FILTERS.find(f => f.id === id) || {}).label || id;
  }

  function renderFilters() {
    if (!filtersEl) return;
    filtersEl.innerHTML = FILTERS.map(f => {
      const n = f.id === 'all'
        ? A.projects.length
        : A.projects.filter(p => p.category === f.id).length;
      return `<button class="a-filter${f.id === activeFilter ? ' is-active' : ''}" data-filter="${f.id}">
        ${f.label}<span class="a-mono a-filter-count">${n}</span>
      </button>`;
    }).join('');

    filtersEl.querySelectorAll('.a-filter').forEach(btn => {
      btn.addEventListener('click', function () {
        activeFilter = this.dataset.filter;
        renderFilters();
        renderProjects(true);
      });
    });
  }

  function projectLinks(p) {
    var links = [];
    if (p.repo) {
      links.push(
        '<a class="a-project-link" href="' + p.repo + '" target="_blank" rel="noopener">repo ↗</a>'
      );
    }
    if (p.live) {
      links.push(
        '<a class="a-project-link" href="https://' + p.live + '" target="_blank" rel="noopener">visitar ↗</a>'
      );
    }
    return links.length
      ? '<div class="a-project-actions">' + links.join('') + '</div>'
      : '';
  }

  function renderProjects(animate) {
    if (!gridEl) return;
    const list = activeFilter === 'all'
      ? A.projects
      : A.projects.filter(p => p.category === activeFilter);

    function paint() {
      gridEl.innerHTML = list.map(function (p, i) {
        return '<article class="a-project a-reveal" style="--d:' + (i % 6) + '">' +
          '<div class="a-project-head">' +
            '<span class="a-mono a-project-id">' + String(p.id).padStart(2, '0') + '</span>' +
            '<span class="a-mono a-project-year">' + p.year + '</span>' +
          '</div>' +
          '<h3 class="a-project-title">' + p.name + '</h3>' +
          '<p class="a-project-desc">' + p.desc + '</p>' +
          '<div class="a-project-stack">' +
            p.stack.map(function (s) { return '<span class="a-chip">' + s + '</span>'; }).join('') +
          '</div>' +
          '<div class="a-project-footer">' +
            '<span class="a-cat a-cat-' + p.category + '">' + catLabel(p.category) + '</span>' +
            projectLinks(p) +
          '</div></article>';
      }).join('');
      gridEl.classList.remove('is-filtering');
      observeReveals(gridEl);
    }

    if (animate && !reducedMotion) {
      gridEl.classList.add('is-filtering');
      setTimeout(paint, 220);
    } else {
      paint();
    }
  }

  if (countEl) countEl.textContent = `${A.projects.length} ENVÍOS`;
  renderFilters();
  renderProjects();

  // ── EXPERIENCE ────────────────────────────────────────────────────────────
  const timeline = document.getElementById('timeline');
  if (timeline) {
    timeline.innerHTML = A.experience.map(function (e, i) {
      return '<div class="a-tl-row">' +
        '<div class="a-tl-period a-mono">' + e.period + '</div>' +
        '<div class="a-tl-line"><span class="a-tl-dot"></span></div>' +
        '<div class="a-tl-body">' +
          '<div class="a-tl-company">' + e.company + '</div>' +
          '<h3 class="a-tl-role">' + e.role + '</h3>' +
          '<p class="a-tl-desc">' + e.desc + '</p>' +
          '<div class="a-tl-tags">' +
            e.tags.map(function (t) { return '<span class="a-chip a-chip-soft">' + t + '</span>'; }).join('') +
          '</div></div></div>';
    }).join('');
  }

  // ── SKILLS ────────────────────────────────────────────────────────────────
  const skillsGrid = document.getElementById('skills-grid');
  const BLOCKS = [
    { title: 'Frontend',          items: A.stack.frontend, accent: 'var(--a-accent)'   },
    { title: 'Backend',           items: A.stack.backend,  accent: 'var(--a-accent)'   },
    { title: 'Análisis de Datos', items: A.stack.data,     accent: 'var(--a-accent-2)' },
    { title: 'Herramientas',      items: A.stack.tools,    accent: 'var(--a-accent-2)' },
  ];

  if (skillsGrid) {
    skillsGrid.innerHTML = BLOCKS.map(b => `
      <div class="a-skill-block">
        <h4>${b.title}</h4>
        <div class="a-stack">
          ${b.items.map(it => `
            <div class="a-stack-row">
              <div class="a-stack-name">${it.name}</div>
              <div class="a-stack-track">
                <div class="a-stack-fill" data-w="${it.level}" style="background:${b.accent}"></div>
              </div>
              <div class="a-stack-val a-mono">${it.level}</div>
            </div>`).join('')}
        </div>
      </div>`).join('');

    if (hasIO) {
      const barObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.width = entry.target.dataset.w + '%';
            barObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      skillsGrid.querySelectorAll('.a-stack-fill').forEach(el => barObserver.observe(el));
    } else {
      skillsGrid.querySelectorAll('.a-stack-fill').forEach(function (el) {
        el.style.width = el.dataset.w + '%';
      });
    }
  }

  // ── EDUCATION ─────────────────────────────────────────────────────────────
  const eduList = document.getElementById('edu-list');
  if (eduList) {
    eduList.innerHTML = A.education.map(e => `
      <div class="a-edu-row">
        <div class="a-edu-status a-mono">
          <span class="a-edu-pill ${e.status === 'Completado' ? 'a-edu-pill-done' : 'a-edu-pill-ongoing'}">${e.status}</span>
          <span class="a-edu-year">${e.year}</span>
        </div>
        <div>
          <h3 class="a-edu-title">${e.title}</h3>
          <div class="a-edu-inst">${e.institution}</div>
          <p class="a-edu-desc">${e.desc}</p>
        </div>
      </div>`).join('');
  }

  // ── LANGUAGES ─────────────────────────────────────────────────────────────
  const langsEl = document.getElementById('langs');
  if (langsEl) {
    langsEl.innerHTML =
      `<div class="a-langs-head a-mono">IDIOMAS</div>` +
      A.languages.map(function (l) {
        return '<div class="a-lang-row" style="--w:' + l.pct + '%">' +
          '<span>' + l.name + '</span>' +
          '<span class="a-lang-track"><span></span></span>' +
          '<span class="a-mono a-lang-level">' + l.level + '</span></div>';
      }).join('');
  }

  // ── CONTACT LIST ──────────────────────────────────────────────────────────
  const contactList = document.getElementById('contact-list');
  if (contactList) {
    contactList.innerHTML = `
      <li><span class="a-mono">email</span><a href="mailto:${A.email}">${A.email}</a></li>
      <li><span class="a-mono">tel</span><a href="tel:${A.phone.replace(/\s/g,'')}">${A.phone}</a></li>
      <li><span class="a-mono">loc</span><span>${A.location}</span></li>
      <li><span class="a-mono">in</span><a href="${A.linkedin}" target="_blank" rel="noopener">linkedin.com/in/jorgeacedooliver</a></li>
      <li><span class="a-mono">git</span><a href="${A.github}" target="_blank" rel="noopener">github.com/jorgeoliver7</a></li>`;
  }

  // ── CONTACT FORM (Web3Forms) ──────────────────────────────────────────────
  const form = document.getElementById('contact-form');
  const RATE_LIMIT_MS = 60000;

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const honeypot = form.querySelector('[name="website"]').value.trim();
      const botcheck = form.querySelector('[name="botcheck"]').checked;
      if (honeypot || botcheck) return;

      const lastSent = parseInt(sessionStorage.getItem('a-form-sent') || '0', 10);
      if (Date.now() - lastSent < RATE_LIMIT_MS) {
        showToast('Espera un momento antes de enviar otro mensaje.', 'error');
        return;
      }

      const name    = form.querySelector('[name="name"]').value.trim();
      const email   = form.querySelector('[name="email"]').value.trim();
      const message = form.querySelector('[name="message"]').value.trim();

      if (!name || !email || !message) {
        showToast('Por favor, rellena todos los campos.', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Introduce un email válido.', 'error');
        return;
      }

      const accessKey = CFG.web3formsKey;
      if (!accessKey) {
        showToast('Formulario no configurado. Escríbeme directamente por email.', 'error');
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const saved = btn.innerHTML;
      btn.textContent = 'Enviando…';
      btn.disabled = true;

      try {
        const res  = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: accessKey,
            name, email, message,
            subject: `Portfolio · mensaje de ${name}`,
            from_name: 'Portfolio Jorge Acedo',
            botcheck: false,
          })
        });
        const data = await res.json();
        if (data.success) {
          sessionStorage.setItem('a-form-sent', String(Date.now()));
          showToast('¡Mensaje enviado! Te responderé pronto.', 'success');
          form.reset();
        } else {
          throw new Error(data.message);
        }
      } catch (err) {
        console.error('Web3Forms:', err);
        showToast('Error al enviar. Escríbeme directamente por email.', 'error');
      } finally {
        btn.innerHTML = saved;
        btn.disabled  = false;
      }
    });
  }

  // ── TOAST ─────────────────────────────────────────────────────────────────
  function showToast(msg, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className   = `a-toast a-toast-${type} a-toast-show`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('a-toast-show'), 4500);
  }

  observeReveals();

  if (reducedMotion) {
    document.querySelectorAll('.a-reveal, .a-reveal-scale, .a-tl-row, .a-lang-row').forEach(showVisible);
    if (heroStrip) {
      heroStrip.querySelectorAll('.a-strip-value[data-count]').forEach(function (el) {
        el.textContent = el.dataset.count;
      });
      var bars = heroStrip.querySelector('.a-mini-bars');
      if (bars) animateMiniBars(bars, barHeights);
    }
  }

})();
