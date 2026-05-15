#!/usr/bin/env python3
"""
Mini Kosmos Stuttgart – Instagram Scraper
=========================================
Projekt: Marrazzo.ai → One-Pager Website für Mini Kosmos
Ziel: Alle öffentlichen Daten + mit Login auch Stories/Highlights ziehen
Ausgabe: JSON-Datei + heruntergeladene Medien in strukturierter Ordnerstruktur

Nutzung:
  1. Ohne Login (nur öffentliche Posts + Bio):
     python scrape_instagram.py

  2. Mit Login (+ Stories, Highlights, private Infos):
     python scrape_instagram.py --login DEIN_USERNAME
     (Passwort wird interaktiv abgefragt)

  3. Mit Session-File (nach erstem Login):
     python scrape_instagram.py --session DEIN_USERNAME
"""

import instaloader
import json
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path
from collections import Counter

# === KONFIGURATION ===
TARGET_PROFILE = "minikosmos.stuttgart"
BASE_DIR = Path(__file__).parent.parent / "02_Rohdaten"
POSTS_DIR = BASE_DIR / "posts"
STORIES_DIR = BASE_DIR / "stories"
HIGHLIGHTS_DIR = BASE_DIR / "highlights"
PROFILE_DIR = BASE_DIR / "profile"

