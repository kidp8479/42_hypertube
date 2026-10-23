#!/bin/sh
# Mints a self-signed certificate for localhost on first start. The files live
# in a volume (/etc/nginx/certs), so mounting a real certificate there
# (tls.crt + tls.key) replaces this one without touching the config.
set -eu

dir=/etc/nginx/certs

if [ -s "$dir/tls.crt" ] && [ -s "$dir/tls.key" ]; then
  echo "05-self-signed-cert: certificate already present, keeping it"
  exit 0
fi

mkdir -p "$dir"
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout "$dir/tls.key" -out "$dir/tls.crt" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
chmod 600 "$dir/tls.key"
echo "05-self-signed-cert: generated a self-signed certificate for localhost"
