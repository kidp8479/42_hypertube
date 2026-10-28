# Edge proxy: the one container that faces the browser (HYP-71). Terminates
# TLS and routes to the frontend and the backend over the compose network.
FROM docker.io/library/nginx:alpine

# openssl only to mint the self-signed dev certificate at first start.
RUN apk add --no-cache openssl

# The official image renders /etc/nginx/templates/*.template with envsubst
# (only variables set in the environment) into /etc/nginx/conf.d/, and runs
# the scripts of /docker-entrypoint.d/ before starting nginx.
COPY templates/ /etc/nginx/templates/
COPY snippets/ /etc/nginx/snippets/
COPY docker-entrypoint.d/ /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/*.sh

# Exports NGINX_LOCAL_RESOLVERS (the container's DNS servers, from
# /etc/resolv.conf) before the templates render, for the `resolver` line of
# default.conf.template (HYP-81).
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# Unprivileged ports: rootless Podman (school) cannot bind 80 / 443.
EXPOSE 8080 8443
