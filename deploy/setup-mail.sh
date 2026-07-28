#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${1:-}"
SERVER_IP="${2:-}"
RECIPIENT="${3:-}"
APP_DIR="${APP_DIR:-/opt/gradstroyaudit}"
MAIL_HOST="mail.${DOMAIN}"
SELECTOR="default"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запустите скрипт от root." >&2
  exit 1
fi

if [[ -z "$DOMAIN" || -z "$SERVER_IP" || -z "$RECIPIENT" ]]; then
  echo "Использование: setup-mail.sh <ascii-domain> <server-ip> <email-получателя>" >&2
  exit 2
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "Не найден $APP_DIR/.env" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
echo "postfix postfix/mailname string ${MAIL_HOST}" | debconf-set-selections
echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections

echo "[1/5] Устанавливаем локальный почтовый сервер"
apt-get update
apt-get install -y postfix opendkim opendkim-tools

echo "[2/5] Настраиваем исходящую почту"
postconf -e "myhostname = ${MAIL_HOST}"
postconf -e "mydomain = ${DOMAIN}"
postconf -e "myorigin = ${DOMAIN}"
postconf -e "inet_interfaces = loopback-only"
postconf -e "mydestination = localhost"
postconf -e "relayhost ="
postconf -e "mynetworks = 127.0.0.0/8 [::1]/128"
postconf -e "smtp_tls_security_level = may"
postconf -e "smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt"
postconf -e "smtp_helo_name = \$myhostname"

echo "[3/5] Создаём DKIM-подпись"
KEY_DIR="/etc/opendkim/keys/${DOMAIN}"
install -d -m 0750 -o opendkim -g opendkim "$KEY_DIR"
if [[ ! -f "$KEY_DIR/${SELECTOR}.private" ]]; then
  opendkim-genkey -b 2048 -d "$DOMAIN" -D "$KEY_DIR" -s "$SELECTOR"
fi
chown -R opendkim:opendkim "$KEY_DIR"
chmod 0600 "$KEY_DIR/${SELECTOR}.private"

cat > /etc/opendkim.conf <<EOF
Syslog                  yes
UMask                   007
PidFile                 /run/opendkim/opendkim.pid
UserID                  opendkim:opendkim
Mode                    sv
Canonicalization        relaxed/simple
SubDomains              no
AutoRestart             yes
AutoRestartRate         10/1h
Background              yes
DNSTimeout              5
SignatureAlgorithm      rsa-sha256
Socket                  inet:8891@localhost
KeyTable                refile:/etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts
EOF

cat > /etc/opendkim/KeyTable <<EOF
${SELECTOR}._domainkey.${DOMAIN} ${DOMAIN}:${SELECTOR}:${KEY_DIR}/${SELECTOR}.private
EOF
cat > /etc/opendkim/SigningTable <<EOF
*@${DOMAIN} ${SELECTOR}._domainkey.${DOMAIN}
EOF
cat > /etc/opendkim/TrustedHosts <<EOF
127.0.0.1
localhost
${DOMAIN}
*.${DOMAIN}
EOF

if [[ -f /etc/default/opendkim ]]; then
  if grep -q '^SOCKET=' /etc/default/opendkim; then
    sed -i 's|^SOCKET=.*|SOCKET="inet:8891@localhost"|' /etc/default/opendkim
  else
    echo 'SOCKET="inet:8891@localhost"' >> /etc/default/opendkim
  fi
fi

postconf -e "milter_default_action = accept"
postconf -e "milter_protocol = 6"
postconf -e "smtpd_milters = inet:localhost:8891"
postconf -e "non_smtpd_milters = inet:localhost:8891"

echo "[4/5] Подключаем CMS к локальной очереди"
set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$APP_DIR/.env"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$APP_DIR/.env"
  else
    printf '%s=%s\n' "$key" "$value" >> "$APP_DIR/.env"
  fi
}

set_env "LEAD_EMAIL_TO" "$RECIPIENT"
set_env "LEAD_DELIVERY" "local"
set_env "SMTP_FROM" "site@${DOMAIN}"
chown gradstroy:gradstroy "$APP_DIR/.env"
chmod 0600 "$APP_DIR/.env"

postfix check
install -d -m 0755 -o opendkim -g opendkim /run/opendkim
rm -f /run/opendkim/opendkim.pid
systemctl enable --now opendkim postfix
systemctl restart opendkim postfix gradstroyaudit.service

echo "[5/5] Проверяем службы"
systemctl is-active --quiet opendkim
systemctl is-active --quiet postfix
systemctl is-active --quiet gradstroyaudit.service

echo
echo "============================================================"
echo "ЛОКАЛЬНАЯ ОТПРАВКА ЗАЯВОК НАСТРОЕНА"
echo
echo "Добавьте в DNS:"
echo "A    mail                     ${SERVER_IP}"
echo "TXT  @                        v=spf1 a:${MAIL_HOST} ip4:${SERVER_IP} -all"
echo "TXT  _dmarc                   v=DMARC1; p=none; adkim=s; aspf=s"
echo "TXT  ${SELECTOR}._domainkey   значение из блока ниже:"
cat "$KEY_DIR/${SELECTOR}.txt"
echo
echo "У провайдера VPS задайте PTR: ${SERVER_IP} -> ${MAIL_HOST}"
echo "Заявки уже сохраняются в CMS даже до добавления DNS-записей."
echo "============================================================"
