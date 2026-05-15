#!/usr/bin/env zsh
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Mini-Kosmos CMS → VPS (minikosmos.marrazzo.digital)
# Ausführen: zsh deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

REMOTE="mzzo"          # SSH alias aus ~/.ssh/config
SERVICE="minikosmos"
SERVICE_DIR="/opt/services/$SERVICE"
COMPOSE="/opt/services/docker-compose.yml"
CADDYFILE="/opt/services/caddy/Caddyfile"
PORT="3002"
SUBDOMAIN="minikosmos.marrazzo.digital"

echo "▶ Verbindung prüfen …"
ssh "$REMOTE" "echo '  ✓ SSH OK'" || { echo "✗ SSH fehlgeschlagen"; exit 1; }

echo ""
echo "▶ Dateien auf VPS synchronisieren …"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude 'cms/data' \
  --exclude '.env' \
  --exclude 'deploy.sh' \
  --exclude 'docs' \
  --exclude '.git' \
  --exclude '.claude' \
  --exclude '.DS_Store' \
  --exclude '*.pdf' \
  --exclude '*.md' \
  "$PROJECT_ROOT/" \
  "$REMOTE:$SERVICE_DIR/"
echo "  ✓ Sync abgeschlossen"

echo ""
echo "▶ .env auf VPS anlegen (falls nicht vorhanden) …"
ssh "$REMOTE" "
  if [ ! -f '$SERVICE_DIR/.env' ]; then
    cat > '$SERVICE_DIR/.env' << 'ENVEOF'
PORT=$PORT
ADMIN_PASSWORD=minikosmos2026
SESSION_SECRET=$(openssl rand -hex 16 2>/dev/null || echo 'change-me-32chars-random')
DATA_DIR=/app/data
ENVEOF
    chmod 600 '$SERVICE_DIR/.env'
    echo '  ✓ .env angelegt (chmod 600)'
  else
    chmod 600 '$SERVICE_DIR/.env'
    echo '  ℹ .env existiert bereits — Berechtigungen geprüft'
  fi
"

echo ""
echo "▶ docker-compose.yml — minikosmos Service eintragen …"
ssh "$REMOTE" "
  if grep -q 'minikosmos' '$COMPOSE'; then
    echo '  ℹ Eintrag existiert bereits'
  else
    python3 - '$COMPOSE' << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path) as f:
    content = f.read()

block = '''
  minikosmos:
    build: $SERVICE_DIR
    container_name: minikosmos
    restart: unless-stopped
    env_file: $SERVICE_DIR/.env
    volumes:
      - $SERVICE_DIR/data:/app/data
    networks:
      - web
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
'''

# Insert before top-level 'networks:' if present, else before 'volumes:' or append
for anchor in (r'^networks:', r'^volumes:'):
    m = re.search(anchor, content, re.MULTILINE)
    if m:
        content = content[:m.start()] + block + content[m.start():]
        break
else:
    content += block

with open(path, 'w') as f:
    f.write(content)

print('  ✓ Service eingetragen')
PYEOF
  fi
"

echo ""
echo "▶ Caddyfile — Subdomain-Block eintragen …"
ssh "$REMOTE" "
  if grep -q '$SUBDOMAIN' '$CADDYFILE'; then
    echo '  ℹ Subdomain existiert bereits'
  else
    cat >> '$CADDYFILE' << 'CADEOF'

$SUBDOMAIN {
  reverse_proxy minikosmos:$PORT
}
CADEOF
    echo '  ✓ Caddy-Block eingetragen'
  fi
"

echo ""
echo "▶ Docker Image bauen & Container starten …"
ssh "$REMOTE" "
  cd /opt/services
  docker compose build $SERVICE
  docker compose up -d $SERVICE
  echo '  ✓ Container läuft'
"

echo ""
echo "▶ Caddy neu laden …"
ssh "$REMOTE" "docker exec caddy caddy reload --config /etc/caddy/Caddyfile && echo '  ✓ Caddy neu geladen'"

echo ""
echo "────────────────────────────────────────────────────────────────────────"
echo "✅ Deployment abgeschlossen!"
echo ""
echo "  Website:   https://$SUBDOMAIN"
echo "  Admin:     https://$SUBDOMAIN/admin"
echo "  Passwort:  minikosmos2026  (in .env auf VPS änderbar)"
echo ""
echo "⚠  DNS-Eintrag nötig (bei Namecheap):"
echo "   Typ: A   Host: minikosmos   Wert: 46.62.252.17   TTL: Auto"
echo "────────────────────────────────────────────────────────────────────────"
