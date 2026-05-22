from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from projekt_muzyka.models import UserProfile, Genre, Song, Quiz, Answer, Question, GameSession

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


class DjangoAdminBackupTests(TestCase):
    def setUp(self):
        # Create a superuser to access the admin site
        self.admin_user = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='adminpassword123'
        )
        self.client.login(username='admin_test', password='adminpassword123')
        
        # Create some initial seed data
        self.genre = Genre.objects.create(name="Pop", slug="pop")
        self.song = Song.objects.create(
            title="Song A",
            artist="Artist A",
            genre=self.genre,
            release_year=2021
        )
        self.quiz = Quiz.objects.create(
            title="Pop Quiz",
            genre=self.genre,
            difficulty="EASY"
        )
        
    def test_backup_export_view(self):
        url = reverse('admin:backup_export')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertTrue(response['Content-Disposition'].startswith('attachment; filename='))
        
        # Verify JSON content contains our data
        data = response.json()
        self.assertGreater(len(data), 0)
        
        # Check if the genre, song, and quiz names are in the exported data
        model_names = [item['model'] for item in data]
        self.assertIn('projekt_muzyka.genre', model_names)
        self.assertIn('projekt_muzyka.song', model_names)
        self.assertIn('projekt_muzyka.quiz', model_names)

    def test_backup_import_view_no_file(self):
        url = reverse('admin:backup_import')
        response = self.client.post(url)
        self.assertEqual(response.status_code, 302) # Redirects back

    def test_backup_import_view_success(self):
        # First, export the data
        export_url = reverse('admin:backup_export')
        export_response = self.client.get(export_url)
        exported_data = export_response.content
        
        # Modify the local database (delete items)
        Quiz.objects.all().delete()
        Song.objects.all().delete()
        Genre.objects.all().delete()
        
        self.assertEqual(Quiz.objects.count(), 0)
        self.assertEqual(Song.objects.count(), 0)
        self.assertEqual(Genre.objects.count(), 0)
        
        # Now import the exported data back
        import io
        import_url = reverse('admin:backup_import')
        
        # We simulate a file upload using io.BytesIO
        import_file = io.BytesIO(exported_data)
        import_file.name = 'db_backup.json'
        
        response = self.client.post(import_url, {
            'backup_file': import_file,
            'clear_existing': 'yes'
        })
        self.assertEqual(response.status_code, 302)
        
        # Verify that the objects have been restored
        self.assertEqual(Genre.objects.filter(name="Pop").exists(), True)
        self.assertEqual(Song.objects.filter(title="Song A").exists(), True)
        self.assertEqual(Quiz.objects.filter(title="Pop Quiz").exists(), True)