# Sicherstellen, dass alle Verzeichnisse existieren
for d in [POSTS_DIR, STORIES_DIR, HIGHLIGHTS_DIR, PROFILE_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def setup_loader(login_user=None, session_user=None):
    """Instaloader konfigurieren"""
    L = instaloader.Instaloader(
        dirname_pattern=str(POSTS_DIR / "{shortcode}"),
        download_videos=True,
        download_video_thumbnails=True,
        download_geotags=True,
        download_comments=True,
        save_metadata=True,
        compress_json=False,
        post_metadata_txt_pattern="",  # Kein .txt pro Post
        max_connection_attempts=3,
    )

    if session_user:
        try:
            L.load_session_from_file(session_user)
            print(f"✅ Session geladen für: {session_user}")
        except FileNotFoundError:
            print(f"❌ Keine Session-Datei für '{session_user}' gefunden.")
            print("   Nutze --login stattdessen.")
            sys.exit(1)

    elif login_user:
        try:
            L.login(login_user, input(f"Passwort für {login_user}: "))
            print(f"✅ Eingeloggt als: {login_user}")
        except instaloader.exceptions.BadCredentialsException:
            print("❌ Login fehlgeschlagen – Zugangsdaten prüfen.")
            sys.exit(1)
        except instaloader.exceptions.TwoFactorAuthRequiredException:
            print("❌ 2FA aktiv – Code eingeben:")
            code = input("2FA-Code: ")
            L.two_factor_login(code)
            print(f"✅ 2FA-Login erfolgreich: {login_user}")

    else:
        print("ℹ️  Kein Login – nur öffentliche Daten werden gezogen.")

    return L


def scrape_profile(L, profile):
    """Profil-Metadaten extrahieren"""
    print(f"\n📋 Profil: @{profile.username}")
    print(f"   Name:      {profile.full_name}")
    print(f"   Bio:       {profile.biography}")
    print(f"   Link:      {profile.external_url}")
    print(f"   Followers: {profile.followers}")
    print(f"   Following: {profile.followees}")
    print(f"   Posts:     {profile.mediacount}")
    print(f"   Privat:    {profile.is_private}")
    print(f"   Verifiz.:  {profile.is_verified}")
    print(f"   Business:  {profile.is_business_account}")
    if profile.business_category_name:
        print(f"   Kategorie: {profile.business_category_name}")

    data = {
        "username": profile.username,
        "full_name": profile.full_name,
        "biography": profile.biography,
        "bio_links": profile.biography_mentions,
        "bio_hashtags": profile.biography_hashtags,
        "external_url": profile.external_url,
        "followers": profile.followers,
        "followees": profile.followees,
        "mediacount": profile.mediacount,
        "is_private": profile.is_private,
        "is_verified": profile.is_verified,
        "is_business_account": profile.is_business_account,
        "business_category": profile.business_category_name,
        "profile_pic_url": profile.profile_pic_url,
        "userid": profile.userid,
        "scraped_at": datetime.now().isoformat(),
    }

    # Profilbild herunterladen
    L.download_profilepic(profile)

    return data


def scrape_posts(L, profile):
    """Alle Posts mit Metadaten scrapen"""
    posts = []
    all_hashtags = Counter()
    all_mentions = Counter()

    print(f"\n📸 Lade {profile.mediacount} Posts...")

    for i, post in enumerate(profile.get_posts()):
        caption = post.caption or ""
        hashtags = post.caption_hashtags
        mentions = post.caption_mentions

        for tag in hashtags:
            all_hashtags[tag] += 1
        for mention in mentions:
            all_mentions[mention] += 1

        post_data = {
            "shortcode": post.shortcode,
            "date": post.date_utc.isoformat(),
            "caption": caption,
            "hashtags": hashtags,
            "mentions": mentions,
            "likes": post.likes,
            "comments": post.comments,
            "location": str(post.location) if post.location else None,
            "is_video": post.is_video,
            "video_view_count": post.video_view_count if post.is_video else None,
            "media_url": post.url,
            "typename": post.typename,
            "accessibility_caption": post.accessibility_caption,
        }
        posts.append(post_data)

        # Medien herunterladen
        try:
            L.download_post(post, target=POSTS_DIR / post.shortcode)
        except Exception as e:
            print(f"   ⚠️ Post {post.shortcode} konnte nicht geladen werden: {e}")

        if (i + 1) % 10 == 0:
            print(f"   ... {i + 1} Posts verarbeitet")

    print(f"   ✅ {len(posts)} Posts geladen")

    return posts, dict(all_hashtags.most_common(50)), dict(all_mentions.most_common(20))


def scrape_stories(L, profile):
    """Stories scrapen (nur mit Login)"""
    print("\n📖 Lade Stories...")
    try:
        L.download_stories(userids=[profile.userid])
        print("   ✅ Stories geladen (falls vorhanden)")
        return True
    except instaloader.exceptions.LoginRequiredException:
        print("   ⚠️ Stories brauchen Login – übersprungen")
        return False
    except Exception as e:
        print(f"   ⚠️ Stories-Fehler: {e}")
        return False


def scrape_highlights(L, profile):
    """Highlights scrapen (nur mit Login)"""
    print("\n⭐ Lade Highlights...")
    try:
        L.download_highlights(profile)
        print("   ✅ Highlights geladen (falls vorhanden)")
        return True
    except instaloader.exceptions.LoginRequiredException:
        print("   ⚠️ Highlights brauchen Login – übersprungen")
        return False
    except Exception as e:
        print(f"   ⚠️ Highlights-Fehler: {e}")
        return False


def scrape_linktree(url):
    """Linktree oder ähnliche Link-Aggregatoren scrapen"""
    if not url:
        print("\n🔗 Kein externer Link vorhanden – übersprungen")
        return None

    print(f"\n🔗 Externer Link: {url}")

    try:
        import requests
        from bs4 import BeautifulSoup

        resp = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        })
        soup = BeautifulSoup(resp.text, "html.parser")

        # Titel
        title = soup.title.string if soup.title else None

        # Alle Links extrahieren
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            text = a.get_text(strip=True)
            if href.startswith("http") and "linktr.ee" not in href:
                links.append({"url": href, "text": text})

        # Meta-Description
        meta_desc = None
        meta = soup.find("meta", attrs={"name": "description"})
        if meta:
            meta_desc = meta.get("content")

        result = {
            "source_url": url,
            "page_title": title,
            "meta_description": meta_desc,
            "links": links,
            "scraped_at": datetime.now().isoformat(),
        }

        print(f"   ✅ {len(links)} Links gefunden")
        return result

    except Exception as e:
        print(f"   ⚠️ Link-Scraping fehlgeschlagen: {e}")
        return {"source_url": url, "error": str(e)}


