#!/bin/bash
# Mini Kosmos Stuttgart – Quick Scrape
# Nutzung: ./run_scrape.sh [--login USERNAME]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  Mini Kosmos Stuttgart – Instagram Scraper ║"
echo "║  Projekt: Marrazzo.ai                      ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Dependencies prüfen
if ! python3 -c "import instaloader" 2>/dev/null; then
    echo "📦 Installiere instaloader..."
    pip3 install instaloader requests beautifulsoup4
fi

# Ausführen
python3 scraper/scrape_instagram.py "$@"

echo ""
echo "📁 Ergebnisse in: data/"
echo "📊 JSON:          data/minikosmos_complete.json"
echo "📝 Summary:       docs/SCRAPING_SUMMARY.md"
echo ""
echo "Nächster Schritt: JSON + Bilder in Claude hochladen"
