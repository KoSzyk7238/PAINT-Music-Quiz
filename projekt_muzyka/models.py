from django.db import models
from django.contrib.auth.models import User

class Quiz(models.Model):
    DIFFICULTY_CHOICES = [
        ('EASY', 'Łatwy'),
        ('MEDIUM', 'Średni'),
        ('HARD', 'Trudny'),
    ]
    title = models.CharField(max_length=100, verbose_name="Tytuł")
    description = models.TextField(blank=True, null=True, verbose_name="Opis")
    cover_image = models.ImageField(upload_to='quiz_covers/', blank=True, null=True, verbose_name="Okładka")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='MEDIUM', verbose_name="Poziom trudności")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data utworzenia")

    def __str__(self):
        return self.title

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField(verbose_name="Treść pytania")
    audio_url = models.URLField(max_length=255, blank=True, null=True, verbose_name="Zewnętrzny link do audio")
    audio_file = models.FileField(upload_to='quiz_audio/', blank=True, null=True, verbose_name="Własny plik audio")
    time_limit = models.IntegerField(default=15, verbose_name="Limit czasu (sekundy)")
    points = models.IntegerField(default=1, verbose_name="Punkty")

    def __str__(self):
        return f"{self.quiz.title} - {self.question_text[:30]}"

class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    answer_text = models.CharField(max_length=255, verbose_name="Treść odpowiedzi")
    is_correct = models.BooleanField(default=False, verbose_name="Czy poprawna?")

    def __str__(self):
        return self.answer_text

class UserScore(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scores')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='scores')
    score = models.IntegerField(verbose_name="Wynik")
    played_at = models.DateTimeField(auto_now_add=True, verbose_name="Data gry")

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title}: {self.score}"