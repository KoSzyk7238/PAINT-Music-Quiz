from django.core.management.base import BaseCommand
from django.db import transaction
from projekt_muzyka.models import Song, Quiz
from projekt_muzyka.utils import update_quiz_genre

class Command(BaseCommand):
    help = "Retroactively classifies all existing songs and updates all quiz genres based on dominant song categories."

    def handle(self, *args, **options):
        self.stdout.write("Starting retroactive music and quiz classification...")

        # 1. Classify all songs
        songs = Song.objects.all()
        total_songs = songs.count()
        self.stdout.write(f"Classifying {total_songs} songs...")
        
        classified_songs_count = 0
        with transaction.atomic():
            for song in songs:
                # Force fallback and re-categorization to apply the latest mapping rules (including Latino)
                if not song.apple_raw_genre and song.genre:
                    song.apple_raw_genre = song.genre.name
                
                # Reset category to force the pre_save signal to recalculate it
                song.category = None
                song.save()
                classified_songs_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully classified {classified_songs_count} songs."))

        # 2. Classify all quizzes (playlists)
        quizzes = Quiz.objects.all()
        total_quizzes = quizzes.count()
        self.stdout.write(f"Updating genres for {total_quizzes} quizzes...")
        
        updated_quizzes_count = 0
        with transaction.atomic():
            for quiz in quizzes:
                update_quiz_genre(quiz)
                updated_quizzes_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully updated genres for {updated_quizzes_count} quizzes."))
        self.stdout.write(self.style.SUCCESS("Retroactive classification finished successfully."))
