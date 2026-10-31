FROM docker.io/library/node:24-alpine AS dev
WORKDIR /app
# Run as the (already existing, same UID as most host users: 1000) "node"
# user rather than root, so files written by `nest start --watch` into the
# bind-mounted source (dist/, tsbuildinfo...) stay owned by the host user
# instead of becoming root-owned and unwritable/undeletable from outside
# Docker.
RUN chown node:node /app
# Pre-create dist/ as "node" before the volume mount happens. `backend_dist`
# in docker-compose.yml is a *named* volume with nothing at this path in the
# image to seed it from - Docker still creates the mountpoint, but owned by
# root, and the node user then can't write into it. Only a path that exists
# in the image (as it does here) lets Docker copy the right ownership into a
# freshly-created named volume on first mount.
RUN mkdir -p /app/dist && chown node:node /app/dist
# Same reason for the uploaded profile pictures' volume (ADR-0016).
RUN mkdir -p /var/lib/hypertube/pictures \
  && chown -R node:node /var/lib/hypertube
USER node
COPY --chown=node:node package*.json ./
# The stamp dev-start.sh compares against: a fresh node_modules volume is
# seeded from this layer, so it starts without reinstalling.
RUN npm ci && sha256sum package-lock.json | cut -d' ' -f1 > node_modules/.lockfile-sha256
COPY --chown=node:node . .
EXPOSE 3000
# Reinstalls first when the lockfile changed since the volume's last
# install (HYP-86). `sh` so the bind-mounted script needs no exec bit.
ENTRYPOINT ["sh", "./dev-start.sh"]
CMD ["npm", "run", "start:dev"]

FROM dev AS build
RUN npm run build

FROM docker.io/library/node:24-alpine AS prod
WORKDIR /app

# Fresh install, prod deps only - don't inherit devDependencies from the dev stage
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# The pictures volume's mount point, owned by the user that writes into it.
RUN mkdir -p /var/lib/hypertube/pictures \
  && chown -R node:node /var/lib/hypertube

# node:24-alpine already ships a non-root "node" user - use it instead of root
USER node

EXPOSE 3000
CMD ["node", "dist/main"]
