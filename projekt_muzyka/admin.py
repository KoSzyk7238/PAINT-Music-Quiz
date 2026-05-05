from django.contrib import admin
from .models import Quiz, Question, Answer, UserScore

# Konfiguracja pozwalająca dodawać odpowiedzi bezpośrednio w widoku edycji pytania
class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 4  # Domyślnie wyświetli 4 puste pola na odpowiedzi

class QuestionAdmin(admin.ModelAdmin):
    inlines = [AnswerInline]
    list_display = ('question_text', 'quiz', 'points')
    list_filter = ('quiz',)
    search_fields = ('question_text',)

class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')
    search_fields = ('title',)

class UserScoreAdmin(admin.ModelAdmin):
    list_display = ('user', 'quiz', 'score', 'played_at')
    list_filter = ('quiz', 'user')

admin.site.register(Quiz, QuizAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(UserScore, UserScoreAdmin)