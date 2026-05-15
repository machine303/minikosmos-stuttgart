#!/usr/bin/env zsh
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Mini-Kosmos CMS → VPS (minikosmos.marrazzo.digital)
# Ausführen: zsh deploy.sh
#
# Fail2Ban-sicher: max. 2 SSH-Verbindungen (rsync + 1x ssh)
# ─────────────────────────────────────────────────────────────────────────────
set -e

REMOTE="mzzo"          # SSH alias aus ~/.ssh/config
SERVICE="minikosmos"
SERVICE_DIR="/opt/services/$SERVICE"
PORT="3002"
SUBDOMAIN="minikosmos.marrazzo.digital"

# ── 1. Rsync (eigene SSH-Verbindung) ────────────────────────────────────────
echo "▶ Dateien auf VPS synchronisieren …"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude 'data' \
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

# ── 2. Alles Weitere in EINEM SSH-Call ──────────────────────────────────────
echo ""
echo "▶ Server-Setup + Docker Build (ein SSH-Call) …"
ssh "$REMOTE" "
  set -e

  # .env anlegen falls nicht vorhanden
  if [ ! -f '$SERVICE_DIR/.env' ]; then
    cat > '$SERVICE_DIR/.env' << 'ENVEOF'
PORT=$PORT
ADMIN_PASSWORD=minikosmos2026
SESSION_SECRET=\$(openssl rand -hex 16 2>/dev/null || echo 'change-me-32chars-random')
DATA_DIR=/app/data
ENVEOF
    chmod 600 '$SERVICE_DIR/.env'
    echo '  ✓ .env angelegt'
  else
    chmod 600 '$SERVICE_DIR/.env'
    echo '  ✓ .env vorhanden'
  fi

  # Docker Image bauen + Container starten
  cd /opt/services
  echo '  ▶ Docker Build …'
  docker compose build $SERVICE
  docker compose up -d $SERVICE
  echo '  ✓ Container läuft'

  # Caddy neu laden (falls Caddyfile sich geändert hat)
  docker exec caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null && echo '  ✓ Caddy neu geladen' || echo '  ℹ Caddy reload übersprungen'
"

echo ""
echo "────────────────────────────────────────────────────────────────────────"
echo "✅ Deployment abgeschlossen!"
echo ""
echo "  Website:   https://$SUBDOMAIN"
echo "  Admin:     https://$SUBDOMAIN/admin"
echo "────────────────────────────────────────────────────────────────────────"
