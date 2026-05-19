from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from projekt_muzyka.models import UserProfile

class MusicQuizAuthTests(APITestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(username="testuser", password="testpassword123")
        # Profile is automatically created by signal, let's update its display_name
        self.profile = self.user.profile
        self.profile.display_name = "Test User"
        self.profile.save()
        
        # Create a second user for uniqueness testing
        self.other_user = User.objects.create_user(username="otheruser", password="otherpassword123")
        
    def test_user_registration(self):
        url = reverse("auth-register")
        data = {"username": "newuser", "password": "newpassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_user_registration_duplicate(self):
        url = reverse("auth-register")
        data = {"username": "testuser", "password": "newpassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login(self):
        url = reverse("auth-login")
        data = {"username": "testuser", "password": "testpassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_login_invalid(self):
        url = reverse("auth-login")
        data = {"username": "testuser", "password": "wrongpassword"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_profile(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("profile")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"], "testuser")
        self.assertEqual(response.data["display_name"], "Test User")

    def test_update_profile_display_name(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("profile")
        data = {"display_name": "New Display Name"}
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.display_name, "New Display Name")

    def test_update_profile_username(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("profile")
        data = {"username": "newusername"}
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "newusername")

    def test_update_profile_username_duplicate(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("profile")
        data = {"username": "otheruser"}
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "testuser") # Unchanged

    def test_change_password(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("auth-change-password")
        data = {"old_password": "testpassword123", "new_password": "newsecurepassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newsecurepassword123"))

    def test_change_password_invalid_old(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("auth-change-password")
        data = {"old_password": "wrongoldpassword", "new_password": "newsecurepassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("newsecurepassword123"))

    def test_delete_account(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("auth-delete-account")
        data = {"password": "testpassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(username="testuser").exists())
        self.assertFalse(UserProfile.objects.filter(user__username="testuser").exists())

    def test_delete_account_wrong_password(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("auth-delete-account")
        data = {"password": "wrongpassword"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(username="testuser").exists())


from unittest.mock import patch
from django.test import TestCase
from projekt_muzyka.models import Song, Genre
from projekt_muzyka.admin import SongAdminForm

class AppleMusicTests(TestCase):
    @patch('projekt_muzyka.apple_music.requests.get')
    def test_apple_music_metadata_fetching_success(self, mock_get):
        # Mock responses
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "resultCount": 1,
            "results": [
                {
                    "wrapperType": "track",
                    "kind": "song",
                    "artistName": "Jack Johnson",
                    "trackName": "Upside Down",
                    "previewUrl": "http://a1099.itunes.apple.com/r10/Music/f9/54/43/mzi.gqvqlvcq.aac.p.m4p",
                    "releaseDate": "2006-02-06T08:00:00Z",
                    "primaryGenreName": "Rock"
                }
            ]
        }

        # Form data with Apple Music URL and empty metadata fields
        data = {
            'apple_snippet_url': 'https://music.apple.com/us/album/upside-down/120954025?i=120954089',
            'duration_seconds': 30,
        }
        form = SongAdminForm(data=data)
        self.assertTrue(form.is_valid())
        
        # Check that the form auto-populated correct fields
        cleaned_data = form.cleaned_data
        self.assertEqual(cleaned_data['title'], "Upside Down")
        self.assertEqual(cleaned_data['artist'], "Jack Johnson")
        self.assertEqual(cleaned_data['release_year'], 2006)
        self.assertEqual(cleaned_data['apple_snippet_url'], "http://a1099.itunes.apple.com/r10/Music/f9/54/43/mzi.gqvqlvcq.aac.p.m4p")
        
        # Verify Genre was found/created
        self.assertEqual(cleaned_data['genre'].name, "Rock")

    def test_form_validation_fails_without_title_or_url(self):
        # Empty title and no apple snippet url should raise validation error
        data = {
            'apple_snippet_url': '',
            'title': '',
        }
        form = SongAdminForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('__all__', form.errors)
        self.assertIn("Tytuł piosenki jest wymagany", form.errors['__all__'][0])


class AppleMusicPlaylistTests(TestCase):
    @patch('projekt_muzyka.apple_music.requests.get')
    def test_extract_track_ids_from_playlist_url(self, mock_get):
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <head>
                <script type="application/ld+json">
                {
                    "@context": "http://schema.org",
                    "@type": "MusicPlaylist",
                    "name": "Rap Life",
                    "track": [
                        {"@type": "MusicRecording", "url": "https://music.apple.com/pl/song/song-one/1111111"},
                        {"@type": "MusicRecording", "url": "https://music.apple.com/pl/song/song-two/2222222"}
                    ]
                }
                </script>
            </head>
        </html>
        """
        from projekt_muzyka.apple_music import extract_track_ids_from_playlist_url
        ids = extract_track_ids_from_playlist_url("https://music.apple.com/pl/playlist/rap-life/pl.123")
        self.assertEqual(ids, ["1111111", "2222222"])

    @patch('projekt_muzyka.apple_music.requests.get')
    def test_fetch_multiple_apple_music_metadata(self, mock_get):
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "results": [
                {
                    "trackId": 1111111,
                    "trackName": "Song One",
                    "artistName": "Artist One",
                    "previewUrl": "http://audio.com/1.mp3",
                    "releaseDate": "2020-01-01T08:00:00Z",
                    "primaryGenreName": "Rap"
                },
                {
                    "trackId": 2222222,
                    "trackName": "Song Two",
                    "artistName": "Artist Two",
                    "previewUrl": "http://audio.com/2.mp3",
                    "releaseDate": "2021-01-01T08:00:00Z",
                    "primaryGenreName": "Pop"
                }
            ]
        }
        from projekt_muzyka.apple_music import fetch_multiple_apple_music_metadata
        meta = fetch_multiple_apple_music_metadata(["1111111", "2222222"])
        self.assertIn("1111111", meta)
        self.assertIn("2222222", meta)
        self.assertEqual(meta["1111111"]["title"], "Song One")
        self.assertEqual(meta["2222222"]["artist"], "Artist Two")
        self.assertEqual(meta["2222222"]["release_year"], 2021)

    @patch('projekt_muzyka.apple_music.fetch_playlist_cover_image')
    @patch('projekt_muzyka.apple_music.extract_playlist_name_and_desc')
    @patch('projekt_muzyka.apple_music.fetch_multiple_apple_music_metadata')
    @patch('projekt_muzyka.apple_music.extract_track_ids_from_playlist_url')
    def test_admin_playlist_import_view(self, mock_extract, mock_metadata, mock_name_desc, mock_cover):
        mock_extract.return_value = ["1111111", "2222222"]
        mock_metadata.return_value = {
            "1111111": {
                "title": "Song One",
                "artist": "Artist One",
                "preview_url": "http://audio.com/1.mp3",
                "release_year": 2020,
                "genre": "Rap"
            },
            "2222222": {
                "title": "Song Two",
                "artist": "Artist Two",
                "preview_url": "http://audio.com/2.mp3",
                "release_year": 2021,
                "genre": "Pop"
            }
        }
        mock_name_desc.return_value = ("Rap Life", "The best rap playlist")
        mock_cover.return_value = None

        admin_user = User.objects.create_superuser(username="admin", password="adminpassword", email="admin@test.com")
        self.client.login(username="admin", password="adminpassword")

        url = "/admin/projekt_muzyka/quiz/import-apple-playlist/"
        response = self.client.post(url, {
            "playlist_url": "https://music.apple.com/pl/playlist/rap-life/pl.123",
            "title": "Custom Rap Quiz",
            "description": "Custom description",
            "difficulty": "HARD",
            "num_questions_to_ask": 5
        })

        self.assertEqual(response.status_code, 302)
        
        from projekt_muzyka.models import Quiz, Song, Question
        quiz = Quiz.objects.get(title="Custom Rap Quiz")
        self.assertEqual(quiz.description, "Custom description")
        self.assertEqual(quiz.difficulty, "HARD")
        self.assertEqual(quiz.num_questions_to_ask, 5)

        self.assertEqual(Song.objects.filter(title="Song One").exists(), True)
        self.assertEqual(Question.objects.filter(quiz=quiz).count(), 2)

        q1 = Question.objects.get(quiz=quiz, song__title="Song One")
        self.assertEqual(q1.answers.filter(is_correct=True).count(), 2)
        self.assertEqual(q1.answers.filter(is_correct=False).count(), 3)


