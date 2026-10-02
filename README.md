# Ruta SAA-C03 · app de escritorio

Consola de preparación para el examen AWS Certified Solutions Architect - Associate (vie 23 oct 2026).

## Usar

- **Instalar:** `release-1.4.0/Ruta SAA-C03 Setup 1.4.0.exe` (crea acceso directo en el escritorio y el menú Inicio).
- **Sin instalar:** `release-1.4.0/Ruta-SAA-C03-portable.exe`.
- Windows puede mostrar "Windows protegió tu PC" porque el ejecutable no está firmado: **Más información → Ejecutar de todas formas**.

Tu progreso se guarda en `%APPDATA%\Ruta SAA-C03\progreso-saa.json`. Desde *Archivo → Exportar progreso* puedes sacar una copia o llevarla a otra PC.

## Desarrollo

```bash
npm install
npm start        # abre la app
npm test         # valida el motor: miles de preguntas generadas + explicación del banco original
npm run dist     # genera el instalador y la versión portable en release/
```

## Estructura

- `main.js`, `preload.js`: ventana, menú en español y guardado en archivo local.
- `src/data/content.js`: temas, fichas, 155 preguntas y el plan de 23 días (de la versión web).
- `src/data/glossary.js`: glosario de 415 términos en español simple (qué es, pista de examen y «Ojo»: para qué no sirve). `annotate()` subraya los términos en preguntas, fichas y flashcards; al pasar el mouse se ve la definición y la tecla G lista los términos de la pregunta. Página completa en Repaso → Glosario.
- `src/data/whynot.js`: por qué cada opción incorrecta del banco no es la respuesta, escrito para esa pregunta. Al fallar, la app compara «lo que elegiste» (qué es y por qué no) con «la correcta»; para preguntas generadas usa el motor y, como respaldo, el glosario. `npm test` verifica que ninguna opción incorrecta quede sin explicación.
- `src/engine/kb.js`: base de conocimiento: 42 decisiones típicas del examen (todos los servicios de la guía oficial y funciones puntuales como SQS, Lambda, DynamoDB o CloudFront), cada una con sus soluciones, atributos y requisitos.
- `src/engine/engine.js`: generador de preguntas (resolución de restricciones + distractores "casi correctos"), preguntas «Elige 2» de dos partes, duelos a partir de tus confusiones y explicador paso a paso. La dificultad se adapta por decisión con un rating tipo Elo.
- `src/app.js`, `src/styles.css`: interfaz. La pestaña **Ruta** (inicio) es un camino estilo Duolingo: campamento base → 4 mundos (uno por dominio, 2 lecciones por tema, cofre de repaso y jefe) → recta final. El orden de los temas está en `ORDER_PREF` y los nodos en `PATH`. La primera vez se muestra un guion de inicio (nivel, meta diaria, cómo funciona y primer paso); se puede repetir desde Recursos o F1.

Para agregar una decisión nueva, copia una familia en `kb.js`, ejecuta `npm test` y revisa que todas las soluciones aparezcan como objetivo y que no haya errores.
