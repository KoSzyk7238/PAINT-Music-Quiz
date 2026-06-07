"""Import quizów z playlist Apple Music — wspólna logika dla admina i komend Django."""
import random
import re
from dataclasses import dataclass
from pathlib import Path

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils.text import slugify

from projekt_muzyka.apple_music import (
    extract_playlist_name_and_desc,
    extract_track_ids_from_playlist_url,
    fetch_multiple_apple_music_metadata,
    fetch_playlist_cover_image,
)
from projekt_muzyka.models import Answer, Genre, Question, Quiz, Song

DEFAULT_PLAYLISTS_FILE = Path(__file__).resolve().parent / "seed_data" / "playlists.txt"


@dataclass
class ImportResult:
    success: bool
    quiz: Quiz | None = None
    songs_added: int = 0
    songs_skipped: int = 0
    skipped_existing_quiz: bool = False
    error: str | None = None


def _clean_apple_text(text: str) -> str:
    return text.replace("\u200e", "").replace("\u200f", "").strip()


def parse_playlists_file(file_path: str | Path) -> list[tuple[str, str]]:
    """Parsuje plik: `Tytuł quizu<TAB>https://music.apple.com/...` (lub spacje zamiast TAB)."""
    path = Path(file_path)
    entries: list[tuple[str, str]] = []

    with path.open(encoding="utf-8") as handle:
        for line_no, raw_line in enumerate(handle, 1):
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            if "\t" in line:
                title, url = (part.strip() for part in line.split("\t", 1))
            else:
                match = re.search(r"(https?://\S+)\s*$", line)
                if not match:
                    raise ValueError(
                        f"Linia {line_no}: oczekiwano tytułu i URL (format: Tytuł<TAB>URL)"
                    )
                url = match.group(1).strip()
                title = line[: match.start()].strip()

            if not title or not url.startswith("http"):
                raise ValueError(f"Linia {line_no}: nieprawidłowy tytuł lub URL")

            entries.append((title, url))

    return entries


def import_quiz_from_playlist(
    playlist_url: str,
    *,
    title: str | None = None,
    description: str | None = None,
    quiz_id: int | None = None,
    skip_if_exists: bool = False,
    difficulty: str = "MEDIUM",
    num_questions_to_ask: int = 10,
    time_limit: int = 15,
) -> ImportResult:
    """
    Tworzy nowy quiz lub dodaje utwory do istniejącego (gdy podano quiz_id).
    Gdy skip_if_exists=True i quiz o podanym tytule już istnieje — pomija import.
    """
    resolved_title = (title or "").strip()

    if skip_if_exists and not quiz_id and resolved_title:
        if Quiz.objects.filter(title=resolved_title).exists():
            return ImportResult(success=True, skipped_existing_quiz=True)

    track_ids = extract_track_ids_from_playlist_url(playlist_url)
    if not track_ids:
        return ImportResult(
            success=False,
            error="Nie znaleziono utworów na playliście (sprawdź, czy link jest publiczny).",
        )

    playlist_name, playlist_desc = extract_playlist_name_and_desc(playlist_url)
    if playlist_name:
        playlist_name = _clean_apple_text(playlist_name)
    if playlist_desc:
        playlist_desc = _clean_apple_text(playlist_desc)

    resolved_title = (title or playlist_name or "").strip()
    resolved_description = (description or playlist_desc or "").strip()

    if not resolved_title:
        return ImportResult(
            success=False,
            error="Nie udało się ustalić tytułu quizu (podaj tytuł lub sprawdź playlistę).",
        )

    if skip_if_exists and not quiz_id and Quiz.objects.filter(title=resolved_title).exists():
        return ImportResult(success=True, skipped_existing_quiz=True)

    if not quiz_id:
        existing_quiz = Quiz.objects.filter(title=resolved_title).first()
        if existing_quiz:
            quiz_id = existing_quiz.id

    metadata_dict = fetch_multiple_apple_music_metadata(track_ids)
    if not metadata_dict:
        return ImportResult(
            success=False,
            error="Nie udało się pobrać metadanych utworów z iTunes API.",
        )

    cover_data = fetch_playlist_cover_image(playlist_url)

    try:
        with transaction.atomic():
            existing_quiz = None
            if quiz_id:
                existing_quiz = Quiz.objects.filter(id=quiz_id).first()
                if not existing_quiz:
                    return ImportResult(success=False, error="Wybrany quiz nie istnieje.")

            if existing_quiz:
                quiz = existing_quiz
                if not quiz.imported_from_playlist_url:
                    quiz.imported_from_playlist_url = playlist_url
                    quiz.save(update_fields=["imported_from_playlist_url"])
                if not quiz.cover_image and cover_data:
                    quiz.cover_image.save("cover.jpg", ContentFile(cover_data), save=True)
            else:
                quiz = Quiz.objects.create(
                    title=resolved_title,
                    description=resolved_description,
                    difficulty=difficulty,
                    num_questions_to_ask=num_questions_to_ask,
                    time_limit=time_limit,
                    imported_from_playlist_url=playlist_url,
                )
                if cover_data:
                    quiz.cover_image.save("cover.jpg", ContentFile(cover_data), save=True)

            first_genre = None
            songs_added = 0
            songs_skipped = 0

            for tid in track_ids:
                metadata = metadata_dict.get(tid)
                if not metadata or not metadata.get("title") or not metadata.get("preview_url"):
                    continue

                genre_name = (metadata.get("genre") or "Miks").strip()
                genre_slug = slugify(genre_name)
                genre, _ = Genre.objects.get_or_create(
                    slug=genre_slug,
                    defaults={"name": genre_name},
                )

                if not first_genre:
                    first_genre = genre

                song, _ = Song.objects.get_or_create(
                    title=metadata.get("title"),
                    artist=metadata.get("artist") or "",
                    defaults={
                        "genre": genre,
                        "apple_raw_genre": genre_name,
                        "release_year": metadata.get("release_year"),
                        "apple_snippet_url": metadata.get("preview_url"),
                    },
                )

                if Question.objects.filter(quiz=quiz, song=song).exists():
                    songs_skipped += 1
                    continue

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

                distractors = []
                other_tracks = [
                    m for k, m in metadata_dict.items() if k != tid and m.get("title")
                ]
                if len(other_tracks) >= 3:
                    for pt in random.sample(other_tracks, 3):
                        text = (
                            f"{pt.get('title')} - {pt.get('artist')}"
                            if pt.get("artist")
                            else pt.get("title")
                        )
                        distractors.append(text)

                if len(distractors) < 3:
                    db_songs = list(Song.objects.exclude(id=song.id)[:10])
                    if len(db_songs) >= 3:
                        picked_db = random.sample(
                            db_songs, min(3 - len(distractors), len(db_songs))
                        )
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

                songs_added += 1

            if first_genre and (not existing_quiz or not quiz.genre):
                quiz.genre = first_genre
                quiz.save(update_fields=["genre"])

    except Exception as exc:
        return ImportResult(success=False, error=str(exc))

    return ImportResult(
        success=True,
        quiz=quiz,
        songs_added=songs_added,
        songs_skipped=songs_skipped,
    )
