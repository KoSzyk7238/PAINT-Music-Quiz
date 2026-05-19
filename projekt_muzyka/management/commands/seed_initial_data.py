import json
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from projekt_muzyka.models import Genre, Song


SEED_USERNAME = "admin"
SEED_EMAIL = "admin@admin.admin"
SEED_PASSWORD = "admin"


class Command(BaseCommand):
    help = "Seed default admin user and sample songs."

    def handle(self, *args, **options):
        self.stdout.write("Starting initial data seed...")

        with transaction.atomic():
            self._seed_admin()
            self._seed_songs()

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

    def _seed_songs(self):
        seed_path = Path(__file__).resolve().parents[2] / "seed_data" / "seed_songs.json"
        if not seed_path.exists():
            self.stderr.write(f"Seed file not found: {seed_path}")
            return

        with seed_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)

        genres_data = data.get("genres", [])
        songs_data = data.get("songs", [])

        created_genres = 0
        skipped_genres = 0
        created_songs = 0
        skipped_songs = 0
        updated_songs = 0

        genres_by_slug = {}
        for item in genres_data:
            name = (item or {}).get("name")
            slug = (item or {}).get("slug") or (slugify(name) if name else None)
            if not name or not slug:
                skipped_genres += 1
                continue

            genre, created = Genre.objects.get_or_create(slug=slug, defaults={"name": name})
            if created:
                created_genres += 1
            else:
                if genre.name != name:
                    genre.name = name
                    genre.save(update_fields=["name"])
                skipped_genres += 1
            genres_by_slug[slug] = genre

        for item in songs_data:
            payload = item or {}
            title = payload.get("title")
            if not title:
                skipped_songs += 1
                continue

            artist = payload.get("artist") or None
            release_year = payload.get("release_year")
            duration_seconds = payload.get("duration_seconds") or 30
            apple_snippet_url = payload.get("apple_snippet_url") or None
            genre_slug = payload.get("genre")
            genre = genres_by_slug.get(genre_slug) if genre_slug else None

            song, created = Song.objects.get_or_create(
                title=title,
                artist=artist,
                release_year=release_year,
                defaults={
                    "genre": genre,
                    "apple_snippet_url": apple_snippet_url,
                    "duration_seconds": duration_seconds,
                },
            )

            if created:
                created_songs += 1
                continue

            updated = False
            if genre and song.genre is None:
                song.genre = genre
                updated = True
            if apple_snippet_url and not song.apple_snippet_url:
                song.apple_snippet_url = apple_snippet_url
                updated = True
            if duration_seconds and song.duration_seconds != duration_seconds:
                song.duration_seconds = duration_seconds
                updated = True

            if updated:
                song.save(update_fields=["genre", "apple_snippet_url", "duration_seconds"])
                updated_songs += 1
            else:
                skipped_songs += 1

        self.stdout.write(
            "Genres: created {0}, skipped {1}.".format(created_genres, skipped_genres)
        )
        self.stdout.write(
            "Songs: created {0}, updated {1}, skipped {2}.".format(
                created_songs, updated_songs, skipped_songs
            )
        )
