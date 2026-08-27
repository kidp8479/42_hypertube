FROM docker.io/library/node:24-alpine AS dev
WORKDIR /app
# Run as the (already existing, same UID as most host users: 1000) "node"
# user rather than root, so files written by `nest start --watch` into the
# bind-mounted source (dist/, tsbuildinfo...) stay owned by the host user
# instead of becoming root-owned and unwritable/undeletable from outside
# Docker.
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM dev AS build
RUN npm run build

FROM docker.io/library/node:24-alpine AS prod
WORKDIR /app

# Fresh install, prod deps only - don't inherit devDependencies from the dev stage
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# node:24-alpine already ships a non-root "node" user - use it instead of root
USER node

EXPOSE 3000
CMD ["node", "dist/main"]
