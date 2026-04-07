# =============================================================================
# Dockerfile - Frontend Web (React + Vite + Nginx)
# =============================================================================
# Acest Dockerfile foloseste un build multi-stage (doua etape):
#   Etapa 1 (builder): Instaleaza dependentele si construieste aplicatia React
#                       cu Vite (generare fisiere statice HTML/JS/CSS)
#   Etapa 2 (nginx):   Serveste fisierele statice printr-un server Nginx
#                       care actioneaza si ca reverse proxy catre API
#
# Imaginea finala este bazata pe Nginx (~25MB), nu pe Node.js,
# deoarece la runtime nu mai avem nevoie de Node - doar de un server HTTP.
# =============================================================================

# =============================================================================
# ETAPA 1: BUILDER - Compilare si bundling
# =============================================================================
# Node.js 22 pe Alpine este necesar pentru a rula Vite si a construi
# aplicatia React. Aceasta etapa produce fisiere statice (HTML, JS, CSS)
# care nu mai necesita Node.js la runtime.
FROM node:22-alpine AS builder

# Activeaza corepack pentru suport pnpm (package manager-ul monorepo-ului).
# pnpm este mai eficient decat npm: foloseste hard links si spatiu partajat.
RUN corepack enable

# Seteaza directorul de lucru in container
WORKDIR /app

# Copiaza fisierele de configurare a dependentelor (strategie de cache Docker).
# Docker va cache-ui acest layer si-l va refolosi daca aceste fisiere nu se schimba,
# evitand reinstalarea dependentelor la fiecare build.
# - package.json: dependentele root ale monorepo-ului
# - pnpm-workspace.yaml: defineste structura workspace-urilor (apps/ si packages/)
# - pnpm-lock.yaml*: versiunile exacte ale dependentelor (* = optional)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copiaza package.json-urile pachetelor necesare frontend-ului.
# - packages/shared: tipuri TypeScript si utilitare partajate cu backend-ul
# - apps/web: aplicatia React propriu-zisa
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

# Instaleaza dependentele. --frozen-lockfile asigura build-uri deterministe
# (foloseste exact versiunile din lockfile). Fallback la install simplu
# daca lockfile-ul nu exista sau e incompatibil.
RUN pnpm install --frozen-lockfile || pnpm install

# Copiaza codul sursa al pachetelor necesare.
# shared trebuie copiat primul deoarece web importa tipuri si utilitare din el.
COPY packages/shared packages/shared
COPY apps/web apps/web

# Compileaza pachetul shared INAINTE de web.
# Build-ul produce dist/cjs si dist/esm. Vite rezolva @amass/shared prin campul
# "module"/"exports.import" din package.json, care pointeaza la dist/esm/index.js.
# Fara acest pas, vite build esueaza cu "module not found".
RUN pnpm --filter @amass/shared build

# Construieste aplicatia React pentru productie folosind Vite.
# Vite (bundler modern) proceseaza:
#   - Transpilare JSX/TSX -> JavaScript
#   - Tree shaking (eliminarea codului nefolosit)
#   - Minificarea HTML/JS/CSS
#   - Code splitting (impartirea in chunk-uri pentru incarcare rapida)
#   - Generare hash-uri in numele fisierelor (pentru cache busting)
# Rezultatul se afla in apps/web/dist/ - fisiere statice gata de servire.
RUN cd apps/web && npx vite build

# =============================================================================
# ETAPA 2: NGINX - Server HTTP de productie
# =============================================================================
# Nginx pe Alpine (~25MB) este ideal pentru servirea fisierelor statice:
#   - Performanta ridicata (poate gestiona mii de conexiuni simultane)
#   - Consum redus de memorie comparativ cu Node.js
#   - Configurare nativa pentru caching, compresie gzip, SSL etc.
#   - Reverse proxy integrat pentru rutarea cererilor API
FROM nginx:alpine

# Copiaza fisierele statice construite de Vite in directorul default Nginx.
# /usr/share/nginx/html este directorul root configurat in nginx.conf.
# Contine: index.html, fisiere JS (chunk-uri), CSS, imagini, fonturi etc.
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copiaza configuratia Nginx personalizata.
# Aceasta inlocuieste configuratia default Nginx cu una care:
#   - Ruteaza /api/* catre backend-ul API (reverse proxy)
#   - Ruteaza /socket.io/* catre WebSocket-ul API (upgrade connection)
#   - Serveste fisierele statice React din /usr/share/nginx/html
#   - Implementeaza SPA fallback (toate rutele -> index.html)
#   - Configureaza cache-ul pentru resurse statice (30 zile)
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Declara portul HTTP standard.
# Nginx va asculta pe portul 80 conform configuratiei din nginx.conf.
EXPOSE 80
