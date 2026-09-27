# Mythayun backend (AdonisJS) - production image for Dokploy or any Docker host
#
# Build:  docker build -t mythayun-backend .
# Run:    docker run -p 3333:3333 --env-file .env mythayun-backend
#
# On start it applies pending database migrations, then starts the server.

# --- Build: compile TypeScript into ./build (needs devDependencies) ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN node ace build

# --- Runtime: compiled app + production dependencies only --------------------
FROM node:22-alpine
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333
WORKDIR /app

COPY --from=build /app/build ./
RUN npm ci --omit=dev && npm cache clean --force

USER node
EXPOSE 3333

# --force: Adonis asks for confirmation before migrating in production
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
