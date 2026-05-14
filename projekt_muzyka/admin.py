from django.contrib import admin
from .models import Genre, Song, Quiz, Question, Answer, UserScore, GameSession, QuestionAttempt, UserProfile

# Konfiguracja pozwalająca dodawać odpowiedzi bezpośrednio w widoku edycji pytania
class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 4  # Domyślnie wyświetli 4 puste pola na odpowiedzi

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1
    fields = ('song', 'points', 'time_limit')
    show_change_link = True # Pozwala przejść do pytania, żeby dodać odpowiedzi

class QuestionAdmin(admin.ModelAdmin):
    inlines = [AnswerInline]
    list_display = ('id', 'quiz', 'song', 'points')
    list_filter = ('quiz', 'song')

class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'genre', 'num_questions_to_ask', 'created_at')
    search_fields = ('title',)
    list_editable = ('num_questions_to_ask',)
    inlines = [QuestionInline]


class GenreAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')


class SongAdmin(admin.ModelAdmin):
    list_display = ('title', 'artist', 'genre', 'release_year', 'created_at')
    list_filter = ('genre',)
    search_fields = ('title', 'artist')

class UserScoreAdmin(admin.ModelAdmin):
    list_display = ('user', 'quiz', 'score', 'played_at')
    list_filter = ('quiz', 'user')


class GameSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'quiz', 'total_points', 'finished_at')
    list_filter = ('quiz',)
    search_fields = ('id',)


class QuestionAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'question', 'is_correct', 'points_awarded', 'created_at')
    list_filter = ('is_correct',)
    search_fields = ('id',)


class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_name', 'total_points', 'current_streak', 'best_streak')
    search_fields = ('user__username', 'display_name')

admin.site.register(Genre, GenreAdmin)
admin.site.register(Song, SongAdmin)
admin.site.register(Quiz, QuizAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(UserScore, UserScoreAdmin)
admin.site.register(GameSession, GameSessionAdmin)
admin.site.register(QuestionAttempt, QuestionAttemptAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
