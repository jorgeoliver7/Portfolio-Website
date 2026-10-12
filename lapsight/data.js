/*
 * Datos demo de LapSight: el mismo equipo ficticio que siembra el backend
 * (DemoSeedService.java), con las vueltas generadas en el navegador a partir
 * de semillas fijas. Siempre salen los mismos tiempos.
 */
(function () {
  'use strict';

  var DRIVERS = {
    alonso: { name: 'Fernando Alonso', short: 'ALO', license: 'FIA-14' },
    sainz: { name: 'Carlos Sainz', short: 'SAI', license: 'FIA-55' },
    delarosa: { name: 'Pedro de la Rosa', short: 'DLR', license: 'FIA-PdR' },
  };

  var VEHICLES = {
    f4: { name: 'Dallara F4 #23', cls: 'Fórmula 4' },
    gt3: { name: 'Porsche 911 GT3 R #88', cls: 'GT3' },
    motogp: { name: 'Aprilia RS-GP #41', cls: 'MotoGP' },
    tcr: { name: 'Cupra León VZ TCR #5', cls: 'TCR' },
  };

  var TYPES = { Q: 'Clasificación', R: 'Carrera', T: 'Test', P: 'Libres', SD: 'Shakedown' };

  var SESSIONS = [
    { id: 'jarama-quali', name: 'Quali F4 · Jarama', circuit: 'Circuito del Jarama', daysAgo: 14, type: 'Q', cond: 'Seco', air: 21, track: 34,
      driver: 'alonso', vehicle: 'f4', seed: 1001, notes: 'Pole con 1:35.4. Sesión limpia y pista en condiciones óptimas.',
      stints: [{ laps: 8, best: 95400, deg: 30, compound: 'S' }] },
    { id: 'jarama-race', name: 'Carrera F4 · Jarama', circuit: 'Circuito del Jarama', daysAgo: 13, type: 'R', cond: 'Seco', air: 24, track: 39,
      driver: 'alonso', vehicle: 'f4', seed: 1002, notes: 'Cambio de compuesto en la vuelta 11. Buena gestión de la degradación.',
      stints: [{ laps: 10, best: 95800, deg: 80, compound: 'S' }, { laps: 8, best: 96400, deg: 60, compound: 'M' }] },
    { id: 'jerez-alo', name: 'Test F4 · Jerez', circuit: 'Circuito de Jerez', daysAgo: 11, type: 'T', cond: 'Seco', air: 26, track: 41,
      driver: 'alonso', vehicle: 'f4', seed: 2101, notes: 'Tanda larga con medio para comparar ritmo con Sainz en el mismo coche.',
      stints: [{ laps: 14, best: 106300, deg: 45, compound: 'M', split: [0.33, 0.37] }] },
    { id: 'jerez-sai', name: 'Test F4 · Jerez', circuit: 'Circuito de Jerez', daysAgo: 11, type: 'T', cond: 'Seco', air: 27, track: 43,
      driver: 'sainz', vehicle: 'f4', seed: 2102, notes: 'Mismo coche y compuesto que Alonso, 40 minutos después.',
      stints: [{ laps: 14, best: 106550, deg: 55, compound: 'M', split: [0.332, 0.368] }] },
    { id: 'cheste-gt3', name: 'Resistencia GT3 · Cheste', circuit: 'Circuit Ricardo Tormo', daysAgo: 10, type: 'R', cond: 'Seco', air: 23, track: 37,
      driver: 'sainz', vehicle: 'gt3', seed: 1003, notes: 'Stint con medio y otro con duro. Degradación notable al final; el plan de paradas fue correcto.',
      stints: [{ laps: 15, best: 89200, deg: 110, compound: 'M' }, { laps: 15, best: 90500, deg: 130, compound: 'H' }] },
    { id: 'aragon-motogp', name: 'Test MotoGP · MotorLand', circuit: 'MotorLand Aragón', daysAgo: 7, type: 'T', cond: 'Seco', air: 19, track: 30,
      driver: 'sainz', vehicle: 'motogp', seed: 1004, notes: 'Comparativa medio contra blando. El blando, 0.4s mejor en vuelta limpia.',
      stints: [{ laps: 6, best: 91500, deg: 50, compound: 'M' }, { laps: 7, best: 91100, deg: 70, compound: 'S' }] },
    { id: 'navarra-tcr', name: 'Libres TCR · Navarra', circuit: 'Circuito de Navarra', daysAgo: 5, type: 'P', cond: 'Seco', air: 17, track: 25,
      driver: 'delarosa', vehicle: 'tcr', seed: 1005, notes: 'Primera tanda del día. Vuelta 6 anulada por límites de pista.',
      stints: [{ laps: 12, best: 100100, deg: 70, compound: 'M' }], invalid: { 6: 'Límites de pista' } },
    { id: 'cheste-rain', name: 'Carrera F4 · Cheste (lluvia)', circuit: 'Circuit Ricardo Tormo', daysAgo: 3, type: 'R', cond: 'Mojado', air: 14, track: 16,
      driver: 'alonso', vehicle: 'f4', seed: 1006, notes: 'Lluvia constante. Tiempos unos 6s por encima del seco.',
      stints: [{ laps: 12, best: 102500, deg: 90, compound: 'W' }] },
    { id: 'castelloli-gt3', name: 'Shakedown GT3 · Castellolí', circuit: 'Parcmotor Castellolí', daysAgo: 1, type: 'SD', cond: 'Seco', air: 20, track: 29,
      driver: 'sainz', vehicle: 'gt3', seed: 1007, notes: 'Verificación tras mantenimiento. Todo correcto.',
      stints: [{ laps: 6, best: 87800, deg: 40, compound: 'S' }] },
  ];

  SESSIONS.forEach(function (s) {
    s.laps = window.LS.generateLaps(s.stints, s.seed);
    if (s.invalid) {
      s.laps.forEach(function (l) {
        if (s.invalid[l.lap]) { l.valid = false; l.note = s.invalid[l.lap]; }
      });
    }
    var d = new Date();
    d.setDate(d.getDate() - s.daysAgo);
    s.date = d;
  });

  window.LS_DATA = { drivers: DRIVERS, vehicles: VEHICLES, types: TYPES, sessions: SESSIONS };
})();
