// Aplica el tema antes de pintar. Por defecto, tema nocturno; "light" activa el tema de día.
try { if (localStorage.getItem("saa-theme") === "light") document.documentElement.dataset.theme = "light"; } catch (e) {}
