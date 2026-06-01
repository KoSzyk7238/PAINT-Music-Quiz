from django import forms
from django.contrib import admin
from .models import Genre, Song, Quiz, Question, Answer, UserScore, GameSession, QuestionAttempt, UserProfile
from .apple_music import resolve_preview_url, fetch_apple_music_metadata
from import_export import resources, fields
from import_export.widgets import ForeignKeyWidget
from import_export.admin import ImportExportModelAdmin

# Resource definitions for django-import-export
class GenreResource(resources.ModelResource):
    class Meta:
        model = Genre
        import_id_fields = ('id',)

class SongResource(resources.ModelResource):
    genre = fields.Field(
        column_name='genre',
        attribute='genre',
        widget=ForeignKeyWidget(Genre, field='name')
    )

    class Meta:
        model = Song
        import_id_fields = ('id',)

    def before_import_row(self, row, **kwargs):
        genre_name = row.get('genre')
        if genre_name:
            from django.utils.text import slugify
            Genre.objects.get_or_create(
                name=genre_name.strip(),
                defaults={'slug': slugify(genre_name.strip())}
            )

class QuizResource(resources.ModelResource):
    genre = fields.Field(
        column_name='genre',
        attribute='genre',
        widget=ForeignKeyWidget(Genre, field='name')
    )

    class Meta:
        model = Quiz
        import_id_fields = ('id',)

    def before_import_row(self, row, **kwargs):
        genre_name = row.get('genre')
        if genre_name:
            from django.utils.text import slugify
            Genre.objects.get_or_create(
                name=genre_name.strip(),
                defaults={'slug': slugify(genre_name.strip())}
            )

class QuestionResource(resources.ModelResource):
    quiz = fields.Field(
        column_name='quiz',
        attribute='quiz',
        widget=ForeignKeyWidget(Quiz, field='title')
    )
    song = fields.Field(
        column_name='song',
        attribute='song',
        widget=ForeignKeyWidget(Song, field='title')
    )

    class Meta:
        model = Question
        import_id_fields = ('id',)

class AnswerResource(resources.ModelResource):
    class Meta:
        model = Answer
        import_id_fields = ('id',)

# Konfiguracja pozwalająca dodawać odpowiedzi bezpośrednio w widoku edycji pytania
class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 4  # Domyślnie wyświetli 4 puste pola na odpowiedzi

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1
    fields = ('song', 'points', 'time_limit')
    autocomplete_fields = ['song']
    show_change_link = True # Pozwala przejść do pytania, żeby dodać odpowiedzi

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('song')

class QuestionAdmin(ImportExportModelAdmin):
    resource_classes = [QuestionResource]
    inlines = [AnswerInline]
    list_display = ('id', 'quiz', 'song', 'points')
    list_filter = ('quiz', 'song')
    autocomplete_fields = ['song', 'quiz']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('quiz', 'song')

