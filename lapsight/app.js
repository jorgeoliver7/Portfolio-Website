/* LapSight · interfaz de la demo estática. */
(function () {
  'use strict';

  var LS = window.LS;
  var DATA = window.LS_DATA;
  var CIRCUITS = window.LS_CIRCUITS;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORE_KEY = 'lapsight-imports';

  var COMPOUND_COLOR = { S: 'var(--red)', M: 'var(--yellow)', H: 'var(--fg)', I: 'var(--green)', W: 'var(--cyan)' };
  var COMPOUND_LABEL = { S: 'Blando', M: 'Medio', H: 'Duro', I: 'Intermedio', W: 'Lluvia' };

  var state = {
    sessions: DATA.sessions.slice(),
    current: null,
    selectedLap: null,
    view: 'session',
    cmpA: 'jerez-alo',
    cmpB: 'jerez-sai',
  };

  // ─── Utilidades DOM ─────────────────────────────────────────────────────

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmtS(ms, digits) { return (ms / 1000).toFixed(digits == null ? 3 : digits); }
  function fmtDate(d) {
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  var tip = $('ls-tip');
  function showTip(html, evt) {
    tip.innerHTML = html;
    tip.hidden = false;
    var r = tip.getBoundingClientRect();
    var x = evt.clientX + 14, y = evt.clientY + 14;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - 14;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  // ─── Sesiones ───────────────────────────────────────────────────────────

  function driverOf(s) { return s.driverName || (DATA.drivers[s.driver] || {}).name || '—'; }
  function vehicleOf(s) { return s.vehicleName || (DATA.vehicles[s.vehicle] || {}).name || '—'; }
  function circuitOf(s) {
    return CIRCUITS.find(function (c) { return c.name === s.circuit; }) || null;
  }
  function byId(id) { return state.sessions.find(function (s) { return s.id === id; }); }

  // Recalcula todo lo derivado de las vueltas. Se llama al cargar y al invalidar una vuelta.
  function analyse(s) {
    s.stats = LS.computeStats(s.laps);
    s.sectors = LS.computeSectors(s.laps);
    s.stintsRes = LS.detectStints(s.laps);
    s.anomalies = LS.detectAnomalies(s.laps);
    s.insights = LS.generateInsights(s.laps);
  }

  function loadImports() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      JSON.parse(raw).forEach(function (s) {
        s.date = new Date(s.date);
        state.sessions.push(s);
      });
    } catch (e) { /* almacenamiento no disponible: sólo sesiones demo */ }
  }
  function saveImports() {
    try {
      var imp = state.sessions.filter(function (s) { return s.imported; }).map(function (s) {
        return { id: s.id, name: s.name, circuit: s.circuit, driverName: s.driverName, vehicleName: s.vehicleName,
          type: s.type, cond: s.cond, notes: s.notes, imported: true, date: s.date, laps: s.laps };
      });
      localStorage.setItem(STORE_KEY, JSON.stringify(imp.slice(-6)));
    } catch (e) { /* sin persistencia */ }
  }

  // ─── Lista lateral ──────────────────────────────────────────────────────

  function renderSidebar() {
    $('ls-session-count').textContent = state.sessions.length;
    var list = $('ls-session-list');
    list.innerHTML = state.sessions.map(function (s) {
      var tag = s.imported ? 'CSV' : s.type;
      return '<li><button type="button" data-id="' + esc(s.id) + '"' + (state.current === s ? ' aria-current="true"' : '') + '>' +
        '<span class="ls-si-top"><span class="ls-pill ls-pill--' + tag + '">' + esc(s.imported ? 'CSV' : DATA.types[s.type]) + '</span></span>' +
        '<span class="ls-si-name">' + esc(s.name) + '</span>' +
        '<span class="ls-si-sub">' + esc(driverOf(s)) + ' · ' + esc(s.circuit || 'Sin trazado') + '</span>' +
        '<span class="ls-si-best">' + LS.fmtLap(s.stats.bestMs) + '<span>' + s.stats.valid + ' v</span></span>' +
        '</button></li>';
    }).join('');
    $('ls-session-select').innerHTML = state.sessions.map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (state.current === s ? ' selected' : '') + '>' +
        esc(s.name + ' · ' + driverOf(s)) + '</option>';
    }).join('');
  }

  // ─── Cabecera y KPIs ────────────────────────────────────────────────────

  function renderHeader(s) {
    $('sh-kicker').textContent = (s.imported ? 'CSV importado' : DATA.types[s.type]) + ' · ' + fmtDate(s.date);
    $('sh-title').textContent = s.name;
    var meta = [
      ['Piloto', driverOf(s)],
      ['Vehículo', vehicleOf(s)],
      ['Circuito', s.circuit || 'Sin trazado'],
    ];
    if (s.cond) meta.push(['Pista', s.cond + (s.track ? ' · ' + s.track + ' °C' : '')]);
    $('sh-meta').innerHTML = meta.map(function (m) {
      return '<span>' + m[0] + ' <b>' + esc(m[1]) + '</b></span>';
    }).join('');
    $('sh-notes').textContent = s.notes || '';
    $('sh-notes').hidden = !s.notes;
  }

  function renderKpis(s) {
    var st = s.stats, sec = s.sectors;
    if (!st.valid) { $('sh-kpis').innerHTML = '<div class="ls-kpi">Sin vueltas válidas</div>'; return; }
    var cons = st.cov * 100 < 0.8 ? 'excelente' : st.cov * 100 < 1.5 ? 'razonable' : 'mejorable';
    var kpis = [
      { cls: 'best', label: 'Mejor vuelta', value: LS.fmtLap(st.bestMs), sub: 'vuelta ' + st.bestLap },
      { cls: 'theo', label: 'Theoretical best', value: sec ? LS.fmtLap(sec.theoretical) : '—', sub: sec ? LS.fmtGap(sec.theoretical - st.bestMs) + ' s' : 'sin sectores' },
      { label: 'Media', value: LS.fmtLap(st.avgMs), sub: 'mediana ' + LS.fmtLap(st.medianMs) },
      { label: 'Desv. típica', value: '±' + fmtS(st.stdMs), sub: 'IQR ' + fmtS(st.iqr) + ' s' },
      { label: 'Consistencia', value: (st.cov * 100).toFixed(2) + '%', sub: 'CoV · ' + cons },
      { label: 'Vueltas válidas', value: st.valid + '/' + st.total, sub: s.anomalies.flagged.length + ' atípica' + (s.anomalies.flagged.length === 1 ? '' : 's') },
    ];
    $('sh-kpis').innerHTML = kpis.map(function (k) {
      return '<div class="ls-kpi' + (k.cls ? ' ls-kpi--' + k.cls : '') + '"><span class="ls-label">' + k.label + '</span><b>' + k.value + '</b><small>' + k.sub + '</small></div>';
    }).join('');
  }

  // ─── Mapa del circuito y repetición ─────────────────────────────────────

  var map = { circuit: null, cum: null, total: 0, car: null, ghost: null, halo: null, secPaths: [], raf: null, t0: 0, playing: false, pauseUntil: 0 };

  function buildMap(s) {
    var el = $('ls-map');
    el.innerHTML = '';
    var c = circuitOf(s);
    map.circuit = c;
    $('map-circuit').textContent = c ? c.name + ' · ' + c.km.toFixed(3) + ' km' + (c.real ? ' · GPS' : '') : 'sin trazado';
    if (!c) {
      el.setAttribute('viewBox', '0 0 100 82');
      svg('text', { x: 50, y: 41, 'text-anchor': 'middle', class: 'trk-mark-t', style: 'font-size:3.4px' }, el).textContent = 'Sesión sin trazado asociado';
      return;
    }
    var pts = c.path.slice();
    var f = pts[0], l = pts[pts.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) pts.push(f);
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var pad = 6;
    el.setAttribute('viewBox', (minX - pad) + ' ' + (minY - pad) + ' ' + (maxX - minX + 2 * pad) + ' ' + (maxY - minY + 2 * pad));
    el.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    map.pts = pts;
    map.cum = [0];
    for (var i = 1; i < pts.length; i++) {
      map.cum.push(map.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    map.total = map.cum[map.cum.length - 1];

    var d = 'M' + pts.map(function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('L');
    svg('path', { d: d, class: 'trk-base' }, el);

    var bounds = [0, c.sb[0], c.sb[1], 1];
    map.bounds = bounds;
    map.secPaths = [];
    for (var k = 0; k < 3; k++) {
      var seg = [];
      var steps = 80;
      for (var j = 0; j <= steps; j++) seg.push(pointAt(bounds[k] + (bounds[k + 1] - bounds[k]) * j / steps));
      map.secPaths.push(svg('path', { d: 'M' + seg.map(function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('L'), class: 'trk-sec' }, el));
    }

    // Línea de meta perpendicular al trazado.
    var a = pointAt(0), b = pointAt(0.004);
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    svg('line', { x1: a[0] + Math.cos(ang) * 3, y1: a[1] + Math.sin(ang) * 3, x2: a[0] - Math.cos(ang) * 3, y2: a[1] - Math.sin(ang) * 3, class: 'trk-start' }, el);

    for (var m = 0; m < 3; m++) {
      var mid = pointAt((bounds[m] + bounds[m + 1]) / 2);
      var g = svg('g', {}, el);
      svg('rect', { x: mid[0] - 3, y: mid[1] - 1.9, width: 6, height: 3.8, class: 'trk-mark' }, g);
      svg('text', { x: mid[0], y: mid[1] + 0.85, 'text-anchor': 'middle', class: 'trk-mark-t' }, g).textContent = 'S' + (m + 1);
    }

    map.halo = svg('circle', { r: 3.2, class: 'car-halo' }, el);
    map.ghost = svg('circle', { r: 1.35, class: 'ghost' }, el);
    map.car = svg('circle', { r: 1.6, class: 'car' }, el);
    placeDot(map.car, 0); placeDot(map.halo, 0); placeDot(map.ghost, 0);
  }

  function pointAt(f) {
    f = ((f % 1) + 1) % 1;
    var target = f * map.total, cum = map.cum, pts = map.pts;
    var lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= target) lo = mid; else hi = mid; }
    var segLen = cum[hi] - cum[lo] || 1, r = (target - cum[lo]) / segLen;
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * r, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * r];
  }
  function placeDot(node, f) {
    if (!node || !map.circuit) return;
    var p = pointAt(f);
    node.setAttribute('cx', p[0].toFixed(2));
    node.setAttribute('cy', p[1].toFixed(2));
  }

  function lapSectors(lap) {
    if (lap.s1 && lap.s2 && lap.s3) return [lap.s1, lap.s2, lap.s3];
    var b = map.bounds || [0, 0.33, 0.66, 1];
    return [0, 1, 2].map(function (k) { return lap.ms * (b[k + 1] - b[k]); });
  }
  // Fracción del trazado recorrida a los t ms, interpolando dentro de cada sector.
  function fractionAt(lap, t) {
    var secs = lapSectors(lap), b = map.bounds, acc = 0;
    for (var k = 0; k < 3; k++) {
      if (t <= acc + secs[k]) return b[k] + (b[k + 1] - b[k]) * ((t - acc) / secs[k]);
      acc += secs[k];
    }
    return 1;
  }
  // Inversa: cuánto tarda una vuelta en llegar a la fracción f.
  function timeAtFraction(lap, f) {
    var secs = lapSectors(lap), b = map.bounds, acc = 0;
    for (var k = 0; k < 3; k++) {
      if (f <= b[k + 1]) return acc + secs[k] * ((f - b[k]) / (b[k + 1] - b[k]));
      acc += secs[k];
    }
    return acc;
  }

  function selectedLapObj() {
    var s = state.current;
    return s.laps.find(function (l) { return l.lap === state.selectedLap; }) || s.laps[0];
  }
  function bestLapObj() {
    var s = state.current;
    return s.laps.find(function (l) { return l.lap === s.stats.bestLap; });
  }

  function sectorClass(k, v) {
    var sec = state.current.sectors;
    if (!sec || !v) return '';
    var gap = v - sec.best[k];
    return gap <= 0 ? 'is-purple' : gap <= 150 ? 'is-green' : 'is-yellow';
  }

  function renderSectorTiles() {
    var lap = selectedLapObj(), sec = state.current.sectors;
    var colors = { 'is-purple': 'var(--purple)', 'is-green': 'var(--green)', 'is-yellow': 'var(--yellow)', '': 'var(--accent)' };
    $('ls-sector-tiles').innerHTML = ['s1', 's2', 's3'].map(function (key, k) {
      var v = lap[key], cls = sectorClass(k, v);
      if (map.secPaths[k]) map.secPaths[k].style.stroke = colors[cls];
      return '<div class="ls-sector ' + cls + '"><span class="ls-label">Sector ' + (k + 1) + '</span><b>' + (v ? fmtS(v) : '—') + '</b>' +
        '<small>' + (v && sec ? (v - sec.best[k] <= 0 ? 'mejor parcial' : LS.fmtGap(v - sec.best[k])) : 'sin datos') + '</small></div>';
    }).join('');
    var opts = state.current.laps.map(function (l) {
      return '<option value="' + l.lap + '"' + (l.lap === state.selectedLap ? ' selected' : '') + '>V' + l.lap + ' · ' + LS.fmtLap(l.ms) + (l.valid ? '' : ' (inválida)') + (l.lap === state.current.stats.bestLap ? ' ★' : '') + '</option>';
    }).join('');
    $('rp-lap').innerHTML = opts;
    $('tm-lap').textContent = 'V' + lap.lap;
  }

  var REPLAY_SPEED = 10; // 1 s de animación = 10 s de vuelta

  function tick(now) {
    if (!state.current || !map.circuit) return;
    var lap = selectedLapObj(), best = bestLapObj();
    if (map.pauseUntil) {
      if (now < map.pauseUntil) { map.raf = requestAnimationFrame(tick); return; }
      map.pauseUntil = 0;
      map.t0 = now;
    }
    var t = (now - map.t0) * REPLAY_SPEED;
    var showGhost = $('rp-ghost').checked && best && best !== lap;
    var end = Math.max(lap.ms, showGhost ? best.ms : 0);
    if (t >= end) {
      t = end;
      map.pauseUntil = now + 1400;
    }
    var fc = t >= lap.ms ? 1 : fractionAt(lap, t);
    placeDot(map.car, fc); placeDot(map.halo, fc);
    map.ghost.style.display = showGhost ? '' : 'none';
    if (showGhost) placeDot(map.ghost, t >= best.ms ? 1 : fractionAt(best, t));
    $('tm-clock').textContent = LS.fmtLap(Math.min(t, lap.ms));
    if (best) {
      var delta = (t >= lap.ms ? lap.ms : t) - timeAtFraction(best, fc);
      var dEl = $('tm-delta');
      dEl.textContent = LS.fmtGap(delta);
      dEl.style.color = delta <= 0 ? 'var(--green)' : 'var(--yellow)';
    }
    if (map.playing) map.raf = requestAnimationFrame(tick);
  }

  function play() {
    if (!map.circuit) return;
    cancelAnimationFrame(map.raf);
    map.playing = true;
    map.pauseUntil = 0;
    map.t0 = performance.now();
    $('rp-play').textContent = '❚❚ Pausa';
    map.raf = requestAnimationFrame(tick);
  }
  function stop() {
    map.playing = false;
    cancelAnimationFrame(map.raf);
    $('rp-play').textContent = '▶ Reproducir';
  }
  function showStatic() {
    // Sin animación: coloca el coche en meta y enseña el resultado final.
    var lap = selectedLapObj(), best = bestLapObj();
    placeDot(map.car, 0); placeDot(map.halo, 0);
    if (map.ghost) map.ghost.style.display = 'none';
    $('tm-clock').textContent = LS.fmtLap(lap.ms);
    $('tm-delta').textContent = best ? LS.fmtGap(lap.ms - best.ms) : '—';
    $('tm-delta').style.color = best && lap.ms - best.ms <= 0 ? 'var(--green)' : 'var(--yellow)';
  }

  // ─── Gráfico de vueltas ─────────────────────────────────────────────────

  function niceTicks(lo, hi, n) {
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / n)));
    var err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
    return out;
  }

  function chartSize(container, h) {
    var w = Math.max(280, container.clientWidth || 600);
    return { w: w, h: h };
  }

  function renderLapChart() {
    var s = state.current, box = $('ls-lapchart');
    box.innerHTML = '';
    var size = chartSize(box, window.innerWidth > 1180 ? 330 : 280), W = size.w, H = size.h;
    var M = { l: 58, r: 14, t: 14, b: 30 };
    var el = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, box);
    var laps = s.laps, n = laps.length;
    if (!n) return;
    var valid = LS.validLaps(laps).map(function (l) { return l.ms; });
    var all = laps.map(function (l) { return l.ms; });
    var lo = Math.min.apply(null, all);
    var med = LS.median(valid.length ? valid : all);
    var spread = Math.max(1500, 4 * LS.std(valid.length > 2 ? valid : all));
    var cap = Math.min(Math.max.apply(null, all), med + spread);
    var pad = (cap - lo) * 0.08 || 500;
    var y0 = lo - pad, y1 = cap + pad;
    function X(lap) { return M.l + (n === 1 ? 0.5 : (lap - laps[0].lap) / (laps[n - 1].lap - laps[0].lap)) * (W - M.l - M.r); }
    function Y(ms) { return M.t + (1 - (Math.min(ms, y1) - y0) / (y1 - y0)) * (H - M.t - M.b); }

    niceTicks(y0, y1, 5).forEach(function (v) {
      svg('line', { x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v), class: 'grid' }, el);
      svg('text', { x: M.l - 8, y: Y(v) + 3, 'text-anchor': 'end', class: 'tick' }, el).textContent = LS.fmtLap(v);
    });
    var xStep = Math.max(1, Math.ceil(n / 12));
    laps.forEach(function (l, i) {
      if (i % xStep === 0 || i === n - 1) svg('text', { x: X(l.lap), y: H - 10, 'text-anchor': 'middle', class: 'tick' }, el).textContent = l.lap;
    });
    svg('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b, class: 'ax' }, el);

    if (s.stats.bestMs) {
      svg('rect', { x: M.l, width: W - M.l - M.r, y: Y(s.stats.bestMs) - 1, height: 2, class: 'bestband' }, el);
    }

    var vl = laps.filter(function (l) { return l.valid; });
    svg('path', { d: 'M' + vl.map(function (l) { return X(l.lap).toFixed(1) + ' ' + Y(l.ms).toFixed(1); }).join('L'), class: 'lapline' }, el);

    s.stintsRes.stints.forEach(function (st) {
      if (!st.fit || st.laps.length < 3) return;
      var a = st.laps.length > 3 ? st.laps[1] : st.laps[0], b = st.laps[st.laps.length - 1];
      svg('line', { x1: X(a), y1: Y(st.fit.predict(a)), x2: X(b), y2: Y(st.fit.predict(b)), class: 'fit', style: 'stroke:' + (COMPOUND_COLOR[st.compound] || 'var(--accent)') }, el);
    });

    var flagged = s.anomalies.flagged;
    laps.forEach(function (l) {
      var x = X(l.lap), y = Y(l.ms), capped = l.ms > y1;
      if (flagged.indexOf(l.lap) >= 0) svg('circle', { cx: x, cy: y, r: 8, class: 'anom' }, el);
      if (l.lap === state.selectedLap) svg('circle', { cx: x, cy: y, r: 7.5, class: 'pt-sel' }, el);
      var color = l.valid ? (COMPOUND_COLOR[l.compound] || 'var(--accent)') : 'var(--mute)';
      var node;
      if (capped) {
        node = svg('path', { d: 'M' + (x - 5) + ' ' + (y + 4) + 'L' + x + ' ' + (y - 4) + 'L' + (x + 5) + ' ' + (y + 4) + 'Z', class: 'pt', style: 'fill:' + color }, el);
      } else {
        node = svg('circle', { cx: x, cy: y, r: 4.5, class: 'pt', style: l.valid ? 'fill:' + color : 'fill:var(--s1);stroke:' + color + ';stroke-width:1.5' }, el);
      }
      if (l.lap === s.stats.bestLap) svg('circle', { cx: x, cy: y, r: 2, style: 'fill:var(--purple);pointer-events:none' }, el);
      node.addEventListener('mousemove', function (e) {
        var gap = l.ms - s.stats.bestMs;
        showTip('<b>Vuelta ' + l.lap + '</b>' + (l.lap === s.stats.bestLap ? ' ★ mejor' : '') + '<br>' + LS.fmtLap(l.ms) + '  ' + (gap ? LS.fmtGap(gap) : '') +
          (l.s1 ? '<br>S1 ' + fmtS(l.s1) + ' · S2 ' + fmtS(l.s2) + ' · S3 ' + fmtS(l.s3) : '') +
          (l.compound ? '<br>' + COMPOUND_LABEL[l.compound] : '') + (l.valid ? '' : '<br>Inválida' + (l.note ? ': ' + esc(l.note) : '')) +
          (flagged.indexOf(l.lap) >= 0 ? '<br>⚑ atípica (Isolation Forest)' : ''), e);
      });
      node.addEventListener('mouseleave', hideTip);
      node.addEventListener('click', function () { hideTip(); selectLap(l.lap, true); });
    });

    var comps = {};
    laps.forEach(function (l) { if (l.compound) comps[l.compound] = 1; });
    $('chart-legend').innerHTML = Object.keys(comps).map(function (c) {
      return '<span><i style="background:' + COMPOUND_COLOR[c] + '"></i>' + COMPOUND_LABEL[c] + '</span>';
    }).join('') + '<span><i style="background:var(--purple)"></i>Mejor</span>' + (flagged.length ? '<span><i class="ring"></i>Atípica</span>' : '');
  }

  function renderStints() {
    var s = state.current;
    var stints = s.stintsRes.stints;
    $('ls-stints').innerHTML = stints.map(function (st) {
      var color = COMPOUND_COLOR[st.compound] || 'var(--accent)';
      return '<div class="ls-stint" style="border-left-color:' + color + '"><span class="ls-label">Stint ' + (st.index + 1) + (st.compound ? ' · ' + COMPOUND_LABEL[st.compound] : '') + '</span>' +
        '<div>V' + st.laps[0] + '–V' + st.laps[st.laps.length - 1] + ' · ' + st.count + ' vueltas</div>' +
        '<div>Mejor <b>' + LS.fmtLap(st.bestMs) + '</b></div>' +
        '<div>Degradación ' + (st.degMs != null ? (st.degMs >= 0 ? '+' : '') + Math.round(st.degMs) + ' ms/v' : '—') + '</div></div>';
    }).join('') + (stints.length ? '<div class="ls-stint"><span class="ls-label">Método</span><div>' + (s.stintsRes.method === 'compuesto' ? 'Por cambio de compuesto' : 'K-means 1D + penalización BIC') + '</div><div>Fit lineal sin vuelta de salida</div></div>' : '');
  }

  // ─── Tabla de vueltas ───────────────────────────────────────────────────

  function heat(gap) {
    if (gap == null) return '';
    if (gap <= 0) return 'background:color-mix(in srgb, var(--purple) 22%, transparent)';
    var k = Math.min(1, gap / 700);
    return 'background:hsl(' + Math.round(140 - 140 * k) + ' 70% 50% / ' + (0.1 + 0.18 * k).toFixed(2) + ')';
  }

  function renderTable() {
    var s = state.current, sec = s.sectors, flagged = s.anomalies.flagged;
    var head = '<thead><tr><th>V</th><th>Tiempo</th><th>Gap</th><th>S1</th><th>S2</th><th>S3</th><th>Comp.</th><th>Válida</th></tr></thead>';
    var body = s.laps.map(function (l) {
      var gap = l.ms - s.stats.bestMs;
      var cells = ['s1', 's2', 's3'].map(function (k, i) {
        var v = l[k];
        if (!v) return '<td>—</td>';
        var g = sec && l.valid ? v - sec.best[i] : null;
        return '<td style="' + heat(g) + '"' + (g != null && g <= 0 ? ' class="is-best"' : '') + '>' + fmtS(v) + '</td>';
      }).join('');
      return '<tr data-lap="' + l.lap + '" class="' + (l.lap === state.selectedLap ? 'is-sel ' : '') + (l.valid ? '' : 'is-invalid') + '">' +
        '<td>' + l.lap + (flagged.indexOf(l.lap) >= 0 ? '<span class="ls-flag" title="Atípica según Isolation Forest">⚑</span>' : '') + '</td>' +
        '<td' + (l.lap === s.stats.bestLap ? ' class="is-best"' : '') + '>' + LS.fmtLap(l.ms) + '</td>' +
        '<td>' + (l.valid && s.stats.bestMs ? (gap === 0 ? '—' : LS.fmtGap(gap)) : esc(l.note || 'inválida')) + '</td>' +
        cells +
        '<td>' + (l.compound ? '<span style="color:' + COMPOUND_COLOR[l.compound] + '">● </span>' + l.compound : '—') + '</td>' +
        '<td class="ls-c-valid"><input type="checkbox" aria-label="Vuelta ' + l.lap + ' válida"' + (l.valid ? ' checked' : '') + '></td></tr>';
    }).join('');
    $('ls-laps').innerHTML = head + '<tbody>' + body + '</tbody>';
  }

  function renderInsights() {
    var ins = state.current.insights;
    $('ins-count').textContent = ins.length + ' hallazgos';
    $('ls-insights').innerHTML = ins.map(function (i) {
      return '<li class="' + i.sev + '"><b>' + esc(i.title) + '</b><p>' + esc(i.detail) + '</p></li>';
    }).join('');
  }

  // ─── Orquestación de la vista de sesión ─────────────────────────────────

  function openSession(id, opts) {
    var s = byId(id) || state.sessions[0];
    state.current = s;
    state.selectedLap = s.stats.bestLap || s.laps[0].lap;
    renderSidebar();
    renderHeader(s);
    renderKpis(s);
    buildMap(s);
    renderSectorTiles();
    renderLapChart();
    renderStints();
    renderTable();
    renderInsights();
    if (!opts || !opts.keepHash) setHash();
    stop();
    if (map.circuit && !REDUCED && state.view === 'session') play(); else showStatic();
  }

  function selectLap(lap, replay) {
    state.selectedLap = lap;
    renderSectorTiles();
    renderLapChart();
    renderTable();
    if (replay && map.circuit && !REDUCED) play(); else if (!map.playing) showStatic();
  }

  function toggleValid(lapNo, valid) {
    var s = state.current;
    var lap = s.laps.find(function (l) { return l.lap === lapNo; });
    lap.valid = valid;
    if (!valid && !lap.note) lap.note = 'invalidada';
    if (valid && lap.note === 'invalidada') lap.note = null;
    if (LS.validLaps(s.laps).length === 0) { lap.valid = true; return renderTable(); }
    analyse(s);
    if (s.imported) saveImports();
    renderSidebar();
    renderKpis(s);
    renderSectorTiles();
    renderLapChart();
    renderStints();
    renderTable();
    renderInsights();
  }

  // ─── Comparar ───────────────────────────────────────────────────────────

  // Vueltas representativas de ritmo: válidas y sin la primera de cada stint (vuelta de salida).
  function paceLaps(s) {
    var firsts = s.stintsRes.stints.map(function (st) { return st.laps[0]; });
    var laps = LS.validLaps(s.laps).filter(function (l) { return firsts.indexOf(l.lap) < 0; });
    return laps.length >= 2 ? laps : LS.validLaps(s.laps);
  }

  function sessionLabel(s) { return driverOf(s) + ' · ' + s.name; }

  function renderCompareOptions() {
    ['cmp-a', 'cmp-b'].forEach(function (id) {
      var cur = id === 'cmp-a' ? state.cmpA : state.cmpB;
      $(id).innerHTML = state.sessions.map(function (s) {
        return '<option value="' + esc(s.id) + '"' + (s.id === cur ? ' selected' : '') + '>' + esc(sessionLabel(s)) + '</option>';
      }).join('');
    });
  }

  function renderCompare() {
    var A = byId(state.cmpA) || state.sessions[0], B = byId(state.cmpB) || state.sessions[1];
    state.cmpA = A.id; state.cmpB = B.id;
    renderCompareOptions();
    var la = paceLaps(A), lb = paceLaps(B);
    var ta = la.map(function (l) { return l.ms; }), tb = lb.map(function (l) { return l.ms; });
    var w = LS.welchTTest(ta, tb), mw = LS.mannWhitneyU(ta, tb);
    var nameA = driverOf(A), nameB = driverOf(B);
    if (A === B) { nameA += ' (A)'; nameB += ' (B)'; }

    var v = $('cmp-verdict');
    if (!w) {
      v.innerHTML = '<h2>Faltan vueltas para comparar</h2><p>Cada lado necesita al menos dos vueltas válidas de ritmo.</p>';
    } else {
      var faster = w.diff < 0 ? nameA : nameB, slower = w.diff < 0 ? nameB : nameA;
      var sig = w.p < 0.05;
      var sameCircuit = A.circuit && A.circuit === B.circuit;
      var prob = mw ? (w.diff < 0 ? mw.probAFaster : 1 - mw.probAFaster) : null;
      v.innerHTML = '<h2><em>' + esc(faster) + '</em> rueda ' + fmtS(Math.abs(w.diff)) + ' s por vuelta más rápido que ' + esc(slower) + '.</h2>' +
        '<p>' + (sig
          ? 'La diferencia es estadísticamente significativa (Welch p ' + pEq(w.p) + ') con un efecto ' + LS.cohenLabel(w.d) + ' (d = ' + Math.abs(w.d).toFixed(2) + '). '
          : 'Con estas vueltas no se puede descartar que sea ruido (Welch p ' + pEq(w.p) + ', efecto ' + LS.cohenLabel(w.d) + '). ') +
        (prob != null ? 'Si emparejas una vuelta de cada uno al azar, ' + esc(faster) + ' gana el ' + Math.round(prob * 100) + '% de las veces.' : '') +
        (sameCircuit ? '' : ' Ojo: son circuitos distintos, así que esto compara ritmo absoluto, no rendimiento.') + '</p>';
    }

    renderKde($('cmp-kde'), ta, tb);
    renderOverlay($('cmp-laps'), la, lb);

    $('cmp-tests').innerHTML = '<thead><tr><th>Test</th><th>Estadístico</th><th>p-value</th><th>Lectura</th></tr></thead><tbody>' +
      (w ? '<tr><td>Welch t-test</td><td>t = ' + w.t.toFixed(2) + ' · gl ' + w.df.toFixed(1) + '</td><td>' + fmtP(w.p) + '</td><td>' + sigLabel(w.p) + '</td></tr>' : '') +
      (mw ? '<tr><td>Mann-Whitney U</td><td>U = ' + mw.u.toFixed(0) + ' · z ' + mw.z.toFixed(2) + '</td><td>' + fmtP(mw.p) + '</td><td>' + sigLabel(mw.p) + '</td></tr>' : '') +
      (w ? '<tr><td>Cohen d</td><td>' + w.d.toFixed(2) + '</td><td>—</td><td>' + LS.cohenLabel(w.d) + '</td></tr>' : '') +
      (mw ? '<tr><td>P(A más rápido)</td><td>' + (mw.probAFaster * 100).toFixed(0) + '%</td><td>—</td><td>superioridad</td></tr>' : '') +
      '</tbody>';

    var rows = [
      ['Piloto', esc(driverOf(A)), esc(driverOf(B))],
      ['Circuito', esc(A.circuit || '—'), esc(B.circuit || '—')],
      ['Vueltas de ritmo', ta.length, tb.length],
      ['Mejor', LS.fmtLap(Math.min.apply(null, ta)), LS.fmtLap(Math.min.apply(null, tb))],
      ['Media', LS.fmtLap(LS.mean(ta)), LS.fmtLap(LS.mean(tb))],
      ['Mediana', LS.fmtLap(LS.median(ta)), LS.fmtLap(LS.median(tb))],
      ['Desv. típica', '±' + fmtS(LS.std(ta)), '±' + fmtS(LS.std(tb))],
      ['Theoretical best', A.sectors ? LS.fmtLap(A.sectors.theoretical) : '—', B.sectors ? LS.fmtLap(B.sectors.theoretical) : '—'],
    ];
    $('cmp-summary').innerHTML = '<thead><tr><th></th><th><span class="ls-dot ls-dot--a"></span> A</th><th><span class="ls-dot ls-dot--b"></span> B</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') + '</tbody>';
    setHash();
  }

  function pEq(p) { return p < 0.001 ? '< 0.001' : '= ' + p.toFixed(3); }
  function fmtP(p) { return p < 0.001 ? '< 0.001' : p.toFixed(3); }
  function sigLabel(p) { return p < 0.01 ? 'muy significativo' : p < 0.05 ? 'significativo' : p < 0.1 ? 'marginal' : 'no significativo'; }

  function renderKde(box, ta, tb) {
    box.innerHTML = '';
    var size = chartSize(box, 260), W = size.w, H = size.h, M = { l: 16, r: 16, t: 14, b: 30 };
    var el = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, box);
    var all = ta.concat(tb);
    var sd = LS.std(all) || 300;
    var lo = Math.min.apply(null, all) - sd, hi = Math.max.apply(null, all) + sd;
    var N = 140, xs = [];
    for (var i = 0; i < N; i++) xs.push(lo + (hi - lo) * i / (N - 1));
    var da = LS.kde(ta, xs), db = LS.kde(tb, xs);
    var ymax = Math.max.apply(null, da.concat(db)) * 1.1 || 1;
    function X(v) { return M.l + (v - lo) / (hi - lo) * (W - M.l - M.r); }
    function Y(v) { return M.t + (1 - v / ymax) * (H - M.t - M.b - 12); }
    niceTicks(lo, hi, 5).forEach(function (v) {
      svg('line', { x1: X(v), x2: X(v), y1: M.t, y2: H - M.b, class: 'grid' }, el);
      svg('text', { x: X(v), y: H - 10, 'text-anchor': 'middle', class: 'tick' }, el).textContent = LS.fmtLap(v);
    });
    [[da, 'kde-a'], [db, 'kde-b']].forEach(function (pair) {
      var d = 'M' + X(xs[0]) + ' ' + Y(0) + xs.map(function (x, i) { return 'L' + X(x).toFixed(1) + ' ' + Y(pair[0][i]).toFixed(1); }).join('') + 'L' + X(xs[N - 1]) + ' ' + Y(0) + 'Z';
      svg('path', { d: d, class: pair[1] }, el);
    });
    var base = H - M.b;
    ta.forEach(function (v) { svg('line', { x1: X(v), x2: X(v), y1: base - 10, y2: base - 4, class: 'rug-a' }, el); });
    tb.forEach(function (v) { svg('line', { x1: X(v), x2: X(v), y1: base - 4, y2: base + 2, class: 'rug-b' }, el); });
    svg('line', { x1: X(LS.mean(ta)), x2: X(LS.mean(ta)), y1: M.t, y2: base, class: 'mean-a' }, el);
    svg('line', { x1: X(LS.mean(tb)), x2: X(LS.mean(tb)), y1: M.t, y2: base, class: 'mean-b' }, el);
    svg('line', { x1: M.l, x2: W - M.r, y1: base, y2: base, class: 'ax' }, el);
  }

  function renderOverlay(box, la, lb) {
    box.innerHTML = '';
    var size = chartSize(box, 260), W = size.w, H = size.h, M = { l: 58, r: 14, t: 14, b: 30 };
    var el = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, box);
    var all = la.concat(lb);
    var times = all.map(function (l) { return l.ms; });
    var lo = Math.min.apply(null, times), hi = Math.max.apply(null, times), pad = (hi - lo) * 0.1 || 300;
    var maxLap = Math.max.apply(null, all.map(function (l) { return l.lap; })), minLap = Math.min.apply(null, all.map(function (l) { return l.lap; }));
    function X(v) { return M.l + (maxLap === minLap ? 0.5 : (v - minLap) / (maxLap - minLap)) * (W - M.l - M.r); }
    function Y(v) { return M.t + (1 - (v - lo + pad) / (hi - lo + 2 * pad)) * (H - M.t - M.b); }
    niceTicks(lo - pad, hi + pad, 5).forEach(function (v) {
      svg('line', { x1: M.l, x2: W - M.r, y1: Y(v), y2: Y(v), class: 'grid' }, el);
      svg('text', { x: M.l - 8, y: Y(v) + 3, 'text-anchor': 'end', class: 'tick' }, el).textContent = LS.fmtLap(v);
    });
    for (var v = minLap; v <= maxLap; v += Math.max(1, Math.ceil((maxLap - minLap) / 12))) {
      svg('text', { x: X(v), y: H - 10, 'text-anchor': 'middle', class: 'tick' }, el).textContent = v;
    }
    svg('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b, class: 'ax' }, el);
    [[la, 'a'], [lb, 'b']].forEach(function (pair) {
      var laps = pair[0];
      svg('path', { d: 'M' + laps.map(function (l) { return X(l.lap).toFixed(1) + ' ' + Y(l.ms).toFixed(1); }).join('L'), class: 'line-' + pair[1] }, el);
      laps.forEach(function (l) {
        var c = svg('circle', { cx: X(l.lap), cy: Y(l.ms), r: 3.5, style: 'fill:var(--' + pair[1] + ')', class: 'pt' }, el);
        c.addEventListener('mousemove', function (e) { showTip('<b>' + pair[1].toUpperCase() + ' · V' + l.lap + '</b><br>' + LS.fmtLap(l.ms), e); });
        c.addEventListener('mouseleave', hideTip);
      });
    });
  }

  // ─── Importar ───────────────────────────────────────────────────────────

  function sampleCsv() {
    var laps = LS.generateLaps([
      { laps: 9, best: 100800, deg: 70, compound: 'M', split: [0.35, 0.37] },
      { laps: 8, best: 100300, deg: 95, compound: 'S', split: [0.35, 0.37] },
    ], 7331);
    laps[6].ms += 2600; laps[6].s2 += 2600; // un trompo en S2 para que salte una anomalía
    return '// Ejemplo: tanda en Barcelona-Catalunya con medio y blando\n' + LS.toCsv(laps);
  }

  function setMsg(text, kind) {
    var m = $('imp-msg');
    m.textContent = text;
    m.className = 'ls-msg' + (kind ? ' is-' + kind : '');
  }

  var importName = null;

  function importText(text, filename) {
    var parsed;
    try { parsed = LS.parseCsv(text); } catch (e) { setMsg(e.message, 'err'); return; }
    if (!parsed.laps.some(function (l) { return l.valid; })) { setMsg('Todas las vueltas están marcadas como inválidas.', 'err'); return; }
    var circuit = $('imp-circuit').value;
    var s = {
      id: 'csv-' + Date.now().toString(36),
      name: filename ? filename.replace(/\.(csv|txt)$/i, '') : 'Sesión importada',
      circuit: circuit || null,
      driverName: ($('imp-driver').value || 'Yo').trim(),
      vehicleName: '—',
      type: 'CSV',
      imported: true,
      date: new Date(),
      notes: parsed.laps.length + ' vueltas importadas · columnas detectadas: ' + parsed.columns.map(function (c) { return { lap: 'vuelta', ms: 'tiempo', s1: 'S1', s2: 'S2', s3: 'S3', compound: 'compuesto', valid: 'válida' }[c]; }).join(', ') + ' · separador "' + parsed.delimiter + '".',
      laps: parsed.laps,
    };
    analyse(s);
    state.sessions.push(s);
    saveImports();
    setMsg('✓ ' + parsed.laps.length + ' vueltas leídas. Abriendo la sesión…', 'ok');
    state.cmpB = s.id;
    setTimeout(function () { switchView('session'); openSession(s.id); window.scrollTo(0, 0); }, 350);
  }

  function readFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMsg('El archivo pesa más de 2 MB; exporta sólo los tiempos por vuelta.', 'err'); return; }
    var r = new FileReader();
    r.onload = function () { $('imp-text').value = r.result; importName = file.name; importText(r.result, file.name); };
    r.readAsText(file);
  }

  // ─── Navegación ─────────────────────────────────────────────────────────

  function switchView(view) {
    state.view = view;
    document.querySelectorAll('.ls-tabs button').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.view === view ? 'true' : 'false');
    });
    document.querySelectorAll('.ls-view').forEach(function (v) { v.hidden = v.dataset.view !== view; });
    if (view === 'compare') { stop(); renderCompare(); }
    else if (view === 'session') { renderLapChart(); if (map.circuit && !REDUCED) play(); }
    else stop();
    setHash();
  }

  function setHash() {
    var h = state.view === 'compare' ? '#/comparar/' + state.cmpA + '/' + state.cmpB
      : state.view === 'import' ? '#/importar'
      : '#/sesion/' + (state.current ? state.current.id : '');
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  function readHash() {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'comparar') {
      if (byId(parts[1])) state.cmpA = parts[1];
      if (byId(parts[2])) state.cmpB = parts[2];
      return 'compare';
    }
    if (parts[0] === 'importar') return 'import';
    if (parts[0] === 'sesion' && byId(parts[1])) return parts[1];
    return null;
  }

  // ─── Arranque ───────────────────────────────────────────────────────────

  function init() {
    loadImports();
    state.sessions.forEach(analyse);

    $('imp-circuit').innerHTML = '<option value="">Sin trazado</option>' + CIRCUITS.map(function (c) {
      return '<option' + (c.name === 'Circuit de Barcelona-Catalunya' ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');

    var route = readHash();
    var firstSession = route && route !== 'compare' && route !== 'import' ? route : 'jarama-race';
    openSession(firstSession, { keepHash: true });
    if (route === 'compare' || route === 'import') switchView(route); else setHash();

    $('ls-session-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (!b) return;
      if (state.view !== 'session') switchView('session');
      openSession(b.dataset.id);
    });
    $('ls-session-select').addEventListener('change', function () {
      if (state.view !== 'session') switchView('session');
      openSession(this.value);
    });
    document.querySelectorAll('.ls-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { switchView(b.dataset.view); });
    });

    $('rp-play').addEventListener('click', function () { if (map.playing) { stop(); } else play(); });
    $('rp-lap').addEventListener('change', function () { selectLap(+this.value, true); });
    $('rp-ghost').addEventListener('change', function () { if (!map.playing) showStatic(); });

    $('ls-laps').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-lap]');
      if (!tr) return;
      var lap = +tr.dataset.lap;
      if (e.target.matches('input[type="checkbox"]')) { toggleValid(lap, e.target.checked); return; }
      selectLap(lap, true);
    });

    $('sh-export').addEventListener('click', function () {
      var s = state.current;
      var blob = new Blob([LS.toCsv(s.laps)], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lapsight-' + s.id + '.csv';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('sh-compare').addEventListener('click', function () {
      var s = state.current;
      // Rival por defecto: otra sesión del mismo circuito o, si no hay, la siguiente de la lista.
      var rival = state.sessions.find(function (o) { return o !== s && o.circuit && o.circuit === s.circuit; }) ||
        state.sessions[(state.sessions.indexOf(s) + 1) % state.sessions.length];
      state.cmpA = s.id; state.cmpB = rival.id;
      switchView('compare');
      window.scrollTo(0, 0);
    });

    $('cmp-a').addEventListener('change', function () { state.cmpA = this.value; renderCompare(); });
    $('cmp-b').addEventListener('change', function () { state.cmpB = this.value; renderCompare(); });
    $('cmp-swap').addEventListener('click', function () { var t = state.cmpA; state.cmpA = state.cmpB; state.cmpB = t; renderCompare(); });

    $('imp-file').addEventListener('change', function () { readFile(this.files[0]); this.value = ''; });
    var drop = $('imp-drop');
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { readFile(e.dataTransfer.files[0]); });
    $('imp-sample').addEventListener('click', function () {
      $('imp-text').value = sampleCsv();
      $('imp-circuit').value = 'Circuit de Barcelona-Catalunya';
      importName = 'Tanda de ejemplo · Catalunya';
      setMsg('Ejemplo cargado. Pulsa «Analizar sesión».');
    });
    $('imp-download').addEventListener('click', function () {
      var blob = new Blob([sampleCsv()], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lapsight-ejemplo.csv';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('imp-text').addEventListener('input', function () { importName = null; });
    $('imp-go').addEventListener('click', function () {
      var text = $('imp-text').value;
      if (!text.trim()) { setMsg('Pega un CSV o carga el ejemplo primero.', 'err'); return; }
      importText(text, importName);
    });

    $('ls-theme').addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      this.textContent = next === 'light' ? '☾' : '☀';
      try { localStorage.setItem('a-theme', next); } catch (e) { /* sin persistencia */ }
    });
    $('ls-theme').textContent = document.documentElement.dataset.theme === 'light' ? '☾' : '☀';

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (state.view === 'session') renderLapChart();
        if (state.view === 'compare') renderCompare();
      }, 120);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
    });
  }

  init();
})();
