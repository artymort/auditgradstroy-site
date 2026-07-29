#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gradstroyaudit}"
ENV_FILE="$APP_DIR/.env"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Запустите команду от root."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Не найден файл настроек: $ENV_FILE"
  exit 1
fi

read -r -s -p "Вставьте токен Telegram-бота и нажмите Enter: " BOT_TOKEN
echo

if [[ ! "$BOT_TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]{20,}$ ]]; then
  echo "Токен выглядит некорректно. Скопируйте его целиком из BotFather."
  exit 1
fi

BOT_INFO="$(curl --silent --show-error --fail \
  --max-time 15 \
  "https://api.telegram.org/bot${BOT_TOKEN}/getMe")"

if [[ "$BOT_INFO" != *'"ok":true'* ]]; then
  echo "Telegram не подтвердил токен."
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
    END {
      if (!written) print key "=" value
    }
  ' "$ENV_FILE" > "$temporary"
  install -m 0600 "$temporary" "$ENV_FILE"
  rm -f "$temporary"
}

set_env "TELEGRAM_BOT_TOKEN" "$BOT_TOKEN"
set_env "TELEGRAM_TIMEOUT_MS" "10000"

unset BOT_TOKEN
systemctl restart gradstroyaudit.service
systemctl is-active --quiet gradstroyaudit.service

echo
echo "Telegram-бот подключён к серверу."
echo "Теперь откройте CMS → Общие данные → Telegram-группа."
echo "Добавьте бота в группу и нажмите «Найти группу». Если группа не найдётся, напишите в ней /start."
