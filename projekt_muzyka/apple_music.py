import re
import requests


def resolve_preview_url(url):
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
            timeout=3,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        results = data.get("results") or []
        if not results:
            return None
        return results[0].get("previewUrl")
    except Exception:
        return None
