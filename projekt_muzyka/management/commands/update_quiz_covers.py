import os
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from projekt_muzyka.apple_music import fetch_playlist_cover_image
from projekt_muzyka.models import Quiz


class Command(BaseCommand):
    help = "Jednorazowo pobiera ponownie i aktualizuje okładki quizów z playlist Apple Music, aby pozbyć się białych ramek."

    def handle(self, *args, **options):
        # Definiujemy ścieżkę do pliku flagi w katalogu mediów
        flag_path = os.path.join(settings.MEDIA_ROOT, ".covers_updated_flag")

        if os.path.exists(flag_path):
            self.stdout.write("Okładki zostały już zaktualizowane w przeszłości. Pomijanie.")
            return

        quizzes = Quiz.objects.filter(imported_from_playlist_url__isnull=False).exclude(imported_from_playlist_url="")

        if not quizzes.exists():
            self.stdout.write("Brak quizów z przypisanym linkiem do playlisty. Tworzenie flagi ukończenia.")
            self._create_flag(flag_path)
            return

        self.stdout.write(f"Rozpoczynanie jednorazowej aktualizacji okładek dla {quizzes.count()} quizów...")

        updated = 0
        failed = 0

        for quiz in quizzes:
            self.stdout.write(f"Pobieranie nowej okładki dla quizu: „{quiz.title}”...")
            try:
                cover_data = fetch_playlist_cover_image(quiz.imported_from_playlist_url)
                if cover_data:
                    # Usuwamy stare zdjęcie z dysku, jeśli istnieje
                    if quiz.cover_image:
                        try:
                            old_path = quiz.cover_image.path
                            if os.path.exists(old_path):
                                os.remove(old_path)
                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f"  Nie udało się usunąć starego pliku okładki: {e}"))

                    # Zapisujemy nową okładkę bez ramek
                    quiz.cover_image.save("cover.jpg", ContentFile(cover_data), save=True)
                    self.stdout.write(self.style.SUCCESS(f"  Pomyślnie zaktualizowano okładkę dla: „{quiz.title}”"))
                    updated += 1
                else:
                    self.stderr.write(self.style.WARNING(f"  Nie udało się pobrać okładki z URL: {quiz.imported_from_playlist_url}"))
                    failed += 1
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"  Błąd podczas aktualizacji: {e}"))
                failed += 1

        self._create_flag(flag_path)
        self.stdout.write(self.style.SUCCESS(f"\nAktualizacja zakończona: zaktualizowano {updated}, niepowodzeń {failed}."))

    def _create_flag(self, flag_path):
        try:
            # Tworzymy katalog mediów, jeśli nie istnieje
            os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
            with open(flag_path, "w") as f:
                f.write("done")
            self.stdout.write(self.style.SUCCESS("Utworzono flagę ukończenia aktualizacji okładek."))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Nie udało się utworzyć flagi {flag_path}: {e}"))
