#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

STAGING_ROOT=${STAGING_ROOT:-/opt/vanstro-staging}
BACKUP_ROOT=${BACKUP_ROOT:-/opt/vanstro-backups}

apt-get update
apt-get install --yes --no-install-recommends ca-certificates curl gnupg openssl
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
. /etc/os-release
cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install --yes docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

install -d -m 0700 "$STAGING_ROOT" "$BACKUP_ROOT"
cat >"$STAGING_ROOT/README" <<'EOF'
VanStro staging runtime directory.
- .env.staging must be mode 600 and supplied out-of-band.
- Never place production secrets in this directory until staging gates pass.
- Use immutable image tags and record the digest before each rollout.
EOF
chmod 0600 "$STAGING_ROOT/README"

docker --version
docker compose version
printf 'Staging host provisioned at %s\n' "$STAGING_ROOT"