def analyze_tonality(posts_data):
    """Einfache Tonalitäts-Analyse basierend auf Captions"""
    print("\n🎨 Tonalitäts-Analyse...")

    all_captions = " ".join([p["caption"] for p in posts_data if p["caption"]])
    words = all_captions.lower().split()
    word_count = len(words)

    # Emoji-Analyse
    import re
    emoji_pattern = re.compile(
        "[\U0001F600-\U0001F64F"  # Emoticons
        "\U0001F300-\U0001F5FF"  # Symbols & Pictographs
        "\U0001F680-\U0001F6FF"  # Transport & Map
        "\U0001F1E0-\U0001F1FF"  # Flags
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001f926-\U0001f937"
        "\U0001F1F2-\U0001F1F4"
        "\U0001F620-\U0001F640"
        "\U0001F910-\U0001F93E"
        "]+", flags=re.UNICODE
    )
    emojis = emoji_pattern.findall(all_captions)

    # Sprach-Erkennung (deutsch vs englisch)
    german_markers = ["und", "der", "die", "das", "für", "mit", "ist", "wir",
                       "ihr", "uns", "euch", "bei", "auf", "ein", "eine"]
    english_markers = ["and", "the", "for", "with", "is", "we", "you", "our",
                        "at", "on", "a", "an"]

    de_count = sum(1 for w in words if w in german_markers)
    en_count = sum(1 for w in words if w in english_markers)
    language = "deutsch" if de_count > en_count else "englisch" if en_count > de_count else "gemischt"

    # Caption-Längen
    caption_lengths = [len(p["caption"]) for p in posts_data if p["caption"]]
    avg_caption_len = sum(caption_lengths) / max(len(caption_lengths), 1)

    # Posting-Frequenz
    dates = sorted([p["date"] for p in posts_data if p["date"]])
    posting_frequency = None
    if len(dates) >= 2:
        first = datetime.fromisoformat(dates[0])
        last = datetime.fromisoformat(dates[-1])
        days_span = (last - first).days
        if days_span > 0:
            posting_frequency = f"ca. {len(dates) / (days_span / 7):.1f} Posts/Woche"

    # Häufigste Wörter (ohne Stoppwörter)
    stopwords = set(german_markers + english_markers + [
        "in", "von", "zu", "den", "des", "am", "im", "an", "es",
        "so", "du", "ich", "man", "auch", "sich", "wie", "was",
        "noch", "nicht", "schon", "aber", "oder", "wenn", "mehr",
        "hat", "sind", "war", "sein", "kann", "wird", "alle",
    ])
    content_words = [w for w in words if len(w) > 3 and w not in stopwords
                     and not w.startswith("#") and not w.startswith("@")]
    word_freq = Counter(content_words).most_common(30)

    analysis = {
        "primary_language": language,
        "german_word_ratio": de_count / max(word_count, 1),
        "total_captions": len(caption_lengths),
        "avg_caption_length_chars": round(avg_caption_len),
        "total_word_count": word_count,
        "posting_frequency": posting_frequency,
        "emoji_count": len(emojis),
        "top_emojis": Counter("".join(emojis)).most_common(10),
        "top_content_words": word_freq,
        "caption_style": (
            "kurz & knackig" if avg_caption_len < 100
            else "mittel, informativ" if avg_caption_len < 300
            else "ausführlich, storytelling"
        ),
    }

    print(f"   Sprache:         {language}")
    print(f"   Ø Caption-Länge: {avg_caption_len:.0f} Zeichen")
    print(f"   Posting-Freq.:   {posting_frequency or 'unbekannt'}")
    print(f"   Caption-Stil:    {analysis['caption_style']}")

    return analysis