class QuizAdmin(ImportExportModelAdmin):
    resource_classes = [QuizResource]
    list_display = ('title', 'genre', 'num_questions_to_ask', 'time_limit', 'created_at')
    search_fields = ('title',)
    list_editable = ('num_questions_to_ask', 'time_limit')
    inlines = [QuestionInline]
    change_list_template = "admin/projekt_muzyka/quiz/change_list.html"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('genre')

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('import-apple-playlist/', self.admin_site.admin_view(self.import_apple_playlist), name='import-apple-playlist'),
        ]
        return custom_urls + urls

    def import_apple_playlist(self, request):
        from django.shortcuts import render, redirect
        from django.contrib import messages

        from .playlist_import import import_quiz_from_playlist

        quizzes = Quiz.objects.all().order_by('title')
        context = self.admin_site.each_context(request)
        context.update({
            "title": "Importuj z Apple Music",
            "quizzes": quizzes,
        })

        if request.method == "POST":
            playlist_url = request.POST.get("playlist_url")
            quiz_id = request.POST.get("quiz_id")
            custom_title = request.POST.get("title")
            custom_description = request.POST.get("description")
            difficulty = request.POST.get("difficulty", "MEDIUM")
            try:
                num_questions_to_ask = int(request.POST.get("num_questions_to_ask", 10))
            except ValueError:
                num_questions_to_ask = 10
            try:
                time_limit = int(request.POST.get("time_limit", 15))
            except ValueError:
                time_limit = 15

            selected_quiz_id = None
            if quiz_id:
                try:
                    selected_quiz_id = int(quiz_id)
                except ValueError:
                    pass

            form_context = {
                "playlist_url": playlist_url,
                "title": custom_title,
                "description": custom_description,
                "difficulty": difficulty,
                "num_questions_to_ask": num_questions_to_ask,
                "time_limit": time_limit,
                "selected_quiz_id": selected_quiz_id,
            }

            if not playlist_url:
                messages.error(request, "Adres URL playlisty jest wymagany.")
                context.update(form_context)
                return render(request, "admin/projekt_muzyka/quiz/import_playlist.html", context)

            title = custom_title.strip() if custom_title else None
            description = custom_description.strip() if custom_description else None

            result = import_quiz_from_playlist(
                playlist_url,
                title=title,
                description=description,
                quiz_id=selected_quiz_id,
                difficulty=difficulty,
                num_questions_to_ask=num_questions_to_ask,
                time_limit=time_limit,
            )

            if not result.success:
                context.update({**form_context, "error": result.error, "title": title, "description": description})
                return render(request, "admin/projekt_muzyka/quiz/import_playlist.html", context)

            quiz = result.quiz
            if selected_quiz_id:
                msg = (
                    f"Pomyślnie dodano piosenki do quizu '{quiz.title}'! "
                    f"Dodano {result.songs_added} nowych utworów."
                )
                if result.songs_skipped > 0:
                    msg += f" (Pominięto {result.songs_skipped} utworów, które już były w tym quizie)"
            else:
                msg = (
                    f"Pomyślnie zaimportowano playlistę! "
                    f"Utworzono quiz '{quiz.title}' z {result.songs_added} pytaniami."
                )
            messages.success(request, msg)
            return redirect("admin:projekt_muzyka_quiz_changelist")

        context.update({
            "num_questions_to_ask": 10,
            "time_limit": 15,
        })
        return render(request, "admin/projekt_muzyka/quiz/import_playlist.html", context)


class GenreAdmin(ImportExportModelAdmin):
    resource_classes = [GenreResource]
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name', 'slug')


class SongAdminForm(forms.ModelForm):
    title = forms.CharField(required=False, label="Tytuł (zostaw puste, aby pobrać z Apple Music)")

    class Meta:
        model = Song
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        title = cleaned_data.get("title")
        url = cleaned_data.get("apple_snippet_url")

        if url and "music.apple.com" in url:
            metadata = fetch_apple_music_metadata(url)
            if metadata:
                if not title:
                    title = metadata.get("title")
                    cleaned_data["title"] = title
                
                if not cleaned_data.get("artist"):
                    cleaned_data["artist"] = metadata.get("artist")
                
                if not cleaned_data.get("release_year"):
                    cleaned_data["release_year"] = metadata.get("release_year")
                
                genre_name = metadata.get("genre")
                if genre_name and not cleaned_data.get("genre"):
                    from django.utils.text import slugify
                    genre, _ = Genre.objects.get_or_create(
                        name=genre_name,
                        defaults={'slug': slugify(genre_name)}
                    )
                    cleaned_data["genre"] = genre
                
                if metadata.get("preview_url"):
                    cleaned_data["apple_snippet_url"] = metadata.get("preview_url")

        if not title:
            raise forms.ValidationError("Tytuł piosenki jest wymagany (wprowadź ręcznie lub podaj prawidłowy link Apple Music).")

        return cleaned_data


class SongAdmin(ImportExportModelAdmin):
    resource_classes = [SongResource]
    form = SongAdminForm
    list_display = ('title', 'artist', 'genre', 'release_year', 'created_at')
    list_filter = ('genre',)
    search_fields = ('title', 'artist')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('genre')

class UserScoreAdmin(ImportExportModelAdmin):
    list_display = ('user', 'quiz', 'score', 'played_at')
    list_filter = ('quiz', 'user')


