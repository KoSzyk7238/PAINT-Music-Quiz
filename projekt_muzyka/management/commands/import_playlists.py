from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from projekt_muzyka.playlist_import import (
    DEFAULT_PLAYLISTS_FILE,
    import_quiz_from_playlist,
    parse_playlists_file,
)


class Command(BaseCommand):
    help = "Importuje quizy z pliku playlist (tytuł + URL Apple Music na linię)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            default=str(DEFAULT_PLAYLISTS_FILE),
            help=f"Ścieżka do pliku playlist (domyślnie: {DEFAULT_PLAYLISTS_FILE})",
        )
        parser.add_argument(
            "--skip-existing",
            action="store_true",
            default=True,
            help="Pomiń quizy, które już istnieją (domyślnie: włączone).",
        )
        parser.add_argument(
            "--no-skip-existing",
            action="store_false",
            dest="skip_existing",
            help="Importuj ponownie nawet gdy quiz o tym tytule już istnieje (dodaje brakujące utwory).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maksymalna liczba playlist do przetworzenia (do testów).",
        )

    def handle(self, *args, **options):
        file_path = Path(options["file"])
        if not file_path.is_file():
            raise CommandError(f"Nie znaleziono pliku: {file_path}")

        try:
            entries = parse_playlists_file(file_path)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        if options["limit"]:
            entries = entries[: options["limit"]]

        self.stdout.write(f"Znaleziono {len(entries)} playlist w {file_path}")

        created = 0
        skipped = 0
        failed = 0

        for title, url in entries:
            self.stdout.write(f"→ {title}")

            result = import_quiz_from_playlist(
                url,
                title=title,
                skip_if_exists=options["skip_existing"],
            )

            if result.skipped_existing_quiz:
                self.stdout.write(self.style.WARNING(f"  pominięto (już istnieje: {title})"))
                skipped += 1
                continue

            if not result.success:
                self.stderr.write(self.style.ERROR(f"  błąd: {result.error}"))
                failed += 1
                continue

            self.stdout.write(
                self.style.SUCCESS(
                    f"  OK: „{result.quiz.title}” — {result.songs_added} utworów"
                    + (
                        f" ({result.songs_skipped} pominiętych duplikatów)"
                        if result.songs_skipped
                        else ""
                    )
                )
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nGotowe: {created} zaimportowanych, {skipped} pominiętych, {failed} błędów."
            )
        )
