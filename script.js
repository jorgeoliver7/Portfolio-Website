(function () {
  const A = window.PORTFOLIO_DATA;

  // ── THEME ─────────────────────────────────────────────────────────────────
  const root    = document.querySelector('.a-root');
  const toggle  = document.getElementById('theme-toggle');
  let theme     = localStorage.getItem('a-theme') || 'dark';

  applyTheme(theme);

  function applyTheme(t) {
    theme = t;
    root.classList.toggle('a-theme-light', t === 'light');
    document.documentElement.style.background = t === 'dark' ? '#0e1116' : '#f3efe6';
    if (toggle) toggle.textContent = t === 'dark' ? '◐' : '◑';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      const next = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('a-theme', next);
      applyTheme(next);
    });
  }

  // ── HERO STRIP ────────────────────────────────────────────────────────────
  const heroStrip = document.getElementById('hero-strip');
  if (heroStrip) {
    const barHeights = [42, 28, 58, 36, 70, 52, 44, 64, 48, 74, 60, 52];
    heroStrip.innerHTML =
      A.stats.map(s => `
        <div class="a-strip-item">
          <div class="a-strip-value">${s.value}</div>
          <div class="a-strip-label">${s.label}</div>
        </div>`).join('') +
      `<div class="a-strip-item a-strip-chart">
         <div class="a-strip-label">stack split</div>
         <div class="a-mini-bars" aria-hidden="true">
           ${barHeights.map(h => `<span style="height:${h}%"></span>`).join('')}
         </div>
       </div>`;
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
        renderProjects();
      });
    });
  }

  function renderProjects() {
    if (!gridEl) return;
    const list = activeFilter === 'all'
      ? A.projects
      : A.projects.filter(p => p.category === activeFilter);

    gridEl.innerHTML = list.map(p => `
      <article class="a-project">
        <div class="a-project-head">
          <span class="a-mono a-project-id">${String(p.id).padStart(2, '0')}</span>
          <span class="a-mono a-project-year">${p.year}</span>
        </div>
        <h3 class="a-project-title">${p.name}</h3>
        <p class="a-project-desc">${p.desc}</p>
        <div class="a-project-stack">
          ${p.stack.map(s => `<span class="a-chip">${s}</span>`).join('')}
        </div>
        <div class="a-project-footer">
          <span class="a-cat a-cat-${p.category}">${catLabel(p.category)}</span>
          ${p.live ? `<a class="a-project-link" href="https://${p.live}" target="_blank" rel="noopener">visitar ↗</a>` : ''}
        </div>
      </article>`).join('');
  }

  if (countEl) countEl.textContent = `${A.projects.length} ENVÍOS`;
  renderFilters();
  renderProjects();

  // ── EXPERIENCE ────────────────────────────────────────────────────────────
  const timeline = document.getElementById('timeline');
  if (timeline) {
    timeline.innerHTML = A.experience.map(e => `
      <div class="a-tl-row">
        <div class="a-tl-period a-mono">${e.period}</div>
        <div class="a-tl-line"><span class="a-tl-dot"></span></div>
        <div class="a-tl-body">
          <div class="a-tl-company">${e.company}</div>
          <h3 class="a-tl-role">${e.role}</h3>
          <p class="a-tl-desc">${e.desc}</p>
          <div class="a-tl-tags">
            ${e.tags.map(t => `<span class="a-chip a-chip-soft">${t}</span>`).join('')}
          </div>
        </div>
      </div>`).join('');
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

    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.dataset.w + '%';
          barObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    skillsGrid.querySelectorAll('.a-stack-fill').forEach(el => barObserver.observe(el));
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
      A.languages.map(l => `
        <div class="a-lang-row">
          <span>${l.name}</span>
          <span class="a-lang-track"><span style="width:${l.pct}%"></span></span>
          <span class="a-mono a-lang-level">${l.level}</span>
        </div>`).join('');
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
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

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

      const btn = form.querySelector('button[type="submit"]');
      const saved = btn.innerHTML;
      btn.textContent = 'Enviando…';
      btn.disabled = true;

      try {
        const res  = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_key: 'f25ab849-9622-4991-b851-073a127cb833',
            name, email, message,
            subject: `Portfolio · mensaje de ${name}`
          })
        });
        const data = await res.json();
        if (data.success) {
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

})();
