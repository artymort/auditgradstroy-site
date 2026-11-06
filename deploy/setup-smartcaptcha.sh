#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gradstroyaudit}"
ENV_FILE="$APP_DIR/.env"
SITE_KEY="ysc1_3gLzVBb4aa0rgwakVfN5AqMtcHEWv1iKyzzxN0Uz1684598b"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Запустите скрипт от root."
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Не найден файл настроек: $ENV_FILE"
  exit 1
fi

read -r -s -p "Вставьте секретный ключ SmartCaptcha (ysc2_...) и нажмите Enter: " SECRET_KEY
echo
if [[ ! "$SECRET_KEY" =~ ^ysc2_[A-Za-z0-9_-]{20,}$ ]]; then
  echo "Секретный ключ выглядит некорректно. Скопируйте его целиком из Yandex Cloud."
  exit 1
fi

set_env() {
  local key="$1"
  local value="$2"
  local temporary
  temporary="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { written = 0 }
    $0 ~ "^" key "=" {
      if (!written) print key "=" value
      written = 1
      next
    }
    { print }
    END { if (!written) print key "=" value }
  ' "$ENV_FILE" > "$temporary"
  install -m 0600 -o gradstroy -g gradstroy "$temporary" "$ENV_FILE"
  rm -f "$temporary"
}

set_env SMARTCAPTCHA_SITE_KEY "$SITE_KEY"
set_env SMARTCAPTCHA_SECRET_KEY "$SECRET_KEY"
set_env SMARTCAPTCHA_ENABLED 1
unset SECRET_KEY

systemctl restart gradstroyaudit.service
systemctl is-active --quiet gradstroyaudit.service
echo "SmartCaptcha включена. Проверьте отправку тестовой заявки на сайте."