class GameSessionAttemptTests(APITestCase):
    def setUp(self):
        self.genre = Genre.objects.create(name="Rock", slug="rock")
        self.song = Song.objects.create(title="Track 1", artist="Artist 1", genre=self.genre)
        self.quiz = Quiz.objects.create(title="Rock Quiz", genre=self.genre)
        self.question = Question.objects.create(quiz=self.quiz, song=self.song)
        self.session = GameSession.objects.create(quiz=self.quiz)

    def test_submit_empty_answer_text(self):
        url = reverse('session-attempts', kwargs={'session_id': self.session.id})
        data = {
            "question_id": self.question.id,
            "answer_text": "",
            "time_taken_seconds": 5
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["is_correct"], False)

    def test_submit_no_answer_text_or_id(self):
        url = reverse('session-attempts', kwargs={'session_id': self.session.id})
        data = {
            "question_id": self.question.id,
            "time_taken_seconds": 5
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_fuzzy_match_case_insensitive(self):
        url = reverse('session-attempts', kwargs={'session_id': self.session.id})
        data = {
            "question_id": self.question.id,
            "answer_text": "track 1",
            "time_taken_seconds": 5
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["is_correct"], True)

    def test_submit_fuzzy_match_polish_diacritics(self):
        song = Song.objects.create(title="Słodkiego, miłego życia", artist="Kombi", genre=self.genre)
        question = Question.objects.create(quiz=self.quiz, song=song)
        url = reverse('session-attempts', kwargs={'session_id': self.session.id})
        
        data = {
            "question_id": question.id,
            "answer_text": "slodkiego milego zycia",
            "time_taken_seconds": 5
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["is_correct"], True)

    def test_submit_fuzzy_match_suffix_removal(self):
        song = Song.objects.create(title="Title (feat. Artist)", artist="Somebody", genre=self.genre)
        question = Question.objects.create(quiz=self.quiz, song=song)
        url = reverse('session-attempts', kwargs={'session_id': self.session.id})
        
        data = {
            "question_id": question.id,
            "answer_text": "Title",
            "time_taken_seconds": 5
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["is_correct"], True)

    def test_submit_fuzzy_match_punctuation_spaces(self):
        url = reverse('session-attempts', kwargs={'session_id': self.session.id})
        data = {
            "question_id": self.question.id,
            "answer_text": "  track   1! ",
            "time_taken_seconds": 5
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["is_correct"], True)

    def test_submit_fuzzy_match_minor_typos(self):
        song = Song.objects.create(title="Chcemy być sobą", artist="Perfect", genre=self.genre)
        question = Question.objects.create(quiz=self.quiz, song=song)
        url = reverse('session-attempts', kwargs={'session_id': self.session.id})
        
        data = {
            "question_id": question.id,
            "answer_text": "chcemy byc sobo",
            "time_taken_seconds": 5
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["is_correct"], True)


class RandomQuizTests(APITestCase):
    def setUp(self):
        self.genre_rock = Genre.objects.create(name="Rock", slug="rock")
        self.genre_pop = Genre.objects.create(name="Pop", slug="pop")

        # Create rock songs
        for i in range(5):
            Song.objects.create(title=f"Rock Song {i}", artist=f"Rock Artist {i}", genre=self.genre_rock)

        # Create pop songs
        for i in range(5):
            Song.objects.create(title=f"Pop Song {i}", artist=f"Pop Artist {i}", genre=self.genre_pop)

    def test_create_random_quiz_endpoint(self):
        # 1. POST to create-random with 3 questions, no genre
        url = reverse('create-random-quiz')
        data = {
            "difficulty": "EASY",
            "num_questions": 3
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Losowy Quiz")
        self.assertEqual(response.data["difficulty"], "EASY")
        self.assertEqual(response.data["num_questions_to_ask"], 3)
        self.assertEqual(len(response.data["questions"]), 3)

        quiz_id_1 = response.data["id"]

        # Verify database has the quiz with is_random=True
        quiz = Quiz.objects.get(id=quiz_id_1)
        self.assertTrue(quiz.is_random)

        # 2. Call again with 5 questions and Pop genre to check reuse of the quiz record
        data_pop = {
            "difficulty": "HARD",
            "num_questions": 5,
            "genre_id": self.genre_pop.id
        }
        response_pop = self.client.post(url, data_pop, format="json")
        self.assertEqual(response_pop.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_pop.data["id"], quiz_id_1) # Reused!
        self.assertEqual(response_pop.data["difficulty"], "HARD")
        self.assertEqual(response_pop.data["num_questions_to_ask"], 5)
        self.assertEqual(len(response_pop.data["questions"]), 5)

        # Verify all questions in response_pop are Pop genre songs
        for q in response_pop.data["questions"]:
            song_data = q["song"]
            self.assertEqual(song_data["genre"]["id"], self.genre_pop.id)

    def test_create_random_quiz_endpoint_multiple_genres(self):
        url = reverse('create-random-quiz')
        data = {
            "difficulty": "MEDIUM",
            "num_questions": 6,
            "genre_ids": [self.genre_rock.id, self.genre_pop.id]
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["difficulty"], "MEDIUM")
        self.assertEqual(response.data["num_questions_to_ask"], 6)
        self.assertEqual(len(response.data["questions"]), 6)

        # Verify all questions belong to either Rock or Pop genre
        allowed_ids = {self.genre_rock.id, self.genre_pop.id}
        for q in response.data["questions"]:
            song_data = q["song"]
            self.assertIn(song_data["genre"]["id"], allowed_ids)

    def test_random_quiz_points_calculation_difficulty_based(self):
        # Create a single song/question/quiz/session structure for EASY
        quiz = Quiz.objects.create(title="Losowy Quiz", is_random=True)
        song = Song.objects.get(title="Rock Song 0")
        question = Question.objects.create(quiz=quiz, song=song)
        # Note: GameSession attempt POST creates an attempt
        # Let's create game session with EASY difficulty
        session = GameSession.objects.create(quiz=quiz, chosen_difficulty="EASY")

        # Submit attempt: time_taken = 16 seconds.
        # If difficulty EASY (time_limit = 30):
        # grace_period = 2.0. ratio = (16 - 2) / (30 - 2) = 14 / 28 = 0.5.
        # delta = (3000 - 100) * 0.5 = 1450.
        # score = 3000 - 1450 = 1550.
        #
        # If difficulty default/medium (time_limit = 15):
        # time_taken = 16 is clamped to 15. ratio = (15 - 2) / (15 - 2) = 1.0.
        # score = 100.
        
        url = reverse('session-attempts', kwargs={'session_id': session.id})
        data = {
            "question_id": question.id,
            "answer_text": "Rock Song 0",
            "time_taken_seconds": 16
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["is_correct"], True)
        self.assertEqual(response.data["points_awarded"], 1550) # EASY (30s limit) calculation


class GenreClassificationTests(APITestCase):
    def test_get_main_category_name(self):
        from projekt_muzyka.utils import get_main_category_name
        self.assertEqual(get_main_category_name("Pop Punk"), "Rock")
        self.assertEqual(get_main_category_name("Latin Pop"), "Latino")
        self.assertEqual(get_main_category_name("reggaeton"), "Latino")
        self.assertEqual(get_main_category_name("Hip-Hop/Rap"), "Rap & Hip-Hop")
        self.assertEqual(get_main_category_name("Deep House"), "Electronic")
        self.assertEqual(get_main_category_name("Worldwide"), "Inne")

    def test_auto_classify_song_signal(self):
        genre = Genre.objects.create(name="Dance-Pop", slug="dance-pop")
        song = Song.objects.create(title="Test Song", artist="Test Artist", genre=genre)
        # Check signal populated apple_raw_genre and category
        self.assertEqual(song.apple_raw_genre, "Dance-Pop")
        self.assertIsNotNone(song.category)
        self.assertEqual(song.category.name, "Pop")
        self.assertTrue(song.category.is_category)

    def test_update_quiz_genre_dynamic(self):
        genre_rock_raw = Genre.objects.create(name="Grunge", slug="grunge")
        genre_pop_raw = Genre.objects.create(name="Dance-Pop", slug="dance-pop")
        
        song1 = Song.objects.create(title="Rock 1", artist="Artist 1", genre=genre_rock_raw) # Category Rock
        song2 = Song.objects.create(title="Rock 2", artist="Artist 2", genre=genre_rock_raw) # Category Rock
        song3 = Song.objects.create(title="Pop 1", artist="Artist 3", genre=genre_pop_raw)   # Category Pop
        
        quiz = Quiz.objects.create(title="Classification Test Quiz")
        
        # Add a Pop song question
        q1 = Question.objects.create(quiz=quiz, song=song3)
        quiz.refresh_from_db()
        self.assertEqual(quiz.genre.name, "Pop")
        
        # Add Rock song questions to make Rock the dominant category
        q2 = Question.objects.create(quiz=quiz, song=song1)
        quiz.refresh_from_db()
        self.assertEqual(quiz.genre.name, "Pop") # 1 Pop vs 1 Rock -> Tie picked Pop (alphabetic count order or first)
        
        q3 = Question.objects.create(quiz=quiz, song=song2)
        quiz.refresh_from_db()
        self.assertEqual(quiz.genre.name, "Rock") # 1 Pop vs 2 Rock -> Rock
        
        # Delete a Rock question
        q3.delete()
        quiz.refresh_from_db()
        # 1 Pop vs 1 Rock -> Pop (alphabetical order 'Pop' < 'Rock' wins on tie)
        self.assertEqual(quiz.genre.name, "Pop")

    def test_classify_music_management_command(self):
        from django.core.management import call_command
        genre_rock_raw = Genre.objects.create(name="Grunge", slug="grunge")
        song1 = Song.objects.create(title="Rock 1", artist="Artist 1", genre=genre_rock_raw)
        
        # Clear category to simulate unclassified state
        Song.objects.filter(id=song1.id).update(category=None)
        song1.refresh_from_db()
        self.assertIsNone(song1.category)
        
        # Run command
        call_command('classify_music')
        
        song1.refresh_from_db()
        self.assertIsNotNone(song1.category)
        self.assertEqual(song1.category.name, "Rock")





