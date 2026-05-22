from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Genre(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Nazwa")
    slug = models.SlugField(max_length=120, unique=True, verbose_name="Slug")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data utworzenia")

    def __str__(self):
        return self.name


class Song(models.Model):
    title = models.CharField(max_length=200, db_index=True, verbose_name="Tytul")
    artist = models.CharField(max_length=200, db_index=True, blank=True, null=True, verbose_name="Artysta")
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, blank=True, null=True, related_name="songs", verbose_name="Gatunek")
    apple_snippet_url = models.URLField(max_length=500, blank=True, null=True, verbose_name="Apple Music snippet")
    audio_file = models.FileField(upload_to="song_audio/", blank=True, null=True, verbose_name="Plik audio")
    release_year = models.IntegerField(blank=True, null=True, verbose_name="Rok wydania")
    duration_seconds = models.IntegerField(default=30, verbose_name="Dlugosc (sekundy)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data dodania")

    def __str__(self):
        if self.artist:
            return f"{self.artist} - {self.title}"
        return self.title

class Quiz(models.Model):
    DIFFICULTY_CHOICES = [
        ('EASY', 'Łatwy'),
        ('MEDIUM', 'Średni'),
        ('HARD', 'Trudny'),
    ]
    title = models.CharField(max_length=100, verbose_name="Tytuł")
    description = models.TextField(blank=True, null=True, verbose_name="Opis")
    cover_image = models.ImageField(upload_to='quiz_covers/', blank=True, null=True, verbose_name="Okładka")
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, blank=True, null=True, related_name="quizzes", verbose_name="Gatunek")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='MEDIUM', verbose_name="Poziom trudności")
    num_questions_to_ask = models.IntegerField(default=10, verbose_name="Liczba pytań w grze")
    time_limit = models.IntegerField(default=15, verbose_name="Długość odtwarzania utworu (sekundy)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data utworzenia")

    def __str__(self):
        return self.title

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    song = models.ForeignKey(Song, on_delete=models.SET_NULL, blank=True, null=True, related_name='questions', verbose_name="Piosenka")
    question_text = models.TextField(verbose_name="Treść pytania", blank=True, default="")
    audio_url = models.URLField(max_length=255, blank=True, null=True, verbose_name="Zewnętrzny link do audio")
    audio_file = models.FileField(upload_to='quiz_audio/', blank=True, null=True, verbose_name="Własny plik audio")
    time_limit = models.IntegerField(blank=True, null=True, verbose_name="Limit czasu (sekundy) - jeśli puste, dziedziczy z Quizu")
    points = models.IntegerField(default=1, verbose_name="Punkty")
    min_points = models.IntegerField(default=0, verbose_name="Minimalne punkty")

    @property
    def final_time_limit(self):
        if self.time_limit is not None:
            return self.time_limit
        return self.quiz.time_limit if self.quiz else 15

    def save(self, *args, **kwargs):
        if self.question_text is None:
            self.question_text = ""
        super().save(*args, **kwargs)

    def __str__(self):
        if self.song:
            return f"{self.quiz.title} - Zgadnij utwór: {self.song.title}"
        return f"{self.quiz.title} - Pytanie {self.id}"

class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    answer_text = models.CharField(max_length=255, verbose_name="Treść odpowiedzi")
    is_correct = models.BooleanField(default=False, verbose_name="Czy poprawna?")

    def __str__(self):
        return self.answer_text

class GameSession(models.Model):
    DIFFICULTY_CHOICES = [
        ('EASY', 'Łatwy'),
        ('MEDIUM', 'Średni'),
        ('HARD', 'Trudny'),
    ]
    DIFFICULTY_TIME_MAP = {
        'EASY': 30,
        'MEDIUM': 15,
        'HARD': 5,
    }

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="sessions")
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="sessions")
    chosen_difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='MEDIUM', verbose_name="Wybrana trudność")
    chosen_num_questions = models.IntegerField(default=10, verbose_name="Wybrana liczba pytań")
    started_at = models.DateTimeField(auto_now_add=True, verbose_name="Start")
    finished_at = models.DateTimeField(blank=True, null=True, verbose_name="Koniec")
    total_points = models.IntegerField(default=0, verbose_name="Suma punktow")
    correct_count = models.IntegerField(default=0, verbose_name="Poprawne")
    total_questions = models.IntegerField(default=0, verbose_name="Wszystkie pytania")
    total_time_seconds = models.FloatField(default=0, verbose_name="Czas laczny")
    average_time_seconds = models.FloatField(default=0, verbose_name="Sredni czas")

    def __str__(self):
        return f"Session {self.id} - {self.quiz.title}"


class QuestionAttempt(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name="attempts")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="attempts")
    selected_answer = models.ForeignKey(Answer, on_delete=models.SET_NULL, blank=True, null=True, related_name="attempts")
    answer_text = models.CharField(max_length=255, blank=True, null=True, verbose_name="Odpowiedz")
    is_correct = models.BooleanField(default=False, verbose_name="Poprawna")
    time_taken_seconds = models.FloatField(default=0, verbose_name="Czas odpowiedzi")
    points_awarded = models.IntegerField(default=0, verbose_name="Punkty")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data")

    def __str__(self):
        return f"Attempt {self.id} - {self.question_id}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=150, blank=True, null=True, verbose_name="Nazwa wyswietlana")
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True, verbose_name="Avatar")
    current_streak = models.IntegerField(default=0, verbose_name="Aktualna seria")
    best_streak = models.IntegerField(default=0, verbose_name="Najlepsza seria")
    total_points = models.IntegerField(default=0, verbose_name="Suma punktow")
    games_played = models.IntegerField(default=0, verbose_name="Gier")
    correct_answers = models.IntegerField(default=0, verbose_name="Poprawne odpowiedzi")
    total_answers = models.IntegerField(default=0, verbose_name="Wszystkie odpowiedzi")
    total_time_seconds = models.FloatField(default=0, verbose_name="Czas laczny")

    def __str__(self):
        return self.display_name or self.user.username


class UserScore(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='scores')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='scores')
    session = models.OneToOneField(GameSession, on_delete=models.SET_NULL, blank=True, null=True, related_name="score")
    score = models.IntegerField(verbose_name="Wynik")
    correct_count = models.IntegerField(default=0, verbose_name="Poprawne")
    total_questions = models.IntegerField(default=0, verbose_name="Wszystkie pytania")
    average_time_seconds = models.FloatField(default=0, verbose_name="Sredni czas")
    played_at = models.DateTimeField(auto_now_add=True, verbose_name="Data gry")

    def __str__(self):
        username = self.user.username if self.user else "Anonim"
        return f"{username} - {self.quiz.title}: {self.score}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance, display_name=instance.username)
