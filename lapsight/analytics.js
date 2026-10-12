/*
 * LapSight · motor analítico en el navegador.
 *
 * Port a JavaScript del servicio FastAPI de LapSight (python/app/analytics.py e
 * insights.py) y de las utilidades estadísticas del frontend. Sin dependencias:
 * todo lo que antes hacían pandas, numpy, scipy y scikit-learn se calcula aquí.
 *
 * Una vuelta es { lap, ms, s1, s2, s3, compound, valid, note }.
 */
(function (root) {
  'use strict';

  // ─── Utilidades ──────────────────────────────────────────────────────────

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(rng) {
    var u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function sum(xs) { var s = 0; for (var i = 0; i < xs.length; i++) s += xs[i]; return s; }
  function mean(xs) { return xs.length ? sum(xs) / xs.length : 0; }
  function variance(xs, sample) {
    if (xs.length < 2) return 0;
    var m = mean(xs), ss = 0;
    for (var i = 0; i < xs.length; i++) ss += (xs[i] - m) * (xs[i] - m);
    return ss / (sample === false ? xs.length : xs.length - 1);
  }
  function std(xs, sample) { return Math.sqrt(variance(xs, sample)); }
  function sorted(xs) { return xs.slice().sort(function (a, b) { return a - b; }); }
  // Percentil con interpolación lineal (equivale a numpy.percentile por defecto).
  function percentile(xs, p) {
    if (!xs.length) return 0;
    var s = sorted(xs), idx = (s.length - 1) * p / 100;
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  }
  function median(xs) { return percentile(xs, 50); }

  function fmtLap(ms) {
    if (ms == null || !isFinite(ms)) return '—';
    var neg = ms < 0; ms = Math.abs(ms);
    var s = ms / 1000;
    var out;
    if (s < 60) out = s.toFixed(3);
    else {
      var m = Math.floor(s / 60);
      var r = s - m * 60;
      out = m + ':' + (r < 10 ? '0' : '') + r.toFixed(3);
    }
    return (neg ? '-' : '') + out;
  }
  function fmtGap(ms) {
    if (ms == null || !isFinite(ms)) return '—';
    return (ms >= 0 ? '+' : '−') + (Math.abs(ms) / 1000).toFixed(3);
  }

  function validLaps(laps) { return laps.filter(function (l) { return l.valid; }); }

  // ─── Estadística descriptiva ────────────────────────────────────────────

  function computeStats(laps) {
    var valid = validLaps(laps);
    var res = { total: laps.length, valid: valid.length, invalid: laps.length - valid.length };
    if (!valid.length) return res;
    var times = valid.map(function (l) { return l.ms; });
    var best = valid.reduce(function (a, b) { return b.ms < a.ms ? b : a; });
    var avg = mean(times), sd = std(times, false);
    res.bestMs = best.ms;
    res.bestLap = best.lap;
    res.worstMs = Math.max.apply(null, times);
    res.avgMs = avg;
    res.medianMs = median(times);
    res.stdMs = sd;
    res.p25 = percentile(times, 25);
    res.p75 = percentile(times, 75);
    res.iqr = res.p75 - res.p25;
    res.cov = avg ? sd / avg : null;
    return res;
  }

  // ─── Regresión polinómica (mínimos cuadrados por ecuaciones normales) ──

  function solve(A, b) {
    var n = b.length, M = A.map(function (row, i) { return row.concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      if (Math.abs(M[c][c]) < 1e-12) return null;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === c) continue;
        var f = M[r2][c] / M[c][c];
        for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k];
      }
    }
    return M.map(function (row, i) { return row[n] / row[i]; });
  }

  // Devuelve coeficientes de mayor a menor grado, como numpy.polyfit.
  function polyfit(x, y, degree) {
    // Centrar x mejora el condicionamiento numérico.
    var cx = mean(x);
    var xs = x.map(function (v) { return v - cx; });
    var n = degree + 1, A = [], b = [];
    for (var i = 0; i < n; i++) {
      A.push([]);
      for (var j = 0; j < n; j++) A[i].push(sum(xs.map(function (v) { return Math.pow(v, i + j); })));
      b.push(sum(xs.map(function (v, k) { return Math.pow(v, i) * y[k]; })));
    }
    var c = solve(A, b);
    if (!c) return null;
    // c[i] es el coeficiente de (x - cx)^i: la predicción se hace en espacio centrado.
    var predict = function (v) {
      var d = v - cx, out = 0;
      for (var i = 0; i < c.length; i++) out += c[i] * Math.pow(d, i);
      return out;
    };
    var my = mean(y), ssRes = 0, ssTot = 0;
    for (var k = 0; k < x.length; k++) {
      ssRes += Math.pow(y[k] - predict(x[k]), 2);
      ssTot += Math.pow(y[k] - my, 2);
    }
    // Pendiente en el punto medio = coeficiente lineal centrado.
    return { degree: degree, slope: c[1] || 0, r2: ssTot > 0 ? 1 - ssRes / ssTot : 1, predict: predict };
  }

  function computeDegradation(laps) {
    var valid = validLaps(laps);
    if (valid.length < 3) return null;
    var x = valid.map(function (l) { return l.lap; });
    var y = valid.map(function (l) { return l.ms; });
    var linear = polyfit(x, y, 1);
    var poly = polyfit(x, y, Math.min(2, x.length - 1));
    if (!linear) return null;
    var chosen = poly && poly.r2 - linear.r2 > 0.1 ? 'polynomial' : 'linear';
    return { linear: linear, polynomial: poly, chosen: chosen };
  }

  // ─── Stints: por compuesto o k-means 1D con penalización tipo BIC ──────

  function kmeans1d(values, k) {
    var s = sorted(values);
    var centers = [];
    for (var i = 0; i < k; i++) centers.push(s[Math.min(s.length - 1, Math.floor((i + 0.5) * s.length / k))]);
    var labels = new Array(values.length);
    for (var it = 0; it < 50; it++) {
      var changed = false;
      for (var j = 0; j < values.length; j++) {
        var best = 0;
        for (var c = 1; c < k; c++) if (Math.abs(values[j] - centers[c]) < Math.abs(values[j] - centers[best])) best = c;
        if (labels[j] !== best) { labels[j] = best; changed = true; }
      }
      for (var c2 = 0; c2 < k; c2++) {
        var members = values.filter(function (_, idx) { return labels[idx] === c2; });
        if (members.length) centers[c2] = mean(members);
      }
      if (!changed) break;
    }
    var inertia = 0;
    for (var q = 0; q < values.length; q++) inertia += Math.pow(values[q] - centers[labels[q]], 2);
    return { labels: labels, inertia: inertia };
  }

  function detectStints(laps, maxStints) {
    maxStints = maxStints || 4;
    var valid = validLaps(laps);
    if (valid.length < 2) return { method: 'none', stints: [] };
    var idx = [], method;
    var hasCompound = valid.some(function (l) { return l.compound; });
    if (hasCompound) {
      method = 'compuesto';
      var cur = -1, prev = null;
      valid.forEach(function (l) { if (l.compound !== prev) { cur++; prev = l.compound; } idx.push(cur); });
    } else {
      method = 'k-means 1D';
      var times = valid.map(function (l) { return l.ms; });
      var v = variance(times, false) || 1, bestK = 1, bestScore = Infinity, bestLabels = null;
      for (var k = 1; k <= Math.min(maxStints, times.length); k++) {
        var km = kmeans1d(times, k);
        var score = km.inertia + k * v * 0.15 * times.length;
        if (score < bestScore) { bestScore = score; bestK = k; bestLabels = km.labels; }
      }
      var remap = {}, next = 0;
      bestLabels.forEach(function (l) { if (!(l in remap)) remap[l] = next++; });
      idx = bestLabels.map(function (l) { return remap[l]; });
    }
    var groups = {};
    valid.forEach(function (l, i) { (groups[idx[i]] = groups[idx[i]] || []).push(l); });
    var stints = Object.keys(groups).map(Number).sort(function (a, b) { return a - b; }).map(function (k) {
      var g = groups[k], t = g.map(function (l) { return l.ms; });
      // La degradación se mide sin la vuelta de salida del stint, que distorsiona la pendiente.
      var body = g.length > 3 ? g.slice(1) : g;
      var fit = body.length >= 2 ? polyfit(body.map(function (l) { return l.lap; }), body.map(function (l) { return l.ms; }), 1) : null;
      var counts = {};
      g.forEach(function (l) { if (l.compound) counts[l.compound] = (counts[l.compound] || 0) + 1; });
      var dom = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0] || null;
      return {
        index: k, laps: g.map(function (l) { return l.lap; }), count: g.length,
        meanMs: mean(t), bestMs: Math.min.apply(null, t), degMs: fit ? fit.slope : null,
        fit: fit, compound: dom,
      };
    });
    return { method: method, stints: stints };
  }

  // ─── Isolation Forest (Liu, Ting & Zhou 2008) ───────────────────────────

  function cFactor(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
  }

  function buildTree(X, depth, limit, rng) {
    if (depth >= limit || X.length <= 1) return { size: X.length };
    var dims = X[0].length, d = Math.floor(rng() * dims);
    var col = X.map(function (r) { return r[d]; });
    var lo = Math.min.apply(null, col), hi = Math.max.apply(null, col);
    if (lo === hi) return { size: X.length };
    var split = lo + rng() * (hi - lo);
    return {
      d: d, split: split,
      left: buildTree(X.filter(function (r) { return r[d] < split; }), depth + 1, limit, rng),
      right: buildTree(X.filter(function (r) { return r[d] >= split; }), depth + 1, limit, rng),
    };
  }

  function pathLength(x, node, depth) {
    if (node.size != null) return depth + cFactor(node.size);
    return pathLength(x, x[node.d] < node.split ? node.left : node.right, depth + 1);
  }

  function detectAnomalies(laps, contamination) {
    contamination = contamination == null ? 0.15 : contamination;
    var valid = validLaps(laps);
    if (valid.length < 4) return { method: 'none', flagged: [] };
    var useSectors = valid.every(function (l) { return l.s1 && l.s2 && l.s3; });
    var X = valid.map(function (l) { return useSectors ? [l.ms, l.s1, l.s2, l.s3] : [l.ms]; });
    var rng = mulberry32(42), trees = [], sub = Math.min(256, X.length);
    var limit = Math.ceil(Math.log2(Math.max(2, sub)));
    for (var t = 0; t < 100; t++) {
      var sample = [];
      for (var i = 0; i < sub; i++) sample.push(X[Math.floor(rng() * X.length)]);
      trees.push(buildTree(sample, 0, limit, rng));
    }
    var cn = cFactor(sub);
    var scores = X.map(function (x) {
      var h = mean(trees.map(function (tr) { return pathLength(x, tr, 0); }));
      return Math.pow(2, -h / cn); // 1 = muy anómalo, ~0.5 = normal
    });
    var nFlag = Math.max(1, Math.round(contamination * X.length));
    var threshold = sorted(scores).reverse()[nFlag - 1];
    // Sólo cuentan como anomalía si además son lentas: una vuelta récord no es un fallo.
    var med = median(valid.map(function (l) { return l.ms; }));
    var res = valid.map(function (l, i) {
      return { lap: l.lap, score: scores[i], anomaly: scores[i] >= threshold && scores[i] > 0.55 && l.ms > med };
    });
    return { method: 'isolation-forest', all: res, flagged: res.filter(function (r) { return r.anomaly; }).map(function (r) { return r.lap; }) };
  }

  // ─── Sectores ───────────────────────────────────────────────────────────

  function computeSectors(laps) {
    var valid = validLaps(laps).filter(function (l) { return l.s1 && l.s2 && l.s3; });
    if (!valid.length) return null;
    var keys = ['s1', 's2', 's3'];
    var best = keys.map(function (k) { return Math.min.apply(null, valid.map(function (l) { return l[k]; })); });
    var avgGap = keys.map(function (k, i) { return mean(valid.map(function (l) { return l[k] - best[i]; })); });
    return { best: best, theoretical: sum(best), avgGap: avgGap };
  }

  // ─── Distribución t de Student (p-value exacto) ─────────────────────────

  function lnGamma(z) {
    var g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var x = z, y = z, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) ser += g[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  function betacf(a, b, x) {
    var MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  function incBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }

  function tTwoTailedP(t, df) { return incBeta(df / (df + t * t), df / 2, 0.5); }

  function erf(x) {
    var s = x < 0 ? -1 : 1, ax = Math.abs(x), t = 1 / (1 + 0.3275911 * ax);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return s * y;
  }
  function normalTwoTailedP(z) { return 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2))); }

  function welchTTest(a, b) {
    if (a.length < 2 || b.length < 2) return null;
    var mA = mean(a), mB = mean(b), vA = variance(a), vB = variance(b), nA = a.length, nB = b.length;
    var se2 = vA / nA + vB / nB;
    if (se2 <= 0) return null;
    var t = (mA - mB) / Math.sqrt(se2);
    var df = se2 * se2 / (vA * vA / (nA * nA * (nA - 1)) + vB * vB / (nB * nB * (nB - 1)));
    var pooled = Math.sqrt(((nA - 1) * vA + (nB - 1) * vB) / (nA + nB - 2));
    return { t: t, df: df, p: tTwoTailedP(t, df), meanA: mA, meanB: mB, diff: mA - mB, d: pooled > 0 ? (mA - mB) / pooled : 0 };
  }

  function mannWhitneyU(a, b) {
    if (a.length < 2 || b.length < 2) return null;
    var nA = a.length, nB = b.length;
    var all = a.map(function (v) { return { v: v, g: 0 }; }).concat(b.map(function (v) { return { v: v, g: 1 }; }))
      .sort(function (x, y) { return x.v - y.v; });
    var ranks = new Array(all.length), i = 0, tieSum = 0;
    while (i < all.length) {
      var j = i;
      while (j + 1 < all.length && all[j + 1].v === all[i].v) j++;
      var r = (i + j) / 2 + 1, tc = j - i + 1;
      tieSum += tc * tc * tc - tc;
      for (var k = i; k <= j; k++) ranks[k] = r;
      i = j + 1;
    }
    var rA = 0;
    all.forEach(function (x, idx) { if (x.g === 0) rA += ranks[idx]; });
    var uA = rA - nA * (nA + 1) / 2, u = Math.min(uA, nA * nB - uA), n = nA + nB;
    var sigma = Math.sqrt(nA * nB / 12 * ((n + 1) - tieSum / (n * (n - 1))));
    var z = sigma > 0 ? (u - nA * nB / 2) / sigma : 0;
    // Probabilidad de superioridad: P(vuelta de A más rápida que una de B).
    return { u: u, z: z, p: normalTwoTailedP(z), probAFaster: 1 - uA / (nA * nB) };
  }

  function kde(samples, points) {
    if (samples.length < 2) return points.map(function () { return 0; });
    var h = 1.06 * std(samples) * Math.pow(samples.length, -0.2);
    if (h <= 0) return points.map(function () { return 0; });
    var norm = 1 / (samples.length * h * Math.sqrt(2 * Math.PI));
    return points.map(function (x) {
      var acc = 0;
      for (var i = 0; i < samples.length; i++) { var z = (x - samples[i]) / h; acc += Math.exp(-0.5 * z * z); }
      return acc * norm;
    });
  }

  function cohenLabel(d) {
    var a = Math.abs(d);
    if (a < 0.2) return 'trivial';
    if (a < 0.5) return 'pequeño';
    if (a < 0.8) return 'mediano';
    if (a < 1.2) return 'grande';
    return 'muy grande';
  }

  // ─── Insights en lenguaje natural (port de insights.py) ─────────────────

  var COMPOUND_NAME = { S: 'blando', M: 'medio', H: 'duro', I: 'intermedio', W: 'lluvia' };

  function generateInsights(laps) {
    var out = [], stats = computeStats(laps);
    if ((stats.valid || 0) < 2) {
      return [{ sev: 'info', title: 'Sesión muy corta', detail: 'Hacen falta al menos 2 vueltas válidas para sacar conclusiones.' }];
    }
    var sec = computeSectors(laps);
    if (sec) {
      var gap = stats.bestMs - sec.theoretical;
      if (gap > 100) {
        out.push({ sev: 'warn', title: 'Dejas ' + (gap / 1000).toFixed(3) + 's sobre la mesa',
          detail: 'Tu mejor vuelta (' + fmtLap(stats.bestMs) + ') está a ' + (gap / 1000).toFixed(3) + 's del theoretical best (' + fmtLap(sec.theoretical) + '). Encadenando tus mejores tres sectores, ese tiempo sería tuyo.' });
      } else {
        out.push({ sev: 'good', title: 'Vuelta casi perfecta',
          detail: 'Tu mejor vuelta está a sólo ' + (gap / 1000).toFixed(3) + 's del theoretical best: sectores muy bien encadenados.' });
      }
      var wi = sec.avgGap.indexOf(Math.max.apply(null, sec.avgGap));
      if (sec.avgGap[wi] > 200) {
        out.push({ sev: 'warn', title: 'Sector más débil: S' + (wi + 1),
          detail: 'En S' + (wi + 1) + ' pierdes de media ' + (sec.avgGap[wi] / 1000).toFixed(3) + 's respecto a tu mejor parcial. Es el tramo con más margen: entrada, apex y tracción.' });
      }
    }
    if (stats.cov != null) {
      var pct = stats.cov * 100, sd = (stats.stdMs / 1000).toFixed(3);
      if (pct < 0.8) out.push({ sev: 'good', title: 'Consistencia excelente (' + pct.toFixed(2) + '%)', detail: 'Desviación típica de ±' + sd + 's. Ritmo muy estable vuelta a vuelta.' });
      else if (pct < 1.5) out.push({ sev: 'info', title: 'Consistencia razonable (' + pct.toFixed(2) + '%)', detail: 'Desviación típica de ±' + sd + 's. Hay margen para ganar repetibilidad.' });
      else out.push({ sev: 'warn', title: 'Consistencia mejorable (' + pct.toFixed(2) + '%)', detail: 'Desviación típica de ±' + sd + 's, alta para una sesión así. Revisa vueltas anómalas o la técnica en las zonas lentas.' });
    }
    var st = detectStints(laps);
    var degs = st.stints.filter(function (s) { return s.degMs != null && s.count >= 4; });
    if (degs.length) {
      var worst = degs.reduce(function (a, b) { return b.degMs > a.degMs ? b : a; });
      if (worst.degMs > 50) {
        out.push({ sev: 'warn', title: 'Degradación de ' + Math.round(worst.degMs) + ' ms/vuelta',
          detail: 'En el stint ' + (worst.index + 1) + (worst.compound ? ' (' + COMPOUND_NAME[worst.compound] + ')' : '') + ' pierdes ' + (worst.degMs / 1000).toFixed(3) + 's por vuelta. Para stints largos, revisa presiones, compuesto o gestión del neumático.' });
      } else if (worst.degMs < -50) {
        out.push({ sev: 'good', title: 'Los tiempos bajan vuelta a vuelta', detail: 'Mejoras ' + (-worst.degMs / 1000).toFixed(3) + 's por vuelta: buena adaptación a la pista.' });
      }
    }
    var deg = computeDegradation(laps);
    if (deg && deg.chosen === 'polynomial' && deg.polynomial.r2 > 0.5 && st.stints.length < 2) {
      out.push({ sev: 'info', title: 'Patrón no lineal',
        detail: 'Una curva explica mejor tus tiempos que una recta (R² ' + deg.linear.r2.toFixed(2) + ' frente a ' + deg.polynomial.r2.toFixed(2) + '). Típico de calentamiento seguido de estabilización.' });
    }
    var an = detectAnomalies(laps);
    if (an.flagged.length && an.flagged.length <= 3) {
      out.push({ sev: 'info', title: an.flagged.length + (an.flagged.length === 1 ? ' vuelta atípica' : ' vueltas atípicas'),
        detail: 'Isolation Forest marca la' + (an.flagged.length > 1 ? 's vueltas ' : ' vuelta ') + an.flagged.join(', ') + ' (vuelta de salida, tráfico o bandera). Invalídala en la tabla de vueltas para limpiar las estadísticas.' });
    }
    if (st.stints.length >= 2) {
      var b = st.stints.reduce(function (x, y) { return y.bestMs < x.bestMs ? y : x; });
      var w = st.stints.reduce(function (x, y) { return y.bestMs > x.bestMs ? y : x; });
      var diff = w.bestMs - b.bestMs;
      if (b !== w && diff > 200) {
        out.push({ sev: 'info', title: 'Diferencia clara entre stints',
          detail: 'El stint ' + (b.index + 1) + (b.compound ? ' con ' + COMPOUND_NAME[b.compound] : '') + ' es ' + (diff / 1000).toFixed(3) + 's más rápido en su mejor vuelta que el stint ' + (w.index + 1) + (w.compound ? ' con ' + COMPOUND_NAME[w.compound] : '') + '. Dato útil para la estrategia de carrera.' });
      }
    }
    var gapAvg = stats.avgMs - stats.bestMs;
    out.push({ sev: 'info', title: 'Mejor vuelta: ' + fmtLap(stats.bestMs) + ' (V' + stats.bestLap + ')',
      detail: 'Tu media está a ' + (gapAvg / 1000).toFixed(3) + 's de tu mejor vuelta: ' + (gapAvg < 500 ? 'estás apretando casi todas las vueltas.' : 'hay margen para rodar más veces cerca del límite.') });
    return out;
  }

  // ─── Generador de vueltas (port de LapTimeGenerator.java) ───────────────

  function generateLaps(stints, seed) {
    var rng = mulberry32(seed), laps = [], n = 1;
    stints.forEach(function (st, si) {
      for (var i = 0; i < st.laps; i++) {
        var t;
        if (si === 0 && i === 0) t = st.best + 5000 + gaussian(rng) * 800;
        else if (i === 0) t = st.best + 2000 + gaussian(rng) * 400;
        else if (i === 1) t = st.best + 100 + Math.abs(gaussian(rng) * 200);
        else t = st.best + (i - 1) * st.deg + gaussian(rng) * Math.max(150, st.best * 0.001);
        t = Math.round(Math.max(st.best - 200, t));
        // Cada parcial lleva su propio ruido para que el theoretical best quede por debajo de la mejor vuelta.
        var s1 = Math.round(t * (st.split ? st.split[0] : 0.34) + gaussian(rng) * t * 0.0012);
        var s2 = Math.round(t * (st.split ? st.split[1] : 0.36) + gaussian(rng) * t * 0.0012);
        laps.push({ lap: n++, ms: t, s1: s1, s2: s2, s3: t - s1 - s2, compound: st.compound, valid: true });
      }
    });
    return laps;
  }

  // ─── Parser CSV tolerante (port simplificado de LapCsvParser.java) ──────

  var ALIASES = {
    lap: ['lap', 'lap_number', 'lapnumber', 'vuelta', 'n', 'lap #', 'lap#', 'lap nr', 'lap no', '#'],
    ms: ['time', 'lap_time', 'lap time', 'laptime', 'tiempo', 'best time', 'lap time (s)', 'lap time [s]', 'lap_time_s', 'lap_time_ms'],
    s1: ['s1', 'sector1', 'sector_1', 'sector 1', 'split 1', 'split1', 'best split 1', 'sect 1'],
    s2: ['s2', 'sector2', 'sector_2', 'sector 2', 'split 2', 'split2', 'best split 2', 'sect 2'],
    s3: ['s3', 'sector3', 'sector_3', 'sector 3', 'split 3', 'split3', 'best split 3', 'sect 3'],
    compound: ['compound', 'tyre', 'tire', 'neumatico', 'neumático', 'compuesto'],
    valid: ['valid', 'validez', 'ok', 'valida', 'válida'],
  };

  function parseTime(raw) {
    if (raw == null) return null;
    var s = String(raw).trim().replace(',', '.');
    if (!s) return null;
    if (s.indexOf(':') >= 0) {
      var parts = s.split(':').map(Number);
      if (parts.some(isNaN)) return null;
      var secs = parts.reduce(function (acc, p) { return acc * 60 + p; }, 0);
      return Math.round(secs * 1000);
    }
    var v = Number(s);
    if (!isFinite(v) || v <= 0) return null;
    // Más de 1000 se interpreta como milisegundos; si no, segundos.
    return Math.round(v > 1000 ? v : v * 1000);
  }

  function parseCompound(raw) {
    var s = String(raw || '').trim().toUpperCase();
    if (!s) return null;
    if (/^(S|SOFT|BLANDO)/.test(s)) return 'S';
    if (/^(M|MED|MEDIO)/.test(s)) return 'M';
    if (/^(H|HARD|DURO)/.test(s)) return 'H';
    if (/^(I|INTER)/.test(s)) return 'I';
    if (/^(W|WET|LLUVIA)/.test(s)) return 'W';
    return null;
  }

  function parseCsv(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() && !/^\s*\/\//.test(l); });
    if (lines.length < 2) throw new Error('El CSV necesita una cabecera y al menos una vuelta.');
    var head = lines[0];
    var delim = [';', '\t', ','].sort(function (a, b) { return head.split(b).length - head.split(a).length; })[0];
    var cols = head.split(delim).map(function (h) { return h.trim().replace(/^"|"$/g, '').toLowerCase(); });
    var map = {};
    Object.keys(ALIASES).forEach(function (key) {
      var i = cols.findIndex(function (c) { return ALIASES[key].indexOf(c) >= 0; });
      if (i >= 0) map[key] = i;
    });
    if (map.ms == null) throw new Error('No encuentro la columna de tiempo (time, lap_time, tiempo…).');
    var laps = [];
    lines.slice(1).forEach(function (line, i) {
      var c = line.split(delim).map(function (x) { return x.trim().replace(/^"|"$/g, ''); });
      var ms = parseTime(c[map.ms]);
      if (!ms) return;
      var lap = { lap: map.lap != null ? parseInt(c[map.lap], 10) || i + 1 : i + 1, ms: ms, valid: true, compound: null };
      ['s1', 's2', 's3'].forEach(function (k) { if (map[k] != null) lap[k] = parseTime(c[map[k]]); });
      if (map.compound != null) lap.compound = parseCompound(c[map.compound]);
      if (map.valid != null) lap.valid = !/^(0|false|no|n|invalid|x)$/i.test(c[map.valid]);
      laps.push(lap);
    });
    if (!laps.length) throw new Error('No he podido leer ningún tiempo de vuelta.');
    laps.sort(function (a, b) { return a.lap - b.lap; });
    var mapped = Object.keys(map);
    return { laps: laps, columns: mapped, delimiter: delim === '\t' ? 'tab' : delim };
  }

  function toCsv(laps) {
    var rows = ['lap,time,s1,s2,s3,compound,valid'];
    laps.forEach(function (l) {
      rows.push([l.lap, fmtLap(l.ms), l.s1 ? (l.s1 / 1000).toFixed(3) : '', l.s2 ? (l.s2 / 1000).toFixed(3) : '', l.s3 ? (l.s3 / 1000).toFixed(3) : '', l.compound || '', l.valid ? 1 : 0].join(','));
    });
    return rows.join('\n');
  }

  root.LS = {
    mulberry32: mulberry32, mean: mean, std: std, median: median, percentile: percentile,
    fmtLap: fmtLap, fmtGap: fmtGap, validLaps: validLaps,
    computeStats: computeStats, computeDegradation: computeDegradation, detectStints: detectStints,
    detectAnomalies: detectAnomalies, computeSectors: computeSectors, polyfit: polyfit,
    welchTTest: welchTTest, mannWhitneyU: mannWhitneyU, tTwoTailedP: tTwoTailedP, kde: kde, cohenLabel: cohenLabel,
    generateInsights: generateInsights, generateLaps: generateLaps, parseCsv: parseCsv, parseTime: parseTime, toCsv: toCsv,
    COMPOUND_NAME: COMPOUND_NAME,
  };
})(typeof window !== 'undefined' ? window : globalThis);
