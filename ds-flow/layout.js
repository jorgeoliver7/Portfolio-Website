// Plano de la estación de reparto (DS). Todo el mapa sale de aquí: cambia
// posiciones, ritmos, número de muelles, pasillos o rutas y la simulación se adapta.
// Orientación: docks arriba, conveyor por la izquierda, stow en el centro y
// yard a la derecha (las furgonetas entran por abajo y salen por arriba).
// Ritmos en unidades/hora con la plantilla base (staff).
window.DS_LAYOUT = {
  width: 1240,
  height: 700,
  shiftStart: 23 * 60,     // el ciclo arranca a las 23:00

  docks: {
    count: 9,
    wallY: 112,            // pared de muelles (los camiones atracan por encima)
    left: 40, right: 780,
    truckUnits: 180,
    unloadRate: 360,       // paq/h por muelle
  },

  receive: {
    name: "Recepción", code: "RCV",
    x: 170, y: 124, w: 610, h: 76,
    rate: 1800, staff: 8,
    desc: "Los paquetes salen del tráiler y se escanean por primera vez: la estación confirma que ha llegado cada uno.",
  },

  induct: {
    name: "Inducción", code: "IND",
    x: 40, y: 124, w: 110, h: 76,
    rate: 1800, staff: 4,
    desc: "Cada paquete se pone en el conveyor. Al escanearlo, el sistema le asigna su ruta y el pasillo al que tiene que ir.",
  },

  conveyor: { x: 95, top: 200, bottom: 676, speed: 240 }, // px por minuto simulado (~0,5 m/s a escala del plano)

  stow: {
    name: "Stow a sacas", code: "STW",
    rate: 1800, staff: 12,  // repartido entre pasillos
    desc: "Los stowers cogen el paquete del conveyor y lo meten en la saca de su ruta. Cada pasillo tiene las sacas de 8 rutas.",
    aisles: [
      { id: "A", y: 216 },
      { id: "B", y: 332 },
      { id: "C", y: 448 },
      { id: "D", y: 564 },
    ],
    x: 180, w: 600, h: 108,
    routesPerAisle: 8,
    bagCapacity: 60,
  },

  pick: {
    name: "Pick por rutas", code: "PCK",
    x: 806, y: 216, w: 104, h: 456,
    rate: 2400, staff: 8,
    desc: "Cuando la furgoneta de una ruta está lista, los pickers sacan todas sus sacas, las montan en un carro y las llevan al yard.",
  },

  yard: {
    name: "Yard", code: "YRD",
    x: 940, y: 16, w: 290, h: 668,
    pads: 12,
    loadRate: 1200,
    onTimeMinutes: 15,     // objetivo: furgoneta cargada y fuera en ≤ 15 min
    desc: "Las furgonetas entran por abajo, aparcan en su plaza, cargan el carro de su ruta y salen a reparto por arriba.",
  },

  // Municipios por ruta para la ficha del paquete
  towns: ["Cádiz", "San Fernando", "Chiclana", "Puerto Real", "El Puerto", "Jerez", "Rota", "Conil"],
};
