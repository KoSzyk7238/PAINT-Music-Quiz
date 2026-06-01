import json
import re
import html as html_lib
from urllib.parse import unquote

import requests


def fetch_apple_music_metadata(url):
    if not url or "music.apple.com" not in url:
        return None

    track_id = None
    match_i = re.search(r"[?&]i=(\d+)", url)
    if match_i:
        track_id = match_i.group(1)
    else:
        match = re.search(r"/(\d+)(?:\?|$|&)", url)
        if match:
            track_id = match.group(1)

    if not track_id:
        return None

    country = "us"
    country_match = re.search(r"music\.apple\.com/([a-z]{2})/", url)
    if country_match:
        country = country_match.group(1)

    try:
        resp = requests.get(
            f"https://itunes.apple.com/lookup?id={track_id}&country={country}",
            timeout=5,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        results = data.get("results") or []
        if not results:
            return None

        track = results[0]
        metadata = {
            'title': track.get('trackName'),
            'artist': track.get('artistName'),
            'preview_url': track.get('previewUrl'),
            'genre': track.get('primaryGenreName'),
            'artwork_url': track.get('artworkUrl100'),
        }

        # Parse release year
        release_date = track.get('releaseDate')
        if release_date and len(release_date) >= 4:
            try:
                metadata['release_year'] = int(release_date[:4])
            except ValueError:
                pass

        return metadata
    except Exception:
        return None


def resolve_preview_url(url):
    metadata = fetch_apple_music_metadata(url)
    if metadata:
        return metadata.get("preview_url")
    return None


def extract_track_ids_from_playlist_url(playlist_url):
    if not playlist_url or "music.apple.com" not in playlist_url:
        return []

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7"
    }
    try:
        resp = requests.get(playlist_url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return []
        html = resp.text
    except Exception:
        return []

    # 1. Try parsing JSON-LD schema
    ld_json_blocks = re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL)
    song_urls = []

    for block in ld_json_blocks:
        try:
            data = json.loads(block.strip())
            
            def get_songs(p_data):
                urls = []
                if isinstance(p_data, dict) and p_data.get("@type") == "MusicPlaylist":
                    for track in p_data.get("track", []):
                        if isinstance(track, dict) and track.get("url"):
                            urls.append(track.get("url"))
                return urls

            if isinstance(data, dict):
                song_urls.extend(get_songs(data))
            elif isinstance(data, list):
                for item in data:
                    song_urls.extend(get_songs(item))
        except Exception:
            pass

    # 2. Fallback to og:music:song or music:song tags
    if not song_urls:
        meta_songs = re.findall(r'<meta[^>]*property="music:song"[^>]*content="([^"]+)"', html)
        if meta_songs:
            song_urls.extend(meta_songs)

    # 3. Fallback to regex finding any song URLs in the text
    if not song_urls:
        # e.g., "https://music.apple.com/pl/song/ran-to-atlanta/6769568597"
        song_urls = re.findall(r'https://music\.apple\.com/[a-z]{2}/song/[^"\'\s>]+', html)

    # Parse out the track IDs
    track_ids = []
    for url in song_urls:
        match = re.search(r'/song/[^/]+/(\d+)|/song/(\d+)', url)
        if match:
            track_id = match.group(1) or match.group(2)
            track_ids.append(track_id)

    # De-duplicate while preserving order
    seen = set()
    unique_ids = []
    for tid in track_ids:
        if tid not in seen:
            seen.add(tid)
            unique_ids.append(tid)

    return unique_ids


def _normalize_playlist_text(text: str) -> str:
    return html_lib.unescape(text or "").replace("\u200e", "").replace("\u200f", "").strip()


def _playlist_title_from_url_slug(playlist_url: str) -> str:
    match = re.search(r"/playlist/([^/]+)/", playlist_url)
    if not match:
        return ""
    slug = unquote(match.group(1)).replace("-", " ").replace("_", " ").strip()
    return slug


