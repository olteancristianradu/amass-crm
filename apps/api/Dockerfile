# =============================================================================
# Dockerfile - API Backend (NestJS / Express + Prisma)
# =============================================================================
# Acest Dockerfile foloseste un build multi-stage (doua etape) pentru a
# optimiza dimensiunea imaginii finale:
#   Etapa 1 (builder): Instaleaza dependentele, genereaza clientul Prisma,
#                       compileaza TypeScript -> JavaScript
#   Etapa 2 (runtime): Copiaza doar fisierele necesare pentru rulare
#
# Rezultat: o imagine mai mica si mai sigura (fara unelte de build, surse TS etc.)
# =============================================================================

# =============================================================================
# ETAPA 1: BUILDER - Compilare si pregatire
# =============================================================================
# Imaginea de baza: Node.js 22 pe Alpine Linux (varianta lightweight, ~50MB).
# Aceasta etapa este temporara - nu va fi inclusa in imaginea finala.
# Alias-ul "builder" permite referirea acestei etape in COPY --from=builder.
FROM node:22-alpine AS builder

# Activeaza corepack - managerul de pachete integrat in Node.js 22.
# Corepack permite utilizarea pnpm fara instalare separata.
# pnpm este package manager-ul folosit in acest monorepo (mai rapid, spatiu optimizat).
RUN corepack enable

# Seteaza directorul de lucru in container.
# Toate comenzile urmatoare se vor executa relativ la /app.
WORKDIR /app

# Copiaza mai intai DOAR fisierele de configurare a dependentelor.
# Aceasta strategie de "layering" permite Docker sa cache-uiasca layer-ul
# de instalare a dependentelor. Daca package.json nu se schimba,
# Docker va refolosi cache-ul si nu va reinstala dependentele.
# - package.json: dependentele root ale monorepo-ului
# - pnpm-workspace.yaml: configuratia workspace-urilor pnpm (defineste packages/ si apps/)
# - pnpm-lock.yaml*: lockfile-ul exact al dependentelor (* = optional, poate lipsi)
# - tsconfig.base.json: configuratia TypeScript bazata pentru toate pachetele
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./

# Copiaza package.json-urile individuale ale pachetelor necesare.
# pnpm are nevoie de aceste fisiere pentru a rezolva dependentele interne
# ale monorepo-ului (workspace protocol: "workspace:*").
# - packages/shared: cod partajat intre frontend si backend (tipuri, utilitare)
# - apps/api: backend-ul propriu-zis
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Instaleaza toate dependentele.
# --frozen-lockfile: foloseste exact versiunile din lockfile (deterministic build).
# Daca lockfile-ul lipseste sau e outdated, fallback la "pnpm install" simplu.
# Aceasta abordare defensiva asigura ca build-ul functioneaza si fara lockfile.
RUN pnpm install --frozen-lockfile || pnpm install

# Copiaza codul sursa al pachetelor necesare.
# Acum ca dependentele sunt instalate, copiem codul efectiv.
# Ordinea este importanta: shared trebuie copiat inaintea API-ului
# deoarece API-ul depinde de el.
COPY packages/shared packages/shared
COPY apps/api apps/api

# Compileaza pachetul shared INAINTE de api.
# @amass/api importa @amass/shared (workspace dep). Build-ul produce DOUA output-uri:
#   - dist/cjs/ (CommonJS) — folosit de api la runtime via require()
#   - dist/esm/ (ESM)      — folosit de Vite la build-ul web
# Fara acest pas, api esueaza atat la build (tsc nu rezolva @amass/shared) cat si
# la runtime (require gaseste main: dist/cjs/index.js care nu exista).
RUN pnpm --filter @amass/shared build

# Genereaza clientul Prisma din schema.prisma.
# Prisma Client este o librarie generata automat care ofera acces type-safe
# la baza de date. Fara acest pas, API-ul nu poate interactiona cu PostgreSQL.
# Clientul generat se afla in node_modules/.prisma/client.
RUN cd apps/api && npx prisma generate

# Compileaza codul TypeScript in JavaScript.
# tsconfig.json defineste configuratia de compilare (target, module, paths etc.)
# Rezultatul compilarii se afla in directorul apps/api/dist/.
# Doar fisierele .js compilate sunt necesare la runtime.
RUN cd apps/api && npx tsc

# =============================================================================
# ETAPA 2: RUNTIME - Imaginea finala de productie
# =============================================================================
# Imaginea de baza curata, fara uneltele de build din etapa anterioara.
# Contine doar Node.js si fisierele necesare pentru rularea aplicatiei.
FROM node:22-alpine

# Activeaza corepack si in imaginea de runtime.
# Necesar pentru ca pnpm sa fie disponibil (folosit de npx prisma la startup).
RUN corepack enable

# Directorul de lucru initial - radacina monorepo-ului
WORKDIR /app

# Copiaza node_modules din etapa de build.
# Contine toate dependentele npm/pnpm si clientul Prisma generat.
COPY --from=builder /app/node_modules ./node_modules

# Copiaza pachetele (inclusiv shared) din etapa de build.
# Necesare la runtime deoarece API-ul importa cod din packages/shared.
COPY --from=builder /app/packages ./packages

# Copiaza intregul director al API-ului din etapa de build.
# Include: codul compilat (dist/), schema Prisma, migrarile, package.json etc.
# Schema Prisma si migrarile sunt necesare pentru "prisma migrate deploy" la startup.
COPY --from=builder /app/apps/api ./apps/api

# Copiaza startup script din radacina proiectului (din build context).
# Scriptul valideaza environment variables si ruleaza migratiile.
COPY apps/api/startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Schimba directorul de lucru la API pentru comenzile de rulare.
# Prisma cauta schema.prisma relativ la directorul curent.
WORKDIR /app/apps/api

# Declara portul pe care API-ul va asculta.
# NOTA: EXPOSE este doar documentatie - nu publica efectiv portul.
# Publicarea se face prin "ports:" in docker-compose.yml.
EXPOSE 3000

# Comanda de pornire a containerului.
# Executata in ordine:
#   1. /app/startup.sh - valideaza DATABASE_URL si ruleaza migratiile Prisma
#   2. node dist/index.js - porneste serverul API compilat
# Scriptul startup.sh are logica pentru a gestiona graceful cazurile in care
# DATABASE_URL lipseste sau este malformat, oferind mesaje de eroare clare.
CMD ["/app/startup.sh"]
