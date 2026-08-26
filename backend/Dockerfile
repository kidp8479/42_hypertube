FROM docker.io/library/node:24-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
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
