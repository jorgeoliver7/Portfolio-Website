// Datos del portfolio de Jorge Acedo
window.PORTFOLIO_DATA = {
  name: "Jorge Acedo",
  role: "Software Developer & Data Analyst",
  location: "Cádiz, España",
  email: "jorge.acedo.oliver@gmail.com",
  phone: "+34 662 023 081",
  linkedin: "https://www.linkedin.com/in/jorgeacedooliver/",
  github: "https://github.com/jorgeoliver7",
  instagram: "https://www.instagram.com/jorgeeoliveer/",

  stats: [
    { value: "3+", label: "años de experiencia" },
    { value: "12", label: "proyectos enviados" },
    { value: "10+", label: "tecnologías" },
    { value: "2", label: "perfiles fusionados" },
  ],

  stack: {
    frontend: [
      { name: "React",      level: 88 },
      { name: "JavaScript", level: 92 },
      { name: "CSS / SASS", level: 85 },
      { name: "HTML",       level: 95 },
    ],
    backend: [
      { name: "Java",        level: 82 },
      { name: "Spring Boot", level: 78 },
      { name: "Node.js",     level: 72 },
      { name: "PostgreSQL",  level: 80 },
    ],
    data: [
      { name: "Python (Pandas, NumPy)",           level: 85 },
      { name: "SQL Avanzado",                     level: 88 },
      { name: "Visualización (Plotly, Matplotlib)",level: 80 },
      { name: "Jupyter Notebooks",                level: 86 },
      { name: "IBM Cognos Analytics",             level: 70 },
    ],
    tools: [
      { name: "Git / GitHub", level: 90 },
      { name: "Docker",       level: 70 },
      { name: "Claude API",   level: 78 },
    ],
  },

  projects: [
    {
      id: 1, name: "FindYourPrompt", category: "fullstack",
      desc: "Plataforma para descubrir, crear y compartir prompts optimizados para IA.",
      stack: ["React", "JavaScript", "AI", "CSS3"],
      live: "findyourprompt-one.vercel.app", year: "2025",
    },
    {
      id: 2, name: "Bet4Fun", category: "data",
      desc: "Sistema de recomendaciones de apuestas deportivas con análisis estadístico en tiempo real.",
      stack: ["Python", "Flask", "React", "API"],
      year: "2025",
    },
    {
      id: 3, name: "iRacing Setup Assistant", category: "fullstack",
      desc: "Encuentra, genera y comparte configuraciones óptimas de iRacing por circuito.",
      stack: ["React", "Node.js", "PostgreSQL", "Socket.io"],
      live: "i-racing-setup-assistant.vercel.app", year: "2025",
    },
    {
      id: 4, name: "Racing Team Management", category: "fullstack",
      desc: "Sistema de gestión integral para equipos de racing: vehículos, miembros, eventos.",
      stack: ["Java Spring Boot", "React", "PostgreSQL", "Docker"],
      year: "2024",
    },
    {
      id: 5, name: "F1 Championship Predictor", category: "data",
      desc: "ML que predice resultados del Mundial de F1 2025 — 87% precisión, 20+ variables.",
      stack: ["Python", "Java", "ML", "Data Analysis"],
      year: "2025",
    },
    {
      id: 6, name: "Portfolio Interactivo", category: "frontend",
      desc: "Portfolio personal con diseño editorial, animaciones fluidas y modo oscuro/claro.",
      stack: ["HTML5", "CSS3", "JavaScript"],
      live: "jorgeoliver7.github.io/Portfolio-Website", year: "2025",
    },
    {
      id: 7, name: "Yard Operations Dashboard", category: "data",
      desc: "Monitor de operaciones del patio Amazon FC: Turn Time, OTD, dock utilization.",
      stack: ["Python", "Pandas", "Plotly", "Dash"],
      year: "2026",
    },
    {
      id: 8, name: "UPH Productivity Analyzer", category: "data",
      desc: "Análisis end-to-end de productividad de 50 asociados con motor de alertas automático.",
      stack: ["Python", "Pandas", "Jupyter", "Dash"],
      year: "2026",
    },
    {
      id: 9, name: "AI Metrics Assistant", category: "data",
      desc: "Chatbot para managers Amazon: preguntas en lenguaje natural sobre KPIs del FC vía Claude API.",
      stack: ["Python", "Flask", "Claude API", "JS"],
      year: "2026",
    },
    {
      id: 10, name: "Amazon FC SQL Database", category: "backend",
      desc: "BBDD PostgreSQL relacional con 30 queries SQL avanzadas: Window functions, CTEs, percentiles.",
      stack: ["PostgreSQL", "Python", "psycopg2", "SQL"],
      year: "2026",
    },
    {
      id: 11, name: "Amazon A to Z — Sync Turnos", category: "frontend",
      desc: "Prototipo de exportación automática de turnos al calendario personal del empleado.",
      stack: ["HTML5", "CSS3", "JavaScript"],
      year: "2026",
    },
    {
      id: 12, name: "TechStore Backend API", category: "backend",
      desc: "API REST para e-commerce con JWT, gestión de productos y sistema de roles ADMIN/USER.",
      stack: ["Java 17", "Spring Boot", "Spring Security", "H2"],
      year: "2024",
    },
  ],

  experience: [
    {
      role: "Yard Marshall",
      company: "Amazon Fulfillment Center",
      period: "Nov 2025 — Presente",
      desc: "Coordinación operativa del patio de trailers en un FC de alto volumen. Toma de decisiones en tiempo real, cumplimiento de protocolos de seguridad Amazon.",
      tags: ["Logística", "Gestión Operativa", "Seguridad", "Trabajo en Equipo"],
    },
    {
      role: "Software Developer",
      company: "GrupoOro",
      period: "2023 · 6 meses",
      desc: "Desarrollo integral de aplicaciones web: código, UX/UI, testing y backups. Implementación de gráficos interactivos con Canvas.",
      tags: ["JavaScript", "HTML/CSS", "Python", "Canvas"],
    },
  ],

  education: [
    {
      title: "IBM Data Analyst Professional Certificate",
      institution: "IBM / Coursera",
      year: "2026",
      status: "Completado",
      desc: "Python para ciencia de datos, SQL, Pandas, NumPy, Matplotlib, Seaborn, IBM Cognos Analytics.",
    },
    {
      title: "Grado Superior en Desarrollo de Aplicaciones Web",
      institution: "Universae",
      year: "—",
      status: "Formación",
      desc: "Desarrollo web con tecnologías modernas, bases de datos y metodologías ágiles.",
    },
    {
      title: "Estudios de Derecho",
      institution: "Universidad de Cádiz",
      year: "—",
      status: "Cursado",
      desc: "Capacidades analíticas, redacción precisa y resolución estructurada de problemas.",
    },
  ],

  languages: [
    { name: "Español", level: "Nativo",      pct: 100 },
    { name: "Inglés",  level: "B2 Cambridge", pct: 75  },
  ],
};
