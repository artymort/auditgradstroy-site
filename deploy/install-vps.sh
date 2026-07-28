#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${1:-}"
ADMIN_EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$ADMIN_EMAIL" ]]; then
  echo "Usage: install-vps.sh <ascii-domain> <admin-email>" >&2
  exit 2
fi

CMS_DOMAIN="cms.${DOMAIN}"
REPOSITORY="https://github.com/artymort/auditgradstroy-site.git"
APP_DIR="/opt/gradstroyaudit"
SOURCE_DIR="/tmp/gradstroyaudit-source"
ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n' | tr '/+' 'AB')"
SESSION_SECRET="$(openssl rand -base64 48 | tr -d '\n')"

export DEBIAN_FRONTEND=noninteractive

echo "[1/9] Updating system packages"
apt-get update
apt-get install -y ca-certificates curl gnupg git nginx rsync ufw certbot python3-certbot-nginx openssl

echo "[2/9] Installing Node.js 22"
if ! command -v node >/dev/null 2>&1 || ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "[3/9] Downloading the website"
rm -rf "$SOURCE_DIR"
git clone --depth 1 --branch main "$REPOSITORY" "$SOURCE_DIR"
mkdir -p "$APP_DIR"
rsync -a --delete \
  --exclude '.env' \
  --exclude 'data/' \
  --exclude 'backups/' \
  --exclude 'media/uploads/' \
  "$SOURCE_DIR/" "$APP_DIR/"
rm -rf "$SOURCE_DIR"

echo "[4/9] Preparing storage and service account"
if ! id gradstroy >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin gradstroy
fi
mkdir -p "$APP_DIR/data" "$APP_DIR/backups" "$APP_DIR/media/uploads" "$APP_DIR/_site"

cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
SITE_URL=https://${DOMAIN}
BASEURL=
CMS_ADMIN_EMAIL=${ADMIN_EMAIL}
CMS_ADMIN_PASSWORD=${ADMIN_PASSWORD}
CMS_SESSION_SECRET=${SESSION_SECRET}
CMS_SECURE_COOKIE=1
CMS_TRUST_PROXY=1
CMS_DB_PATH=./data/cms.sqlite
CMS_MEDIA_DIR=./media/uploads
CMS_BACKUP_DIR=./backups
CMS_BACKUP_KEEP=14
LEAD_EMAIL_TO=veritasetlex@mail.ru
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_SECURE=1
SMTP_USER=veritasetlex@mail.ru
SMTP_PASSWORD=
SMTP_FROM=veritasetlex@mail.ru
EOF
chmod 600 "$APP_DIR/.env"

echo "[5/9] Installing dependencies and validating the build"
cd "$APP_DIR"
npm ci --no-audit --no-fund
chown -R gradstroy:gradstroy "$APP_DIR"
runuser -u gradstroy -- npm run check

echo "[6/9] Enabling the application and daily backups"
install -m 0644 "$APP_DIR/deploy/gradstroyaudit.service" /etc/systemd/system/gradstroyaudit.service
install -m 0644 "$APP_DIR/deploy/gradstroyaudit-backup.service" /etc/systemd/system/gradstroyaudit-backup.service
install -m 0644 "$APP_DIR/deploy/gradstroyaudit-backup.timer" /etc/systemd/system/gradstroyaudit-backup.timer
systemctl daemon-reload
systemctl enable --now gradstroyaudit.service
systemctl enable --now gradstroyaudit-backup.timer

echo "[7/9] Configuring Nginx"
cat > /etc/nginx/sites-available/gradstroyaudit <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ${CMS_DOMAIN};
    client_max_body_size 12m;

    location = / {
        return 302 /cms/;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sfn /etc/nginx/sites-available/gradstroyaudit /etc/nginx/sites-enabled/gradstroyaudit
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "[8/9] Opening only SSH, HTTP and HTTPS ports"
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

echo "[9/9] Running final checks and the first backup"
sleep 3
systemctl is-active --quiet gradstroyaudit.service
systemctl is-active --quiet nginx
curl -fsS -o /dev/null http://127.0.0.1:3000/
curl -fsS -o /dev/null http://127.0.0.1:3000/cms/
runuser -u gradstroy -- npm run backup

cat > /root/gradstroyaudit-credentials.txt <<EOF
Public site after DNS: https://${DOMAIN}
CMS after DNS: https://${CMS_DOMAIN}
Admin email: ${ADMIN_EMAIL}
Temporary admin password: ${ADMIN_PASSWORD}
EOF
chmod 600 /root/gradstroyaudit-credentials.txt

echo
echo "============================================================"
echo "INSTALLATION COMPLETED"
echo "Website by IP: http://201.24.117.83/"
echo "Credentials: /root/gradstroyaudit-credentials.txt"
echo "HTTPS will be enabled after the DNS records are configured."
echo "============================================================"