class GameSessionAdmin(ImportExportModelAdmin):
    list_display = ('id', 'user', 'quiz', 'total_points', 'finished_at')
    list_filter = ('quiz',)
    search_fields = ('id',)


class QuestionAttemptAdmin(ImportExportModelAdmin):
    list_display = ('id', 'session', 'question', 'is_correct', 'points_awarded', 'created_at')
    list_filter = ('is_correct',)
    search_fields = ('id',)


class UserProfileAdmin(ImportExportModelAdmin):
    list_display = ('user', 'display_name', 'total_points', 'current_streak', 'best_streak')
    search_fields = ('user__username', 'display_name')

class AnswerAdmin(ImportExportModelAdmin):
    resource_classes = [AnswerResource]
    list_display = ('id', 'question', 'answer_text', 'is_correct')
    list_filter = ('is_correct',)
    search_fields = ('answer_text',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('question')

# Custom Admin Backup Views
def backup_manage_view(request):
    from django.shortcuts import render
    context = admin.site.each_context(request)
    context.update({
        'title': 'Kopia zapasowa bazy danych',
    })
    return render(request, 'admin/projekt_muzyka/backup_manage.html', context)

def backup_export_view(request):
    from django.core import management
    import io
    from django.http import HttpResponse
    
    output = io.StringIO()
    management.call_command(
        'dumpdata',
        exclude=['contenttypes', 'auth.Permission', 'sessions', 'admin.logentry'],
        indent=4,
        stdout=output
    )
    
    response = HttpResponse(output.getvalue(), content_type='application/json')
    response['Content-Disposition'] = 'attachment; filename="db_backup.json"'
    return response

def backup_import_view(request):
    from django.core import management
    from django.db import transaction
    from django.contrib import messages
    from django.shortcuts import redirect
    import tempfile
    import os
    
    if request.method == 'POST':
        backup_file = request.FILES.get('backup_file')
        clear_existing = request.POST.get('clear_existing') == 'yes'
        
        if not backup_file:
            messages.error(request, "Nie wybrano pliku.")
            return redirect('admin:backup_manage')
            
        try:
            with transaction.atomic():
                if clear_existing:
                    # Clear models to ensure a clean slate
                    QuestionAttempt.objects.all().delete()
                    GameSession.objects.all().delete()
                    UserScore.objects.all().delete()
                    Answer.objects.all().delete()
                    Question.objects.all().delete()
                    Quiz.objects.all().delete()
                    Song.objects.all().delete()
                    Genre.objects.all().delete()
                    UserProfile.objects.all().delete()
                    
                with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as temp_file:
                    for chunk in backup_file.chunks():
                        temp_file.write(chunk)
                    temp_file_path = temp_file.name
                    
                try:
                    management.call_command('loaddata', temp_file_path)
                    messages.success(request, "Baza danych została pomyślnie zaimportowana!")
                finally:
                    if os.path.exists(temp_file_path):
                        os.remove(temp_file_path)
                        
        except Exception as e:
            messages.error(request, f"Błąd podczas importu danych: {str(e)}")
            
        return redirect('admin:backup_manage')
    
    return redirect('admin:backup_manage')

# Overriding AdminSite URLs to inject the backup views
original_get_urls = admin.site.get_urls

def new_get_urls():
    from django.urls import path
    urls = original_get_urls()
    custom_urls = [
        path('backup/', admin.site.admin_view(backup_manage_view), name='backup_manage'),
        path('backup/export/', admin.site.admin_view(backup_export_view), name='backup_export'),
        path('backup/import/', admin.site.admin_view(backup_import_view), name='backup_import'),
    ]
    return custom_urls + urls

admin.site.get_urls = new_get_urls

# Register all model admins
admin.site.register(Genre, GenreAdmin)
admin.site.register(Song, SongAdmin)
admin.site.register(Quiz, QuizAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Answer, AnswerAdmin)
admin.site.register(UserScore, UserScoreAdmin)
admin.site.register(GameSession, GameSessionAdmin)
admin.site.register(QuestionAttempt, QuestionAttemptAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
