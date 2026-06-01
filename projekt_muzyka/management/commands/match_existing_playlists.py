import os
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from projekt_muzyka.models import Quiz
from projekt_muzyka.playlist_import import parse_playlists_file


class Command(BaseCommand):
    help = "Dopasowuje wstecznie linki z pliku Baza-playlist.txt do quizów istniejących już w bazie danych."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            default=None,
            help="Ścieżka do pliku playlist (domyślnie wyszukuje Baza-playlist.txt w katalogu głównym)",
        )

    def handle(self, *args, **options):
        # 1. Ustalenie ścieżki do pliku
        file_path = options["file"]
        if not file_path:
            # Domyślnie szukamy Baza-playlist.txt w katalogu /app
            file_path = os.path.join(settings.BASE_DIR, "Baza-playlist.txt")
            if not os.path.isfile(file_path):
                # Fallback do playlists.txt w seed_data
                file_path = os.path.join(
                    settings.BASE_DIR, "projekt_muzyka", "seed_data", "playlists.txt"
                )

        if not os.path.isfile(file_path):
            self.stderr.write(self.style.ERROR(f"Nie znaleziono pliku playlist w ścieżce: {file_path}"))
            return

        self.stdout.write(f"Wczytywanie playlist z pliku: {file_path}")

        try:
            entries = parse_playlists_file(file_path)
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Błąd parsowania pliku: {exc}"))
            return

        self.stdout.write(f"Znaleziono {len(entries)} wpisów w pliku playlist.")

        # Pobieramy quizy bez przypisanego URL
        quizzes = Quiz.objects.filter(imported_from_playlist_url__isnull=True) | Quiz.objects.filter(imported_from_playlist_url="")
        quizzes = quizzes.distinct()

        if not quizzes.exists():
            self.stdout.write(self.style.SUCCESS("Wszystkie quizy w bazie mają już przypisane linki do playlist. Brak pracy do wykonania."))
            return

        self.stdout.write(f"Znaleziono {quizzes.count()} quizów w bazie oczekujących na dopasowanie linku.")

        matched_count = 0

        # Helper do normalizacji nazw w celu dopasowania
        def normalize(text):
            if not text:
                return ""
            # Usuwamy myślniki, spacje, znaki specjalne dla dokładniejszego dopasowania podciągów
            return slugify(text).replace("-", "")

        for quiz in quizzes:
            quiz_norm = normalize(quiz.title)
            if not quiz_norm:
                continue

            best_match_url = None
            best_match_name = None

            for playlist_name, playlist_url in entries:
                playlist_norm = normalize(playlist_name)
                if not playlist_norm:
                    continue

                # Warunek dopasowania: nazwa playlisty jest podciągiem nazwy quizu w bazie, lub odwrotnie
                if playlist_norm in quiz_norm or quiz_norm in playlist_norm:
                    best_match_url = playlist_url
                    best_match_name = playlist_name
                    break

            if best_match_url:
                quiz.imported_from_playlist_url = best_match_url
                quiz.save(update_fields=["imported_from_playlist_url"])
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Dopasowano: „{quiz.title}” ↔ „{best_match_name}” | Link: {best_match_url}"
                    )
                )
                matched_count += 1
            else:
                self.stdout.write(self.style.WARNING(f"  Brak dopasowania dla quizu: „{quiz.title}”"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nZakończono dopasowywanie: pomyślnie przypisano {matched_count} linków."
            )
        )
