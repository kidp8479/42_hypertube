FROM docker.io/library/node:24-alpine AS dev
WORKDIR /app
# Same reasoning as backend/Dockerfile: run as "node" (UID 1000, matches
# most host users) instead of root, so anything written into the
# bind-mounted source stays owned by the host user.
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
# The stamp dev-start.sh compares against: a fresh node_modules volume is
# seeded from this layer, so it starts without reinstalling.
RUN npm ci && sha256sum package-lock.json | cut -d' ' -f1 > node_modules/.lockfile-sha256
COPY --chown=node:node . .
EXPOSE 5173
# Reinstalls first when the lockfile changed since the volume's last
# install (HYP-86). `sh` so the bind-mounted script needs no exec bit.
ENTRYPOINT ["sh", "./dev-start.sh"]
CMD ["npm", "run", "dev", "--", "--host"]

FROM dev AS build
RUN npm run build

FROM docker.io/library/nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
