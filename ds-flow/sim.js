// Simulación de una estación de reparto (DS): motor, mapa en canvas y centro de control.
(function () {
  "use strict";

  const L = window.DS_LAYOUT;
  const $ = (s) => document.querySelector(s);
  const D = L.docks, R = L.receive, I = L.induct, CV = L.conveyor, ST = L.stow, P = L.pick, Y = L.yard;

  // ── Estado ────────────────────────────────────────────
  const S = {
    t: 0, speed: 1, paused: false, auto: true,
    pkgs: new Map(),
    trucks: [], vans: [], transit: [],
    receiveQ: [], inductQ: [],
    acc: { receive: 0, induct: 0, pick: 0 },
    staff: { receive: R.staff, induct: I.staff, stow: ST.staff, pick: P.staff },
    aisles: ST.aisles.map((a, i) => ({ ...a, idx: i, queue: [], acc: 0, done: 0 })),
    routes: [],
    received: 0, stowed: 0, dispatched: 0, delivered: 0, routesOut: 0,
    deliveries: [],           // { at, pkg } entregas pendientes
    stowLog: [], dockToStow: [], vanTimes: [], vansOnTime: 0,
    history: [], lastMinute: 0,
    selected: null, tracked: null,
    pickRR: 0, nextTruck: 101, nextVan: 1, lastAutoTruck: -99, lastAutoVan: -99,
    events: [],
  };

  // Rutas: 8 por pasillo, con peso de volumen distinto para que unas se llenen antes
  const AISLE_COLORS = ["--ds-a", "--ds-b", "--ds-c", "--ds-d"];
  let rnd = 7;
  const seeded = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  S.aisles.forEach((a) => {
    for (let j = 0; j < ST.routesPerAisle; j++) {
      const n = a.idx * ST.routesPerAisle + j + 1;
      S.routes.push({
        n, code: "R" + String(n).padStart(2, "0"), aisle: a.idx, j,
        town: L.towns[(n * 3) % L.towns.length],
        weight: 0.5 + seeded() * 1.2,
        bag: [], cart: [], toPick: 0, van: null, out: 0,
      });
    }
  });
  const totalWeight = S.routes.reduce((s, r) => s + r.weight, 0);
  function pickRoute() {
    let x = Math.random() * totalWeight;
    for (const r of S.routes) { x -= r.weight; if (x <= 0) return r; }
    return S.routes[S.routes.length - 1];
  }

  // ── Geometría ─────────────────────────────────────────
  const dockX = (i) => D.left + ((D.right - D.left) / D.count) * (i + 0.5);
  const beltY = (a) => a.y + 20;
  const bagW = (ST.w - 24) / ST.routesPerAisle;
  const bagRect = (r) => {
    const a = ST.aisles[r.aisle];
    return { x: ST.x + 12 + r.j * bagW + 3, y: a.y + 38, w: bagW - 6, h: ST.h - 48 };
  };
  const bagCenter = (r) => { const b = bagRect(r); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
  const cartRect = (r) => {
    const a = ST.aisles[r.aisle], col = r.j % 2, row = Math.floor(r.j / 2);
    return { x: P.x + 10 + col * 44, y: a.y + 6 + row * 25, w: 40, h: 21 };
  };
  const cartCenter = (r) => { const c = cartRect(r); return { x: c.x + c.w / 2, y: c.y + c.h / 2 }; };
  const padRect = (i) => {
    // dos filas de plazas a los lados de un carril central
    const col = i % 2, row = Math.floor(i / 2), rows = Y.pads / 2;
    const lane = 56, w = (Y.w - 24 - lane) / 2, h = (Y.h - 80) / rows;
    return { x: col ? Y.x + Y.w - 12 - w : Y.x + 12, y: Y.y + 40 + row * h, w, h: h - 10 };
  };
  const padCenter = (i) => { const p = padRect(i); return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; };
  const center = (z) => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 });
  const rate = (base, key, cfg) => (base * S.staff[key]) / cfg.staff;

  // ── Utilidades ────────────────────────────────────────
  const clock = (t) => {
    const m = Math.floor(t + L.shiftStart);
    return String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(((m % 60) + 60) % 60).padStart(2, "0");
  };
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const trim = (a, n) => { if (a.length > n) a.splice(0, a.length - n); };
  const fmtMin = (m) => (m < 1 ? "< 1 min" : m < 90 ? Math.round(m) + " min" : (m / 60).toFixed(1) + " h");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function log(msg, kind) {
    S.events.unshift({ t: S.t, msg, kind: kind || "" });
    trim(S.events, 40);
    renderLog();
  }
  function hist(p, msg) { p.hist.push({ t: S.t, msg }); }

  const SIZES = [["Sobre", 0.3], ["Pequeño", 1.2], ["Mediano", 3.5], ["Grande", 9]];
  function newPkg(truck) {
    let id;
    do { id = "DS" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0"); } while (S.pkgs.has(id));
    const r = pickRoute(), sz = SIZES[Math.floor(Math.random() ** 1.6 * SIZES.length)];
    const p = {
      id, route: r.n, size: sz[0], weight: +(sz[1] * (0.6 + Math.random() * 0.8)).toFixed(1),
      cp: "11" + String(Math.floor(Math.random() * 690) + 1).padStart(3, "0"),
      truck: truck.id, sorted: false, where: "truck", hist: [], unloadedAt: S.t,
    };
    hist(p, `Descargado del camión ${truck.id} · muelle ${truck.dock + 1}`);
    S.pkgs.set(id, p);
    if (S.pkgs.size > 20000) {
      for (const [k, v] of S.pkgs) { if (S.pkgs.size < 17000) break; if (v.where === "delivered" && k !== S.tracked) S.pkgs.delete(k); }
    }
    return p;
  }

  // ── Tránsito por polilínea ────────────────────────────
  function send(pkg, pts, dest, extra) {
    let total = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(l); total += l; }
    const tr = { pkg, pts, segs, total: Math.max(total, 1), d: 0, dest, ...extra };
    pkg.where = "transit"; pkg.tr = tr;
    S.transit.push(tr);
  }
  function posOf(tr) {
    let d = tr.d;
    for (let i = 0; i < tr.segs.length; i++) {
      if (d <= tr.segs[i] || i === tr.segs.length - 1) {
        const f = tr.segs[i] ? Math.min(d / tr.segs[i], 1) : 1, a = tr.pts[i], b = tr.pts[i + 1];
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      }
      d -= tr.segs[i];
    }
    return tr.pts[tr.pts.length - 1];
  }

  function arrive(tr) {
    const p = tr.pkg; p.tr = null;
    const r = S.routes[p.route - 1];
    switch (tr.dest) {
      case "receive": p.where = "receive"; hist(p, "Escaneado en recepción"); S.receiveQ.push(p); break;
      case "induct": p.where = "induct"; S.inductQ.push(p); break;
      case "aisle": p.where = "aisle"; S.aisles[r.aisle].queue.push(p); break;
      case "bag":
        p.where = "bag"; r.bag.push(p); S.stowed++; S.stowLog.push(S.t);
        S.dockToStow.push(S.t - p.unloadedAt); trim(S.dockToStow, 120);
        hist(p, `Stow en la saca ${r.code} · pasillo ${ST.aisles[r.aisle].id}`);
        break;
      case "cart": p.where = "cart"; r.cart.push(p); hist(p, `Pick · carro de ${r.code}`); break;
      case "van": {
        const v = S.vans.find((x) => x.id === tr.van);
        p.where = "van"; p.van = tr.van;
        if (v) { v.incoming--; v.loaded++; v.items.push(p); }
        hist(p, `Cargado en la furgoneta ${tr.van}`);
        break;
      }
    }
  }

  // ── Acciones ──────────────────────────────────────────
  function addTruck(manual) {
    const used = new Set(S.trucks.map((t) => t.dock));
    const free = [...Array(D.count).keys()].filter((i) => !used.has(i));
    if (!free.length) { if (manual) toast(`Los ${D.count} muelles están ocupados`); return; }
    const dock = free[Math.floor(Math.random() * free.length)];
    const units = Math.round(D.truckUnits * (0.7 + Math.random() * 0.6));
    const t = { id: "T-" + S.nextTruck++, dock, units, total: units, state: "arriving", p: 0, acc: 0 };
    S.trucks.push(t);
    log(`Camión ${t.id} atraca en el muelle ${dock + 1} con ${units} paquetes`, "in");
  }

  function freePad() {
    const used = new Set(S.vans.map((v) => v.pad));
    for (let i = 0; i < Y.pads; i++) if (!used.has(i)) return i;
    return -1;
  }

  function callVan(route, manual) {
    if (!route) {
      route = S.routes.filter((r) => !r.van && r.bag.length).sort((a, b) => b.bag.length - a.bag.length)[0];
      if (!route) { if (manual) toast("No hay sacas con paquetes esperando furgoneta"); return; }
    }
    if (route.van) { if (manual) toast(`${route.code} ya tiene furgoneta`); return; }
    if (!route.bag.length) { if (manual) toast(`La saca de ${route.code} está vacía`); return; }
    const pad = freePad();
    if (pad < 0) { if (manual) toast("El yard está lleno"); return; }
    const v = { id: "V-" + String(S.nextVan++).padStart(3, "0"), route: route.n, pad, state: "arriving", p: 0, acc: 0,
      expected: route.bag.length, loaded: 0, incoming: 0, items: [], calledAt: S.t };
    route.van = v; route.toPick += route.bag.length;
    S.vans.push(v);
    log(`Furgoneta ${v.id} asignada a ${route.code} (${route.town}) · ${v.expected} paquetes · plaza ${pad + 1}`, "out");
    return v;
  }

  function depart(v) {
    const r = S.routes[v.route - 1];
    v.state = "leaving"; v.p = 0; r.van = null; r.out += v.loaded;
    const yardTime = S.t - v.calledAt;
    S.vanTimes.push(yardTime); trim(S.vanTimes, 100);
    if (yardTime <= Y.onTimeMinutes) S.vansOnTime++;
    S.routesOut++; S.dispatched += v.loaded;
    for (const p of v.items) {
      p.where = "route"; hist(p, `Sale a reparto · ${r.town}`);
      S.deliveries.push({ at: S.t + 45 + Math.random() * 240, pkg: p });
    }
    log(`Furgoneta ${v.id} sale a reparto con ${v.loaded} paquetes (${r.code} · ${fmtMin(yardTime)} en yard)`, "out");
  }

  // ── Paso de simulación (dt en minutos simulados) ──────
  function step(dt) {
    S.t += dt;

    // Camiones
    for (const t of S.trucks) {
      if (t.state === "arriving") { t.p += dt / 1.5; if (t.p >= 1) { t.state = "unloading"; t.p = 1; } }
      else if (t.state === "unloading") {
        t.acc += (D.unloadRate / 60) * dt;
        while (t.acc >= 1 && t.units > 0) {
          t.acc--; t.units--; S.received++;
          const p = newPkg(t), x = dockX(t.dock);
          send(p, [{ x, y: D.wallY }, { x: Math.max(x + (Math.random() - 0.5) * 30, R.x + 10), y: R.y + 14 }], "receive");
        }
        if (!t.units) { t.state = "leaving"; t.p = 0; log(`Camión ${t.id} vacío, libera el muelle ${t.dock + 1}`, "in"); }
      } else t.p += dt / 1.5;
    }
    S.trucks = S.trucks.filter((t) => !(t.state === "leaving" && t.p >= 1));

    // Recepción → Inducción
    S.acc.receive = Math.min(S.acc.receive + (rate(R.rate, "receive", R) / 60) * dt, 3);
    while (S.acc.receive >= 1 && S.receiveQ.length) {
      S.acc.receive--;
      const p = S.receiveQ.shift();
      const x0 = R.x + 20 + Math.random() * (R.w - 40);
      send(p, [{ x: x0, y: R.y + R.h - 14 }, { x: R.x + 6, y: R.y + R.h - 14 }, { x: I.x + I.w - 8, y: I.y + I.h / 2 + 10 }], "induct");
    }

    // Inducción → conveyor → pasillo
    S.acc.induct = Math.min(S.acc.induct + (rate(I.rate, "induct", I) / 60) * dt, 3);
    while (S.acc.induct >= 1 && S.inductQ.length) {
      S.acc.induct--;
      const p = S.inductQ.shift(), r = S.routes[p.route - 1], a = ST.aisles[r.aisle];
      p.sorted = true;
      hist(p, `Inducido · ruta ${r.code} → pasillo ${a.id}`);
      send(p, [{ x: CV.x, y: I.y + I.h - 10 }, { x: CV.x, y: beltY(a) }, { x: ST.x + 8, y: beltY(a) }], "aisle", { belt: true });
    }

    // Stow: cada pasillo con su parte de la plantilla
    const perAisle = rate(ST.rate, "stow", ST) / S.aisles.length;
    for (const a of S.aisles) {
      a.acc = Math.min(a.acc + (perAisle / 60) * dt, 3);
      while (a.acc >= 1 && a.queue.length) {
        a.acc--; a.done++;
        const p = a.queue.shift(), r = S.routes[p.route - 1], b = bagCenter(r);
        send(p, [{ x: ST.x + 8, y: beltY(a) }, { x: b.x, y: beltY(a) }, b], "bag");
      }
    }

    // Pick: reparto round-robin entre rutas con furgoneta asignada
    S.acc.pick = Math.min(S.acc.pick + (rate(P.rate, "pick", P) / 60) * dt, 3);
    // puntero persistente para que ninguna ruta se quede sin pickers
    const picking = () => S.routes.some((r) => r.toPick > 0);
    while (S.acc.pick >= 1 && picking()) {
      S.pickRR = (S.pickRR + 1) % S.routes.length;
      const r = S.routes[S.pickRR];
      if (!r.toPick) continue;
      S.acc.pick--;
      const p = r.bag.shift(); r.toPick--;
      if (p) {
        const b = bagCenter(r), c = cartCenter(r);
        send(p, [b, { x: ST.x + ST.w, y: b.y }, { x: P.x, y: c.y }, c], "cart");
      }
    }

    // Furgonetas
    for (const v of S.vans) {
      const r = S.routes[v.route - 1];
      if (v.state === "arriving") { v.p += dt / 1.5; if (v.p >= 1) { v.state = "loading"; v.p = 1; } }
      else if (v.state === "loading") {
        v.acc = Math.min(v.acc + (Y.loadRate / 60) * dt, 3);
        while (v.acc >= 1 && r.cart.length) {
          v.acc--; v.incoming++;
          const p = r.cart.shift(), c = cartCenter(r), pc = padCenter(v.pad);
          send(p, [c, { x: P.x + P.w, y: c.y }, { x: Y.x + 6, y: pc.y }, pc], "van", { van: v.id });
        }
        if (v.loaded >= v.expected && !v.incoming) depart(v);
      } else v.p += dt / 1.5;
    }
    S.vans = S.vans.filter((v) => !(v.state === "leaving" && v.p >= 1));

    // Tránsito
    const still = [];
    for (const tr of S.transit) {
      tr.d += CV.speed * dt;
      if (tr.d >= tr.total) arrive(tr); else still.push(tr);
    }
    S.transit = still;

    // Entregas
    if (S.deliveries.length) {
      const rest = [];
      for (const d of S.deliveries) {
        if (d.at <= S.t) { d.pkg.where = "delivered"; hist(d.pkg, "Entregado al cliente"); S.delivered++; }
        else rest.push(d);
      }
      S.deliveries = rest;
    }

    // Piloto automático
    if (S.auto) {
      const inPlant = S.received - S.dispatched;
      if (inPlant < 2600 && S.receiveQ.length < 120 && S.t - S.lastAutoTruck > 4) { addTruck(false); S.lastAutoTruck = S.t; }
      if (S.t - S.lastAutoVan > 0.5) {
        const r = S.routes.filter((x) => !x.van && x.bag.length >= 35).sort((a, b) => b.bag.length - a.bag.length)[0];
        if (r && freePad() >= 0) callVan(r, false);
        S.lastAutoVan = S.t;
      }
    }

    // Histórico por minuto
    if (S.t - S.lastMinute >= 1) {
      S.lastMinute = Math.floor(S.t);
      trim(S.stowLog, 6000);
      S.history.push({ plant: S.received - S.dispatched, stow: stowRate() });
      trim(S.history, 240);
    }
  }

  function stowRate() {
    const from = S.t - 60; let n = 0;
    for (let i = S.stowLog.length - 1; i >= 0 && S.stowLog[i] >= from; i--) n++;
    return S.t < 60 ? Math.round((n / Math.max(S.t, 1)) * 60) : n;
  }

  // Minutos de cola por proceso
  function loads() {
    const out = [
      { name: "Recepción", m: S.receiveQ.length / (rate(R.rate, "receive", R) / 60) },
      { name: "Inducción", m: S.inductQ.length / (rate(I.rate, "induct", I) / 60) },
    ];
    const perAisle = rate(ST.rate, "stow", ST) / S.aisles.length / 60;
    for (const a of S.aisles) out.push({ name: "stow del pasillo " + a.id, m: a.queue.length / perAisle });
    const toPick = S.routes.reduce((s, r) => s + r.toPick, 0);
    out.push({ name: "Pick", m: toPick / (rate(P.rate, "pick", P) / 60) });
    return out;
  }
  const loadColor = (m) => (m > 15 ? C.bad : m > 6 ? C.warn : C.ok);

  // ── Render ────────────────────────────────────────────
  const canvas = $("#ds-map"), ctx = canvas.getContext("2d");
  let C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement), g = (n) => cs.getPropertyValue(n).trim();
    C = {
      floor: g("--ds-floor"), grid: g("--ds-grid"), zone: g("--ds-zone"), line: g("--ds-line"),
      fg: g("--ds-fg"), soft: g("--ds-fg-soft"), muted: g("--ds-fg-muted"),
      raw: g("--ds-raw"), belt: g("--ds-belt"), truck: g("--ds-truck"), van: g("--ds-van"),
      ok: g("--ds-ok"), warn: g("--ds-warn"), bad: g("--ds-bad"), sel: g("--ds-sel"),
      aisle: AISLE_COLORS.map(g),
    };
  }

  let scale = 1;
  function resize() {
    const w = canvas.parentElement.clientWidth, dpr = window.devicePixelRatio || 1;
    scale = w / L.width;
    canvas.style.height = L.height * scale + "px";
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(L.height * scale * dpr);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const isSel = (kind, id) => S.selected && S.selected.kind === kind && S.selected.id === id;
  function text(s, x, y, font, color, align) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.fillText(s, x, y); ctx.textAlign = "left";
  }
  const MONO = (w, s) => `${w} ${s}px 'JetBrains Mono', monospace`;
  const SANS = (w, s) => `${w} ${s}px Inter, sans-serif`;

  function zoneBox(z, kind, loadM) {
    ctx.fillStyle = C.zone; rr(z.x, z.y, z.w, z.h, 10); ctx.fill();
    ctx.lineWidth = isSel("zone", kind) ? 2.5 : 1; ctx.strokeStyle = isSel("zone", kind) ? C.sel : C.line; ctx.stroke();
    if (loadM !== undefined) { ctx.fillStyle = loadColor(loadM); rr(z.x, z.y, z.w, 4, 2); ctx.fill(); }
    ctx.textBaseline = "top";
    text(z.code, z.x + 10, z.y + 12, MONO(600, 10), C.muted);
    text(z.name, z.x + 10, z.y + 26, SANS(600, 13), C.fg);
  }

  function queueDots(x, y, w, n, color, max) {
    const s = 7, cols = Math.max(1, Math.floor(w / s)), shown = Math.min(n, max);
    ctx.fillStyle = color;
    for (let i = 0; i < shown; i++) ctx.fillRect(x + (i % cols) * s, y + Math.floor(i / cols) * s, s - 2, s - 2);
  }

  function drawBelts(time) {
    const belt = (pts, w) => {
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = C.belt; ctx.lineWidth = w; ctx.setLineDash([]);
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1.5; ctx.setLineDash([4, 9]); ctx.lineDashOffset = S.paused ? 0 : -time * 20;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      ctx.restore();
    };
    belt([{ x: CV.x, y: CV.top }, { x: CV.x, y: CV.bottom }], 14);
    for (const a of ST.aisles) belt([{ x: CV.x, y: beltY(a) }, { x: ST.x + ST.w - 10, y: beltY(a) }], 10);
    ctx.textBaseline = "top";
    ctx.save(); ctx.translate(CV.x - 22, (CV.top + CV.bottom) / 2); ctx.rotate(-Math.PI / 2);
    text("CONVEYOR", 0, 0, MONO(600, 10), C.muted, "center"); ctx.restore();
  }

  function drawDocks() {
    ctx.strokeStyle = C.line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(D.left - 14, D.wallY); ctx.lineTo(D.right + 14, D.wallY); ctx.stroke();
    ctx.textBaseline = "middle";
    for (let i = 0; i < D.count; i++) {
      const x = dockX(i);
      ctx.fillStyle = C.line; ctx.fillRect(x - 26, D.wallY - 4, 52, 8);
      text("D" + (i + 1), x, D.wallY - 50, MONO(600, 11), C.muted, "center");
    }
    text("DOCK", D.right + 22, D.wallY - 60, MONO(600, 10), C.muted);
    text(D.count + " muelles", D.right + 22, D.wallY - 44, MONO(500, 10), C.muted);
  }

  const ease = (p) => 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), 3);

  function drawTruck(t) {
    const off = t.state === "arriving" ? (1 - ease(t.p)) * -130 : t.state === "leaving" ? ease(t.p) * -130 : 0;
    const w = 66, h = 96, x = dockX(t.dock) - w / 2, y = D.wallY - h - 6 + off;
    ctx.fillStyle = C.truck; rr(x, y, w, h, 5); ctx.fill();
    if (isSel("truck", t.id)) { ctx.strokeStyle = C.sel; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = C.line; rr(x + 10, y - 8, w - 20, 12, 3); ctx.fill(); // cabina
    ctx.fillStyle = C.raw; ctx.fillRect(x + 7, y + h - 12, (w - 14) * (t.units / t.total), 4);
    ctx.textBaseline = "middle";
    text(t.id, x + w / 2, y + 30, MONO(600, 10), C.fg, "center");
    text(t.units + " paq", x + w / 2, y + 48, MONO(500, 10), C.soft, "center");
  }

  function drawQueueZone(z, kind, q, cfg) {
    zoneBox(z, kind, q.length / (rate(cfg.rate, kind, cfg) / 60));
    ctx.textBaseline = "top";
    if (z.w > 300) {
      text(String(q.length), z.x + 130, z.y + 12, MONO(600, 22), C.fg);
      text("en cola", z.x + 130, z.y + 40, SANS(500, 10), C.muted);
      const qw = z.w - 232, rows = Math.floor((z.h - 18) / 7);
      queueDots(z.x + 220, z.y + 12, qw, q.length, C.raw, Math.floor(qw / 7) * rows);
    } else {
      text(String(q.length) + " en cola", z.x + 10, z.y + 50, MONO(600, 12), C.fg);
    }
  }

  function drawAisles() {
    const perAisle = rate(ST.rate, "stow", ST) / S.aisles.length / 60;
    for (const a of S.aisles) {
      const sel = isSel("aisle", a.id);
      ctx.fillStyle = C.zone; rr(ST.x, a.y, ST.w, ST.h, 10); ctx.fill();
      ctx.lineWidth = sel ? 2.5 : 1; ctx.strokeStyle = sel ? C.sel : C.line; ctx.stroke();
      ctx.fillStyle = loadColor(a.queue.length / perAisle); rr(ST.x, a.y, 4, ST.h, 2); ctx.fill();
      ctx.textBaseline = "middle";
      text("PASILLO " + a.id, ST.x + ST.w - 12, a.y + 8, MONO(600, 9), C.muted, "right");
      if (a.queue.length) text(a.queue.length + " por stowear", ST.x + 14, a.y + 8, MONO(500, 9), C.soft);
    }
    for (const r of S.routes) {
      const b = bagRect(r), col = C.aisle[r.aisle], f = Math.min(r.bag.length / ST.bagCapacity, 1);
      ctx.fillStyle = C.floor; rr(b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.save(); rr(b.x, b.y, b.w, b.h, 6); ctx.clip();
      ctx.fillStyle = col; ctx.globalAlpha = 0.7; ctx.fillRect(b.x, b.y + b.h * (1 - f), b.w, b.h * f); ctx.restore();
      const full = r.bag.length >= ST.bagCapacity, sel = isSel("route", r.n);
      ctx.lineWidth = r.van || sel || full ? 2 : 1;
      ctx.strokeStyle = sel ? C.sel : full ? C.bad : r.van ? C.ok : C.line;
      rr(b.x, b.y, b.w, b.h, 6); ctx.stroke();
      ctx.textBaseline = "top";
      text(r.code, b.x + b.w / 2, b.y + 5, MONO(600, 9), C.fg, "center");
      text(String(r.bag.length), b.x + b.w / 2, b.y + b.h - 15, MONO(600, 10), C.fg, "center");
    }
    ctx.textBaseline = "top";
    text("STOW A SACAS · 32 RUTAS", ST.x + ST.w / 2, ST.aisles[ST.aisles.length - 1].y + ST.h + 10, MONO(600, 10), C.muted, "center");
  }

  function drawPick() {
    const toPick = S.routes.reduce((s, r) => s + r.toPick, 0);
    ctx.fillStyle = C.zone; rr(P.x, P.y, P.w, P.h, 10); ctx.fill();
    ctx.lineWidth = isSel("zone", "pick") ? 2.5 : 1; ctx.strokeStyle = isSel("zone", "pick") ? C.sel : C.line; ctx.stroke();
    ctx.fillStyle = loadColor(toPick / (rate(P.rate, "pick", P) / 60)); rr(P.x, P.y, P.w, 4, 2); ctx.fill();
    ctx.textBaseline = "top";
    text("PICK · CARROS", P.x + P.w / 2, P.y + P.h + 10, MONO(600, 10), C.muted, "center");
    for (const r of S.routes) {
      if (!r.van && !r.cart.length && !r.toPick) continue;
      const c = cartRect(r), col = C.aisle[r.aisle];
      ctx.fillStyle = C.floor; rr(c.x, c.y, c.w, c.h, 4); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.textBaseline = "middle";
      text(r.code, c.x + c.w / 2, c.y + c.h / 2 - 4, MONO(600, 8), C.fg, "center");
      text(String(r.cart.length), c.x + c.w / 2, c.y + c.h / 2 + 6, MONO(500, 8), C.soft, "center");
    }
  }

  function drawYard() {
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = isSel("zone", "yard") ? C.sel : C.line; ctx.lineWidth = isSel("zone", "yard") ? 2.5 : 1.5;
    rr(Y.x, Y.y, Y.w, Y.h, 12); ctx.stroke(); ctx.restore();
    ctx.textBaseline = "top";
    text(Y.code, Y.x + 12, Y.y + 9, MONO(600, 10), C.muted);
    text("Yard · furgonetas", Y.x + 44, Y.y + 8, SANS(600, 12), C.fg);
    // carril central: entrada por abajo, salida por arriba
    const lx = Y.x + Y.w / 2;
    ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.lineDashOffset = S.paused ? 0 : (performance.now() / 1000) * 20;
    ctx.beginPath(); ctx.moveTo(lx, Y.y + Y.h - 30); ctx.lineTo(lx, Y.y + 34); ctx.stroke(); ctx.restore();
    ctx.fillStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(lx, Y.y + 26); ctx.lineTo(lx - 7, Y.y + 38); ctx.lineTo(lx + 7, Y.y + 38); ctx.closePath(); ctx.fill();
    text("SALIDA", lx + 12, Y.y + 28, MONO(600, 9), C.muted);
    text("ENTRADA", lx, Y.y + Y.h - 22, MONO(600, 9), C.muted, "center");
    for (let i = 0; i < Y.pads; i++) {
      const p = padRect(i);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); rr(p.x, p.y, p.w, p.h, 6); ctx.stroke(); ctx.setLineDash([]);
      text("P" + (i + 1), p.x + 5, p.y + 4, MONO(500, 8), C.muted);
    }
    for (const v of S.vans) {
      const p = padRect(v.pad), r = S.routes[v.route - 1];
      const off = v.state === "arriving" ? (1 - ease(v.p)) * 120 : v.state === "leaving" ? ease(v.p) * -120 : 0;
      ctx.globalAlpha = v.state === "arriving" ? Math.max(ease(v.p), 0.05) : v.state === "leaving" ? 1 - ease(v.p) : 1;
      const x = p.x + 6, y = p.y + 12 + off, w = p.w - 12, h = p.h - 18;
      ctx.fillStyle = C.van; rr(x, y, w, h, 6); ctx.fill();
      ctx.fillStyle = C.aisle[r.aisle]; ctx.fillRect(x + 4, y, w - 8, 3);
      if (isSel("van", v.id)) { ctx.strokeStyle = C.sel; ctx.lineWidth = 2; rr(x, y, w, h, 6); ctx.stroke(); }
      ctx.fillRect(x + 6, y + h - 9, (w - 12) * (v.loaded / Math.max(v.expected, 1)), 4);
      ctx.textBaseline = "top";
      text(v.id, x + 6, y + 9, MONO(600, 10), C.fg);
      text(r.code + " · " + v.loaded + "/" + v.expected, x + 6, y + 23, MONO(500, 9), C.soft);
      const mins = S.t - v.calledAt;
      if (v.state === "loading") text(Math.floor(mins) + "′", x + w - 6, y + 9, MONO(600, 9), mins > Y.onTimeMinutes ? C.bad : C.muted, "right");
      ctx.globalAlpha = 1;
    }
  }

  function drawTransit() {
    for (const tr of S.transit) {
      const p = posOf(tr), pkg = tr.pkg;
      ctx.fillStyle = pkg.sorted ? C.aisle[S.routes[pkg.route - 1].aisle] : C.raw;
      ctx.fillRect(p.x - 3.5, p.y - 3.5, 7, 7);
    }
  }

  function trackedPos() {
    const p = S.tracked && S.pkgs.get(S.tracked);
    if (!p) return null;
    const r = S.routes[p.route - 1];
    switch (p.where) {
      case "transit": return p.tr ? posOf(p.tr) : null;
      case "receive": return center(R);
      case "induct": return center(I);
      case "aisle": return { x: ST.x + 14, y: beltY(ST.aisles[r.aisle]) };
      case "bag": return bagCenter(r);
      case "cart": return cartCenter(r);
      case "van": { const v = S.vans.find((x) => x.id === p.van); return v ? padCenter(v.pad) : null; }
    }
    return null;
  }

  function draw(time) {
    ctx.fillStyle = C.floor; ctx.fillRect(0, 0, L.width, L.height);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let x = 0; x < L.width; x += 40) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, L.height); ctx.stroke(); }
    for (let y = 0; y < L.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(L.width, y + 0.5); ctx.stroke(); }
    drawDocks(); drawBelts(time);
    drawQueueZone(R, "receive", S.receiveQ, R);
    drawQueueZone(I, "induct", S.inductQ, I);
    drawAisles(); drawPick(); drawYard();
    for (const t of S.trucks) drawTruck(t);
    drawTransit();
    const tp = trackedPos();
    if (tp) {
      const pulse = 10 + Math.sin(time * 6) * 3;
      ctx.strokeStyle = C.sel; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(tp.x, tp.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(tp.x, tp.y, pulse + 8, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ── Interacción con el mapa ───────────────────────────
  const inside = (x, y, b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function hit(x, y) {
    let best = null, bd = 10;
    for (const tr of S.transit) { const p = posOf(tr), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = tr.pkg; } }
    if (best) return { kind: "pkg", id: best.id };
    for (const t of S.trucks) if (y < D.wallY && Math.abs(x - dockX(t.dock)) < 34) return { kind: "truck", id: t.id };
    for (const v of S.vans) if (inside(x, y, padRect(v.pad))) return { kind: "van", id: v.id };
    for (const r of S.routes) if (inside(x, y, bagRect(r))) return { kind: "route", id: r.n };
    for (const r of S.routes) if ((r.van || r.cart.length) && inside(x, y, cartRect(r))) return { kind: "route", id: r.n };
    for (const a of ST.aisles) if (inside(x, y, { x: ST.x, y: a.y, w: ST.w, h: ST.h })) return { kind: "aisle", id: a.id };
    const zones = { receive: R, induct: I, pick: P, yard: Y };
    for (const k in zones) if (inside(x, y, zones[k])) return { kind: "zone", id: k };
    if (Math.abs(x - CV.x) < 12 && y > CV.top && y < CV.bottom) return { kind: "zone", id: "conveyor" };
    return null;
  }
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; };
  canvas.addEventListener("click", (e) => {
    const h = hit(...local(e));
    if (h && h.kind === "pkg") { track(h.id); return; }
    S.selected = h; renderDetail();
  });
  canvas.addEventListener("mousemove", (e) => { canvas.style.cursor = hit(...local(e)) ? "pointer" : "default"; });

  function track(id) {
    if (!S.pkgs.get(id)) { toast("No encuentro ese paquete"); return; }
    S.tracked = id; S.selected = { kind: "pkg", id };
    $("#ds-search").value = id;
    renderDetail();
  }

  // ── Centro de control ─────────────────────────────────
  function toast(msg) {
    const el = $("#ds-toast"); el.textContent = msg; el.classList.add("is-on");
    clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove("is-on"), 2400);
  }

  function renderKpis() {
    const vans = S.routesOut, onTime = vans ? Math.round((S.vansOnTime / vans) * 100) + "%" : "—";
    const kp = [
      ["Hora", clock(S.t)],
      ["Recibidos", S.received],
      ["En planta", S.received - S.dispatched],
      ["Stow / h", stowRate()],
      ["Dock-to-stow", S.dockToStow.length ? fmtMin(avg(S.dockToStow)) : "—"],
      ["Rutas fuera", vans],
      ["En reparto", S.dispatched - S.delivered],
      ["Entregados", S.delivered],
      ["Salida a tiempo", onTime],
    ];
    $("#ds-kpis").innerHTML = kp.map(([l, v]) => `<div class="ds-kpi"><span>${l}</span><strong>${typeof v === "number" ? v.toLocaleString("es-ES") : v}</strong></div>`).join("");

    const al = [];
    const worst = loads().sort((a, b) => b.m - a.m)[0];
    if (worst && worst.m > 6) al.push([worst.m > 15 ? "bad" : "warn", `Cuello de botella en ${worst.name}: ${Math.round(worst.m)} min de cola`]);
    const full = S.routes.filter((r) => r.bag.length >= ST.bagCapacity);
    if (full.length) al.push(["bad", `Saca llena en ${full.slice(0, 3).map((r) => r.code).join(", ")}${full.length > 3 ? "…" : ""}: llama a su furgoneta`]);
    const late = S.vans.filter((v) => v.state === "loading" && S.t - v.calledAt > Y.onTimeMinutes);
    if (late.length) al.push(["warn", `${late.length} furgoneta${late.length > 1 ? "s" : ""} por encima de ${Y.onTimeMinutes} min en yard`]);
    if (freePad() < 0) al.push(["warn", "Yard completo: no caben más furgonetas"]);
    if (S.trucks.length === D.count) al.push(["warn", `Los ${D.count} muelles están ocupados`]);
    $("#ds-alerts").innerHTML = al.length ? al.map(([k, m]) => `<li class="is-${k}">${m}</li>`).join("") : `<li class="is-ok">Ciclo estable, sin incidencias</li>`;
  }

  function renderLog() {
    const el = $("#ds-log"); if (!el) return;
    el.innerHTML = S.events.slice(0, 14).map((e) => `<li class="is-${e.kind}"><time>${clock(e.t)}</time>${esc(e.msg)}</li>`).join("");
  }

  const STATUS = { truck: "En el camión", transit: "En movimiento", receive: "En recepción", induct: "Esperando inducción", aisle: "En el conveyor, esperando stow",
    bag: "En la saca", cart: "En el carro de pick", van: "Cargado en furgoneta", route: "En reparto", delivered: "Entregado" };

  function staffCtl(key) {
    return `<div class="ds-staff"><span>Personal</span><button data-staff="${key}" data-d="-1" aria-label="Quitar persona">−</button><b>${S.staff[key]}</b><button data-staff="${key}" data-d="1" aria-label="Añadir persona">+</button></div>`;
  }
  const stats = (rows) => `<ul class="ds-stats">${rows.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join("")}</ul>`;
  const head = (code, title) => `<h3><span class="ds-code">${code}</span>${title}</h3>`;

  function renderDetail() {
    const el = $("#ds-detail"), s = S.selected;
    if (!s) { el.innerHTML = `<p class="ds-hint">Pulsa un paquete en movimiento, una saca, una furgoneta o cualquier zona del mapa. También puedes rastrear un paquete por su código.</p>`; return; }
    if (s.kind === "pkg") {
      const p = S.pkgs.get(s.id); if (!p) { S.selected = null; return renderDetail(); }
      const r = S.routes[p.route - 1];
      el.innerHTML = head("PKG", p.id) +
        stats([["Estado", STATUS[p.where] || p.where], ["Ruta", p.sorted ? `${r.code} · ${r.town}` : "Pendiente de inducción"], ["CP destino", p.cp], ["Tamaño", `${p.size} · ${p.weight} kg`]]) +
        `<ol class="ds-timeline">${p.hist.slice().reverse().map((h) => `<li><time>${clock(h.t)}</time>${esc(h.msg)}</li>`).join("")}</ol>`;
    } else if (s.kind === "route") {
      const r = S.routes[s.id - 1];
      el.innerHTML = head(r.code, `Ruta ${r.code} · ${r.town}`) +
        stats([["Pasillo", ST.aisles[r.aisle].id], ["En la saca", `${r.bag.length}/${ST.bagCapacity}`], ["Por recoger", r.toPick], ["En el carro", r.cart.length], ["Furgoneta", r.van ? r.van.id : "—"], ["Enviados hoy", r.out]]) +
        (!r.van && r.bag.length ? `<button class="ds-btn" data-call="${r.n}">Llamar furgoneta</button>` : "");
    } else if (s.kind === "aisle") {
      const a = S.aisles.find((x) => x.id === s.id), routes = S.routes.filter((r) => r.aisle === a.idx);
      el.innerHTML = head("STW", `Pasillo ${a.id}`) + `<p>${ST.desc}</p>` +
        stats([["Rutas", `${routes[0].code}–${routes[routes.length - 1].code}`], ["Esperando stow", a.queue.length], ["Stoweados", a.done], ["Paquetes en sacas", routes.reduce((t, r) => t + r.bag.length, 0)]]) + staffCtl("stow");
    } else if (s.kind === "truck") {
      const t = S.trucks.find((x) => x.id === s.id); if (!t) { S.selected = null; return renderDetail(); }
      el.innerHTML = head("IN", `Camión ${t.id}`) + `<p>Tráiler que llega desde un centro de distribución, en el muelle ${t.dock + 1}.</p>` +
        stats([["Estado", { arriving: "Atracando", unloading: "Descargando", leaving: "Saliendo" }[t.state]], ["Quedan", `${t.units}/${t.total}`], ["Ritmo", D.unloadRate + " paq/h"]]);
    } else if (s.kind === "van") {
      const v = S.vans.find((x) => x.id === s.id); if (!v) { S.selected = null; return renderDetail(); }
      const r = S.routes[v.route - 1];
      el.innerHTML = head("OUT", `Furgoneta ${v.id}`) + `<p>Ruta ${r.code} hacia ${r.town}, plaza ${v.pad + 1} del yard.</p>` +
        stats([["Estado", { arriving: "Entrando al yard", loading: "Cargando", leaving: "Saliendo a reparto" }[v.state]], ["Carga", `${v.loaded}/${v.expected}`], ["Tiempo en yard", fmtMin(S.t - v.calledAt)], ["Objetivo", `≤ ${Y.onTimeMinutes} min`]]);
    } else if (s.id === "conveyor") {
      el.innerHTML = head("CNV", "Conveyor") + `<p>Lleva cada paquete desde inducción hasta la boca del pasillo de su ruta.</p>` +
        stats([["En la cinta", S.transit.filter((t) => t.belt).length]]);
    } else {
      const cfg = { receive: R, induct: I, pick: P, yard: Y }[s.id];
      let rows;
      if (s.id === "receive") rows = [["En cola", S.receiveQ.length], ["Capacidad", Math.round(rate(R.rate, "receive", R)) + " paq/h"]];
      if (s.id === "induct") rows = [["En cola", S.inductQ.length], ["Capacidad", Math.round(rate(I.rate, "induct", I)) + " paq/h"]];
      if (s.id === "pick") rows = [["Por recoger", S.routes.reduce((t, r) => t + r.toPick, 0)], ["Rutas en pick", S.routes.filter((r) => r.toPick || r.cart.length).length], ["Capacidad", Math.round(rate(P.rate, "pick", P)) + " paq/h"]];
      if (s.id === "yard") rows = [["Furgonetas", `${S.vans.length}/${Y.pads}`], ["Tiempo medio en yard", S.vanTimes.length ? fmtMin(avg(S.vanTimes)) : "—"], ["Salidas", S.routesOut]];
      el.innerHTML = head(cfg.code, cfg.name) + `<p>${cfg.desc}</p>` + stats(rows) + (s.id !== "yard" ? staffCtl(s.id) : "");
    }
  }

  // Delegado con pointerdown: el panel se redibuja a menudo y un click normal se perdería
  const detailEl = $("#ds-detail");
  function onDetail(e) {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.staff) { const k = b.dataset.staff; S.staff[k] = Math.max(1, Math.min(60, S.staff[k] + Number(b.dataset.d))); }
    if (b.dataset.call) callVan(S.routes[Number(b.dataset.call) - 1], true);
    renderDetail();
  }
  detailEl.addEventListener("pointerdown", onDetail);
  detailEl.addEventListener("click", (e) => { if (e.detail === 0) onDetail(e); });

  // Sparkline
  const spark = $("#ds-spark"), sctx = spark.getContext("2d");
  function drawSpark() {
    const dpr = window.devicePixelRatio || 1, w = spark.clientWidth, h = spark.clientHeight;
    if (spark.width !== Math.round(w * dpr)) { spark.width = Math.round(w * dpr); spark.height = Math.round(h * dpr); }
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.clearRect(0, 0, w, h);
    const H = S.history; if (H.length < 2) return;
    const line = (key, color) => {
      const max = Math.max(...H.map((p) => p[key]), 1);
      sctx.strokeStyle = color; sctx.lineWidth = 1.6; sctx.beginPath();
      H.forEach((p, i) => { const x = (i / (H.length - 1)) * w, y = h - 4 - (p[key] / max) * (h - 10); i ? sctx.lineTo(x, y) : sctx.moveTo(x, y); });
      sctx.stroke();
    };
    line("plant", C.raw); line("stow", C.aisle[0]);
  }

  // ── Controles ─────────────────────────────────────────
  $("#ds-add-truck").addEventListener("click", () => addTruck(true));
  $("#ds-add-van").addEventListener("click", () => callVan(null, true));
  const pauseBtn = $("#ds-pause");
  pauseBtn.addEventListener("click", () => {
    S.paused = !S.paused;
    pauseBtn.textContent = S.paused ? "▶ Reanudar" : "❚❚ Pausa";
    pauseBtn.setAttribute("aria-pressed", String(S.paused));
  });
  $("#ds-speed").addEventListener("change", (e) => { S.speed = Number(e.target.value); });
  $("#ds-auto").addEventListener("change", (e) => { S.auto = e.target.checked; });
  $("#ds-track-form").addEventListener("submit", (e) => { e.preventDefault(); track($("#ds-search").value.trim().toUpperCase()); });
  $("#ds-random").addEventListener("click", () => {
    const live = [...S.transit.map((t) => t.pkg), ...S.routes.flatMap((r) => r.bag)];
    if (!live.length) { toast("Todavía no hay paquetes en planta"); return; }
    track(live[Math.floor(Math.random() * live.length)].id);
  });
  document.querySelectorAll("[data-zone]").forEach((b) => b.addEventListener("click", () => {
    const z = b.dataset.zone;
    S.selected = z.startsWith("aisle") ? { kind: "aisle", id: z.slice(5) } : { kind: "zone", id: z };
    renderDetail();
  }));

  const themeBtn = $("#ds-theme");
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("a-theme", t); } catch (e) {}
    themeBtn.textContent = t === "light" ? "☾" : "☀";
    readColors();
  }
  themeBtn.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));
  let saved = "dark"; try { saved = localStorage.getItem("a-theme") || "dark"; } catch (e) {}
  applyTheme(saved === "light" ? "light" : "dark");

  // ── Bucle ─────────────────────────────────────────────
  let last = performance.now(), uiAcc = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    if (!S.paused) { let rem = dt * S.speed; while (rem > 0) { const d = Math.min(rem, 0.05); step(d); rem -= d; } }
    draw(now / 1000);
    uiAcc += dt;
    if (uiAcc > 0.25) { uiAcc = 0; renderKpis(); drawSpark(); if (S.selected) renderDetail(); }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { S.speed = 0.5; $("#ds-speed").value = "0.5"; }

  // Arranque: algo de volumen ya en las sacas para que el mapa tenga vida desde el principio
  const seedTruck = { id: "T-100", dock: 0 };
  for (let i = 0; i < 520; i++) {
    const p = newPkg(seedTruck), r = S.routes[p.route - 1], aisle = ST.aisles[r.aisle].id;
    p.sorted = true; p.where = "bag"; r.bag.push(p);
    p.hist = [{ t: -40, msg: "Descargado del camión T-100 · muelle 1" }, { t: -32, msg: `Inducido · ruta ${r.code} → pasillo ${aisle}` }, { t: -25, msg: `Stow en la saca ${r.code} · pasillo ${aisle}` }];
    S.received++; S.stowed++;
  }
  addTruck(false); addTruck(false); addTruck(false);
  renderDetail(); renderLog(); renderKpis();
  requestAnimationFrame(frame);
})();
