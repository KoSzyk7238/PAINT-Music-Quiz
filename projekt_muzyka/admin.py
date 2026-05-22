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
        from django.db import transaction
        from django.utils.text import slugify
        from django.core.files.base import ContentFile
        from .apple_music import (
            extract_track_ids_from_playlist_url,
            fetch_multiple_apple_music_metadata,
            extract_playlist_name_and_desc,
            fetch_playlist_cover_image,
        )
        import random

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

            if not playlist_url:
                messages.error(request, "Adres URL playlisty jest wymagany.")
                context.update({
                    "playlist_url": playlist_url,
                    "title": custom_title,
                    "description": custom_description,
                    "difficulty": difficulty,
                    "num_questions_to_ask": num_questions_to_ask,
                    "time_limit": time_limit,
                    "selected_quiz_id": selected_quiz_id,
                })
                return render(request, "admin/projekt_muzyka/quiz/import_playlist.html", context)

            # Extract track IDs
            track_ids = extract_track_ids_from_playlist_url(playlist_url)
            if not track_ids:
                context.update({
                    "error": "Nie znaleziono żadnych utworów na podanej playliście. Upewnij się, że jest ona publiczna i poprawna.",
                    "playlist_url": playlist_url,
                    "title": custom_title,
                    "description": custom_description,
                    "difficulty": difficulty,
                    "num_questions_to_ask": num_questions_to_ask,
                    "time_limit": time_limit,
                    "selected_quiz_id": selected_quiz_id,
                })
                return render(request, "admin/projekt_muzyka/quiz/import_playlist.html", context)

            # Fetch metadata for the playlist name/description if not provided
            playlist_name, playlist_desc = extract_playlist_name_and_desc(playlist_url)
            title = custom_title.strip() if custom_title else playlist_name
            description = custom_description.strip() if custom_description else playlist_desc

            # Fetch track metadata in bulk
            metadata_dict = fetch_multiple_apple_music_metadata(track_ids)
            if not metadata_dict:
                context.update({
                    "error": "Nie udało się pobrać szczegółowych danych utworów z iTunes API.",
                    "playlist_url": playlist_url,
                    "title": title,
                    "description": description,
                    "difficulty": difficulty,
                    "num_questions_to_ask": num_questions_to_ask,
                    "time_limit": time_limit,
                    "selected_quiz_id": selected_quiz_id,
                })
                return render(request, "admin/projekt_muzyka/quiz/import_playlist.html", context)

            # Fetch cover image
            cover_data = fetch_playlist_cover_image(playlist_url)

            # Database creation in a transaction
            try:
                existing_quiz = None
                if selected_quiz_id:
                    try:
                        existing_quiz = Quiz.objects.get(id=selected_quiz_id)
                    except Quiz.DoesNotExist:
                        messages.error(request, "Wybrany quiz nie istnieje.")
                        context.update({
                            "playlist_url": playlist_url,
                            "title": title,
                            "description": description,
                            "difficulty": difficulty,
                            "num_questions_to_ask": num_questions_to_ask,
                            "time_limit": time_limit,
                            "selected_quiz_id": selected_quiz_id,
                        })
                        return render(request, "admin/projekt_muzyka/quiz/import_playlist.html", context)

                with transaction.atomic():
                    if existing_quiz:
                        quiz = existing_quiz
                        if not quiz.cover_image and cover_data:
                            quiz.cover_image.save("cover.jpg", ContentFile(cover_data), save=True)
                    else:
                        # Create the Quiz
                        quiz = Quiz.objects.create(
                            title=title,
                            description=description,
                            difficulty=difficulty,
                            num_questions_to_ask=num_questions_to_ask,
                            time_limit=time_limit,
                        )
                        if cover_data:
                            quiz.cover_image.save("cover.jpg", ContentFile(cover_data), save=True)

                    first_genre = None
                    songs_count = 0
                    skipped_count = 0

                    for tid in track_ids:
                        metadata = metadata_dict.get(tid)
                        if not metadata or not metadata.get("title") or not metadata.get("preview_url"):
                            continue

                        # Find or create Genre
                        genre_name = metadata.get("genre") or "Miks"
                        genre_slug = slugify(genre_name)
                        genre, _ = Genre.objects.get_or_create(
                            slug=genre_slug,
                            defaults={"name": genre_name}
                        )

                        if not first_genre:
                            first_genre = genre

                        # Find or create Song
                        song_title = metadata.get("title")
                        artist = metadata.get("artist") or ""
                        release_year = metadata.get("release_year")
                        preview_url = metadata.get("preview_url")

                        song, created = Song.objects.get_or_create(
                            title=song_title,
                            artist=artist,
                            defaults={
                                "genre": genre,
                                "release_year": release_year,
                                "apple_snippet_url": preview_url,
                            }
                        )

                        # Zabezpieczenie przed duplikatami piosenek w tym quizie
                        if Question.objects.filter(quiz=quiz, song=song).exists():
                            skipped_count += 1
                            continue

                        # Create the Question
                        question = Question.objects.create(
                            quiz=quiz,
                            song=song,
                            question_text=f"Zgadnij tytuł tej piosenki",
                            time_limit=None,
                            points=1,
                            min_points=0,
                        )

                        # Create correct answers
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

                        # Create some incorrect answer suggestions
                        distractors = []
                        # 1. Grab other tracks from this playlist
                        other_tracks = [m for k, m in metadata_dict.items() if k != tid and m.get("title")]
                        if len(other_tracks) >= 3:
                            picked_tracks = random.sample(other_tracks, 3)
                            for pt in picked_tracks:
                                text = f"{pt.get('title')} - {pt.get('artist')}" if pt.get('artist') else pt.get('title')
                                distractors.append(text)
                        
                        # 2. Grab from DB songs if needed
                        if len(distractors) < 3:
                            db_songs = list(Song.objects.exclude(id=song.id)[:10])
                            if len(db_songs) >= 3:
                                picked_db = random.sample(db_songs, min(3 - len(distractors), len(db_songs)))
                                for ds in picked_db:
                                    text = f"{ds.title} - {ds.artist}" if ds.artist else ds.title
                                    distractors.append(text)

                        # 3. Fallbacks
                        while len(distractors) < 3:
                            distractors.append(f"Inny utwór {len(distractors) + 1}")

                        for dist in distractors[:3]:
                            Answer.objects.create(
                                question=question,
                                answer_text=dist,
                                is_correct=False,
                            )

                        songs_count += 1

                    # Set the genre of the quiz to the genre of the first song if not set
                    if first_genre and (not existing_quiz or not quiz.genre):
                        quiz.genre = first_genre
                        quiz.save(update_fields=["genre"])

                if existing_quiz:
                    msg = f"Pomyślnie dodano piosenki do quizu '{quiz.title}'! Dodano {songs_count} nowych utworów."
                    if skipped_count > 0:
                        msg += f" (Pominięto {skipped_count} utworów, które już były w tym quizie)"
                    messages.success(request, msg)
                else:
                    messages.success(request, f"Pomyślnie zaimportowano playlistę! Utworzono quiz '{quiz.title}' z {songs_count} pytaniami.")
                return redirect("admin:projekt_muzyka_quiz_changelist")

            except Exception as e:
                messages.error(request, f"Wystąpił błąd podczas zapisywania w bazie danych: {str(e)}")
                context.update({
                    "playlist_url": playlist_url,
                    "title": title,
                    "description": description,
                    "difficulty": difficulty,
                    "num_questions_to_ask": num_questions_to_ask,
                    "time_limit": time_limit,
                    "selected_quiz_id": selected_quiz_id,
                })
                return render(request, "admin/projekt_muzyka/quiz/import_playlist.html", context)

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
