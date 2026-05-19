import random
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from django.core.files.base import ContentFile

from projekt_muzyka.models import Quiz, Question, Answer, Genre, Song
from projekt_muzyka.apple_music import (
    extract_track_ids_from_playlist_url,
    fetch_multiple_apple_music_metadata,
    extract_playlist_name_and_desc,
    fetch_playlist_cover_image,
)

SEED_USERNAME = "admin"
SEED_EMAIL = "admin@admin.admin"
SEED_PASSWORD = "admin"


class Command(BaseCommand):
    help = "Seed default admin user and initial quizzes from Apple Music playlists."

    def handle(self, *args, **options):
        self.stdout.write("Starting initial data seed...")

        with transaction.atomic():
            self._seed_admin()
            self._seed_quizzes()

        self.stdout.write(self.style.SUCCESS("Seed completed."))

    def _seed_admin(self):
        if User.objects.filter(username=SEED_USERNAME).exists():
            self.stdout.write("Admin user already exists. Skipping.")
            return

        User.objects.create_superuser(
            username=SEED_USERNAME,
            email=SEED_EMAIL,
            password=SEED_PASSWORD,
        )
        self.stdout.write(self.style.SUCCESS("Admin user created."))

    def _seed_quizzes(self):
        playlists = [
            "https://music.apple.com/pl/playlist/quebonafide-niezb%C4%99dnik/pl.3727258ae85b474f984343ca48ef8d4b?l=pl",
            "https://music.apple.com/pl/playlist/taco-hemingway-niezb%C4%99dnik/pl.e36fd21cf1244c099b662b3d6093d05b?l=pl",
            "https://music.apple.com/pl/playlist/rap-life/pl.abe8ba42278f4ef490e3a9fc5ec8e8c5?l=pl"
        ]

        for playlist_url in playlists:
            self.stdout.write(f"Processing playlist: {playlist_url}")
            
            # Fetch playlist name and description
            playlist_name, playlist_desc = extract_playlist_name_and_desc(playlist_url)
            if not playlist_name:
                self.stderr.write(f"Could not retrieve details for playlist: {playlist_url}")
                continue

            # Clean control characters from name and description
            playlist_name = playlist_name.replace('\u200e', '').replace('\u200f', '').strip()
            playlist_desc = playlist_desc.replace('\u200e', '').replace('\u200f', '').strip()

            # Check if quiz already exists
            if Quiz.objects.filter(title=playlist_name).exists():
                self.stdout.write(f"Quiz '{playlist_name}' already exists. Skipping.")
                continue

            # Extract track IDs
            track_ids = extract_track_ids_from_playlist_url(playlist_url)
            if not track_ids:
                self.stderr.write(f"No track IDs found for playlist {playlist_url}")
                continue

            self.stdout.write(f"Fetching metadata for {len(track_ids)} tracks...")
            metadata_dict = fetch_multiple_apple_music_metadata(track_ids)
            if not metadata_dict:
                self.stderr.write("Failed to fetch tracks metadata from iTunes API.")
                continue

            # Fetch cover image
            cover_data = fetch_playlist_cover_image(playlist_url)

            # Create the Quiz
            quiz = Quiz.objects.create(
                title=playlist_name,
                description=playlist_desc,
                difficulty="MEDIUM",
                num_questions_to_ask=10,
                time_limit=15,
            )

            if cover_data:
                quiz.cover_image.save("cover.jpg", ContentFile(cover_data), save=True)

            first_genre = None
            songs_count = 0

            for tid in track_ids:
                metadata = metadata_dict.get(tid)
                if not metadata or not metadata.get("title") or not metadata.get("preview_url"):
                    continue

                genre_name = metadata.get("genre") or "Miks"
                genre_name = genre_name.strip()
                genre_slug = slugify(genre_name)

                # Safe get_or_create to avoid unique constraint collisions
                genre = (
                    Genre.objects.filter(slug=genre_slug).first() or 
                    Genre.objects.filter(name__iexact=genre_name).first()
                )
                if not genre:
                    try:
                        genre = Genre.objects.create(name=genre_name, slug=genre_slug)
                    except Exception:
                        genre = (
                            Genre.objects.filter(slug=genre_slug).first() or 
                            Genre.objects.filter(name__iexact=genre_name).first()
                        )
                        if not genre:
                            suffix = random.randint(1, 1000)
                            genre = Genre.objects.create(
                                name=f"{genre_name} {suffix}", 
                                slug=f"{genre_slug}-{suffix}"
                            )

                if not first_genre:
                    first_genre = genre

                song_title = metadata.get("title")
                artist = metadata.get("artist") or ""
                release_year = metadata.get("release_year")
                preview_url = metadata.get("preview_url")

                song, created = Song.objects.get_or_create(
                    title=song_title,
                    artist=artist,
                    defaults={
                        "genre": genre,
                        "release_year": release_year,
                        "apple_snippet_url": preview_url,
                    }
                )

                question = Question.objects.create(
                    quiz=quiz,
                    song=song,
                    question_text="Zgadnij tytuł tej piosenki",
                    time_limit=None,
                    points=1,
                    min_points=0,
                )

                Answer.objects.create(
                    question=question,
                    answer_text=song.title,
                    is_correct=True,
                )
                if song.artist:
                    Answer.objects.create(
                        question=question,
                        answer_text=f"{song.title} - {song.artist}",
                        is_correct=True,
                    )

                # Create distractor choices (incorrect answers)
                distractors = []
                other_tracks = [m for k, m in metadata_dict.items() if k != tid and m.get("title")]
                if len(other_tracks) >= 3:
                    picked_tracks = random.sample(other_tracks, 3)
                    for pt in picked_tracks:
                        text = f"{pt.get('title')} - {pt.get('artist')}" if pt.get('artist') else pt.get('title')
                        distractors.append(text)

                if len(distractors) < 3:
                    db_songs = list(Song.objects.exclude(id=song.id)[:10])
                    if len(db_songs) >= 3:
                        picked_db = random.sample(db_songs, min(3 - len(distractors), len(db_songs)))
                        for ds in picked_db:
                            text = f"{ds.title} - {ds.artist}" if ds.artist else ds.title
                            distractors.append(text)

                while len(distractors) < 3:
                    distractors.append(f"Inny utwór {len(distractors) + 1}")

                for dist in distractors[:3]:
                    Answer.objects.create(
                        question=question,
                        answer_text=dist,
                        is_correct=False,
                    )

                songs_count += 1

            if first_genre:
                quiz.genre = first_genre
                quiz.save(update_fields=["genre"])

            self.stdout.write(self.style.SUCCESS(f"Quiz '{quiz.title}' created with {songs_count} songs."))