def save_results(profile_data, posts_data, hashtags, mentions, linktree, tonality):
    """Alles in eine strukturierte JSON-Datei speichern"""
    output = {
        "meta": {
            "project": "Marrazzo.ai – Mini Kosmos One-Pager",
            "target": TARGET_PROFILE,
            "scraped_at": datetime.now().isoformat(),
            "script_version": "1.0",
        },
        "profile": profile_data,
        "posts": posts_data,
        "hashtag_analysis": hashtags,
        "mention_analysis": mentions,
        "linktree": linktree,
        "tonality_analysis": tonality,
        "website_recommendations": {
            "note": "Diese Sektion wird nach manueller Review befüllt",
            "hero_image_candidates": [],
            "key_messages": [],
            "color_palette_from_content": [],
            "suggested_sections": [
                "Hero / Intro",
                "Über uns / Vision",
                "Angebote / Leistungen",
                "Galerie / Impressionen",
                "Kontakt / Social Links",
            ],
        },
    }

    output_file = BASE_DIR / "minikosmos_complete.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n💾 Gespeichert: {output_file}")
    print(f"   Datengröße: {output_file.stat().st_size / 1024:.1f} KB")

    # Zusammenfassung auch als Markdown
    summary_file = BASE_DIR.parent / "03_Analyse" / "SCRAPING_SUMMARY.md"
    with open(summary_file, "w", encoding="utf-8") as f:
        f.write(f"# Mini Kosmos Stuttgart – Scraping-Zusammenfassung\n\n")
        f.write(f"**Datum:** {datetime.now().strftime('%d.%m.%Y %H:%M')}\n")
        f.write(f"**Profil:** @{profile_data['username']}\n\n")
        f.write(f"## Profil\n")
        f.write(f"- **Name:** {profile_data['full_name']}\n")
        f.write(f"- **Bio:** {profile_data['biography']}\n")
        f.write(f"- **Link:** {profile_data['external_url']}\n")
        f.write(f"- **Follower:** {profile_data['followers']}\n")
        f.write(f"- **Posts:** {profile_data['mediacount']}\n\n")
        f.write(f"## Tonalität\n")
        f.write(f"- **Sprache:** {tonality['primary_language']}\n")
        f.write(f"- **Caption-Stil:** {tonality['caption_style']}\n")
        f.write(f"- **Posting-Frequenz:** {tonality['posting_frequency']}\n\n")
        f.write(f"## Top Hashtags\n")
        for tag, count in list(hashtags.items())[:15]:
            f.write(f"- #{tag} ({count}x)\n")
        f.write(f"\n## Top Content-Wörter\n")
        for word, count in tonality["top_content_words"][:15]:
            f.write(f"- {word} ({count}x)\n")
        f.write(f"\n## Nächste Schritte\n")
        f.write(f"1. JSON prüfen und Hero-Bilder auswählen\n")
        f.write(f"2. Tonalität mit Claude analysieren lassen (Captions hochladen)\n")
        f.write(f"3. Farb-Palette aus Top-Bildern extrahieren\n")
        f.write(f"4. One-Pager Wireframe erstellen\n")
        f.write(f"5. Website bauen\n")

    print(f"   Summary:   {summary_file}")

    return output_file


def main():
    parser = argparse.ArgumentParser(description="Mini Kosmos Instagram Scraper")
    parser.add_argument("--login", help="Instagram-Username für Login")
    parser.add_argument("--session", help="Session-File eines Users laden")
    parser.add_argument("--posts-only", action="store_true", help="Nur Posts, keine Stories/Highlights")
    parser.add_argument("--limit", type=int, help="Max. Anzahl Posts")
    args = parser.parse_args()

    print("=" * 60)
    print("  MINI KOSMOS STUTTGART – Instagram Scraper")
    print(f"  Ziel: @{TARGET_PROFILE}")
    print(f"  Projekt: Marrazzo.ai One-Pager")
    print("=" * 60)

    # Setup
    L = setup_loader(login_user=args.login, session_user=args.session)

    # Profil laden
    try:
        profile = instaloader.Profile.from_username(L.context, TARGET_PROFILE)
    except instaloader.exceptions.ProfileNotExistsException:
        print(f"\n❌ Profil @{TARGET_PROFILE} nicht gefunden!")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fehler beim Laden: {e}")
        sys.exit(1)

    if profile.is_private:
        print("\n⚠️  Profil ist privat – Login mit Follower-Account nötig!")
        if not (args.login or args.session):
            print("   Nutze --login USERNAME")
            sys.exit(1)

    # 1. Profil-Daten
    profile_data = scrape_profile(L, profile)

    # 2. Posts
    posts_data, hashtags, mentions = scrape_posts(L, profile)

    # 3. Stories (optional)
    if not args.posts_only:
        scrape_stories(L, profile)

    # 4. Highlights (optional)
    if not args.posts_only:
        scrape_highlights(L, profile)

    # 5. Linktree / External Link
    linktree = scrape_linktree(profile_data.get("external_url"))

    # 6. Tonalitäts-Analyse
    tonality = analyze_tonality(posts_data)

    # 7. Speichern
    output = save_results(profile_data, posts_data, hashtags, mentions, linktree, tonality)

    print("\n" + "=" * 60)
    print("  ✅ SCRAPING ABGESCHLOSSEN")
    print(f"  📁 Daten in: {BASE_DIR}")
    print(f"  📊 Haupt-JSON: {output}")
    print("=" * 60)
    print("\nNächster Schritt:")
    print("  → JSON + Bilder an Claude hochladen")
    print("  → Tonalität & Farbpalette ableiten")
    print("  → One-Pager generieren")


if __name__ == "__main__":
    main()
