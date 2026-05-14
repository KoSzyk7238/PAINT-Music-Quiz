import requests
import json
import re

url = "https://music.apple.com/pl/song/niepowstrzymany/1137613675?l=pl"

# Test regex 1: path ID
match = re.search(r'/(\d+)(?:\?|$)', url)
print("Path ID Match:", match.group(1) if match else "None")

# Test regex 2: query parameter 'i'
match2 = re.search(r'[?&]i=(\d+)', url)
print("Query ID Match:", match2.group(1) if match2 else "None")

track_id = match2.group(1) if match2 else (match.group(1) if match else None)

if track_id:
    resp = requests.get(f"https://itunes.apple.com/lookup?id={track_id}", timeout=3)
    data = resp.json()
    print("Results length:", len(data.get('results', [])))
    if data.get('results'):
        print("WrapperType:", data['results'][0].get('wrapperType'))
        print("Preview URL:", data['results'][0].get('previewUrl'))
        print("Raw JSON:", json.dumps(data['results'][0], indent=2))