def _extract_playlist_name_from_html(html: str) -> str | None:
    """Nazwa playlisty z JSON-LD lub og:title — bez tagu <title> (ma dopiski Apple Music)."""
    ld_json_blocks = re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.DOTALL,
    )
    for block in ld_json_blocks:
        try:
            data = json.loads(block.strip())
            candidates = data if isinstance(data, list) else [data]
            for item in candidates:
                if (
                    isinstance(item, dict)
                    and item.get("@type") == "MusicPlaylist"
                    and item.get("name")
                ):
                    return _normalize_playlist_text(str(item["name"]))
        except Exception:
            pass

    og_title_match = re.search(
        r'<meta[^>]*property="og:title"[^>]*content="([^"]+)"',
        html,
        re.IGNORECASE,
    )
    if og_title_match:
        return _normalize_playlist_text(og_title_match.group(1))

    return None


def fetch_multiple_apple_music_metadata(track_ids, country="pl"):
    if not track_ids:
        return {}

    results_dict = {}
    # Chunk into sizes of 100 for safety with the API
    for i in range(0, len(track_ids), 100):
        chunk = track_ids[i:i+100]
        ids_str = ",".join(chunk)
        try:
            resp = requests.get(
                f"https://itunes.apple.com/lookup?id={ids_str}&country={country}",
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                for track in data.get("results", []):
                    tid = str(track.get("trackId"))
                    metadata = {
                        'title': track.get('trackName'),
                        'artist': track.get('artistName'),
                        'preview_url': track.get('previewUrl'),
                        'genre': track.get('primaryGenreName'),
                        'artwork_url': track.get('artworkUrl100'),
                    }
                    release_date = track.get('releaseDate')
                    if release_date and len(release_date) >= 4:
                        try:
                            metadata['release_year'] = int(release_date[:4])
                        except ValueError:
                            pass
                    results_dict[tid] = metadata
        except Exception:
            pass
    return results_dict


def extract_playlist_name_and_desc(playlist_url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    title = _playlist_title_from_url_slug(playlist_url) or "Nowy Quiz Apple Music"
    description = ""
    try:
        resp = requests.get(playlist_url, headers=headers, timeout=5)
        if resp.status_code == 200:
            html = resp.content.decode("utf-8", errors="replace")

            raw_title = _extract_playlist_name_from_html(html)
            if raw_title:
                title = raw_title

            desc_match = re.search(
                r'<meta[^>]*property="og:description"[^>]*content="([^"]+)"',
                html,
            )
            if not desc_match:
                desc_match = re.search(
                    r'<meta[^>]*name="description"[^>]*content="([^"]+)"',
                    html,
                )
            if desc_match:
                description = html_lib.unescape(desc_match.group(1).strip())
                description = description.replace("\u200e", "").replace("\u200f", "").strip()
    except Exception:
        pass
    return title, description


def fetch_playlist_cover_image(playlist_url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    try:
        resp = requests.get(playlist_url, headers=headers, timeout=5)
        if resp.status_code == 200:
            html = resp.text
            img_match = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html)
            if img_match:
                img_url = img_match.group(1)
                # Zamieniamy ostatni segment URL (np. "1200x630SC.FPESS04-60.jpg" lub "1200x630bf.jpg") na "1000x1000bb.jpg"
                base_url = img_url.split('?')[0]
                query = img_url.split('?')[1] if '?' in img_url else ''
                parts = base_url.split('/')
                if parts and re.search(r'\d+x\d+', parts[-1]):
                    parts[-1] = "1000x1000bb.jpg"
                    img_url = "/".join(parts)
                    if query:
                        img_url += "?" + query
                else:
                    img_url = img_url.replace("1200x630bf", "1000x1000bb")

                img_resp = requests.get(img_url, timeout=5)
                if img_resp.status_code == 200:
                    return img_resp.content
    except Exception:
        pass
    return None

