# Edge proxy: the one container that faces the browser (HYP-71). Terminates
# TLS and routes to the frontend and the backend over the compose network.
FROM docker.io/library/nginx:alpine

# openssl only to mint the self-signed dev certificate at first start.
RUN apk add --no-cache openssl

# The official image renders /etc/nginx/templates/*.template with envsubst
# (only variables set in the environment) into /etc/nginx/conf.d/, and runs
# the scripts of /docker-entrypoint.d/ before starting nginx.
COPY templates/ /etc/nginx/templates/
COPY docker-entrypoint.d/ /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/*.sh

# Unprivileged ports: rootless Podman (school) cannot bind 80 / 443.
EXPOSE 8080 8443
