import requests
import random

# Adres bazowy API MusicBrainz
MUSICBRAINZ_API_URL = "https://musicbrainz.org/ws/2/"

def search_artist(artist_name):
    """
    Wyszukuje artystów po nazwie w API MusicBrainz.
    """
    headers = {'Accept': 'application/json'}
    params = {'query': artist_name, 'fmt': 'json'}
    try:
        response = requests.get(f"{MUSICBRAINZ_API_URL}artist", params=params, headers=headers)
        response.raise_for_status()  # Rzuci wyjątkiem dla kodów błędów HTTP
        data = response.json()
        return data.get('artists', [])
    except requests.exceptions.RequestException as e:
        print(f"Błąd podczas komunikacji z API MusicBrainz: {e}")
        return []

def get_random_song_by_artist(artist_id, limit=100):
    """
    Pobiera listę piosenek dla danego artysty.
    """
    headers = {'Accept': 'application/json'}
    params = {'artist': artist_id, 'fmt': 'json', 'limit': limit}
    try:
        response = requests.get(f"{MUSICBRAINZ_API_URL}recording", params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data.get('recordings', [])
    except requests.exceptions.RequestException as e:
        print(f"Błąd podczas pobierania piosenek artysty: {e}")
        return []

# --- Przykład użycia ---
# Aby to przetestować, możesz dodać poniższy kod i uruchomić ten plik bezpośrednio:
# if __name__ == '__main__':
#     # Znajdź artystę
#     artists = search_artist("Queen")
#     if artists:
#         first_artist = artists[0]
#         artist_id = first_artist['id']
#         artist_name = first_artist['name']
#         print(f"Znaleziono artystę: {artist_name} (ID: {artist_id})")
#
#         # Znajdź piosenki tego artysty
#         songs = get_random_song_by_artist(artist_id, limit=5)
#         if songs:
#             print("\nZnalezione piosenki:")
#             for song in songs:
#                 print(f"- {song['title']}")
#     else:
#         print("Nie znaleziono artysty.")
