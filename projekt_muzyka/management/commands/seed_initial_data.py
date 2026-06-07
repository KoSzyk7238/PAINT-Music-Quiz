import os
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from projekt_muzyka.models import Quiz
from projekt_muzyka.playlist_import import (
    DEFAULT_PLAYLISTS_FILE,
    import_quiz_from_playlist,
    parse_playlists_file,
)

SEED_USERNAME = "admin"
SEED_EMAIL = "admin@admin.admin"
SEED_PASSWORD = "admin"

FLAG_FILE = "/tmp/.seeded_flag"


class Command(BaseCommand):
    help = "Seed default admin user and quizzes from projekt_muzyka/seed_data/playlists.txt."

    def handle(self, *args, **options):
        if os.path.exists(FLAG_FILE):
            self.stdout.write("Database has already been seeded in this container lifetime. Skipping.")
            return

        self.stdout.write("Starting initial data seed...")
        self._seed_admin()

        if Quiz.objects.exists():
            self.stdout.write(
                "Database already contains quizzes — skipping playlist seed "
                "(runs only on first startup with empty database)."
            )
            self._create_flag_file()
            self.stdout.write(self.style.SUCCESS("Seed completed."))
            return

        self._seed_quizzes_from_file()
        self._create_flag_file()
        self.stdout.write(self.style.SUCCESS("Seed completed."))

    def _create_flag_file(self):
        try:
            with open(FLAG_FILE, "w") as f:
                f.write("seeded")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not create flag file {FLAG_FILE}: {e}"))


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

    def _seed_quizzes_from_file(self):
        if not DEFAULT_PLAYLISTS_FILE.is_file():
            self.stdout.write(
                self.style.WARNING(
                    f"No playlists file at {DEFAULT_PLAYLISTS_FILE}. Skipping quiz seed."
                )
            )
            return

        try:
            entries = parse_playlists_file(DEFAULT_PLAYLISTS_FILE)
        except ValueError as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            return

        self.stdout.write(f"Importing {len(entries)} playlists from seed file...")

        for title, url in entries:
            self.stdout.write(f"Processing: {title}")
            result = import_quiz_from_playlist(
                url,
                title=title,
                skip_if_exists=True,
            )

            if result.skipped_existing_quiz:
                self.stdout.write(f"  Quiz '{title}' already exists. Skipping.")
            elif not result.success:
                self.stderr.write(self.style.ERROR(f"  Failed: {result.error}"))
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Quiz '{result.quiz.title}' — {result.songs_added} songs."
                    )
                )
