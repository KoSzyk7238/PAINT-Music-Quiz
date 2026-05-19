from django.http import HttpResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import (
    Genre,
    Song,
    Quiz,
    Question,
    Answer,
    UserScore,
    GameSession,
    QuestionAttempt,
    UserProfile,
)
from .serializers import (
    GenreSerializer,
    SongSerializer,
    QuizSerializer,
    QuestionSerializer,
    AnswerSerializer,
    UserScoreSerializer,
    GameSessionSerializer,
    QuestionAttemptSerializer,
    UserProfileSerializer,
    UserPublicSerializer,
)
from . import music_api
import random


def get_or_create_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"display_name": user.username})
    return profile


def calculate_time_score(max_points, min_points, time_taken, time_limit):
    max_score = 3000
    min_score = 100
    
    if time_limit <= 0:
        return max_score

    grace_period = 2.0
    if time_taken <= grace_period:
        return max_score

    clamped_time = max(grace_period, min(float(time_taken), float(time_limit)))
    if time_limit > grace_period:
        ratio = (clamped_time - grace_period) / float(time_limit - grace_period)
    else:
        ratio = 0.0

    delta = int((max_score - min_score) * ratio)
    score = max_score - delta
    return max(min_score, score)

def home(request):
    """Prosty widok dla strony głównej."""
    html = """
    <html>
        <head><title>PAINT Music Quiz API</title></head>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1>Witaj w API do Music Quiz!</h1>
            <p>Serwer działa poprawnie.</p>
            <p>Możesz teraz przejść do panelu administratora:</p>
            <a href="/admin/">Przejdź do panelu admina</a>
            <p>Lub do głównego widoku API:</p>
            <a href="/api/">Przejdź do API</a>
        </body>
    </html>
    """
    return HttpResponse(html)


class RegisterView(APIView):
    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")
        display_name = request.data.get("display_name")

        if not username or not password:
            return Response({"error": "Username i haslo sa wymagane."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Uzytkownik juz istnieje."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        profile = get_or_create_profile(user)
        if display_name:
            profile.display_name = display_name
            profile.save(update_fields=["display_name"])

        login(request, user)
        return Response(UserPublicSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "Username i haslo sa wymagane."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({"error": "Niepoprawne dane logowania."}, status=status.HTTP_400_BAD_REQUEST)

        login(request, user)
        return Response(UserPublicSerializer(user).data)


class LogoutView(APIView):
    def post(self, request, *args, **kwargs):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({"error": "Brak zalogowanego uzytkownika."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserPublicSerializer(request.user).data)


class ProfileView(APIView):
    def get(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({"error": "Brak zalogowanego uzytkownika."}, status=status.HTTP_401_UNAUTHORIZED)
        profile = get_or_create_profile(request.user)
        return Response(UserProfileSerializer(profile).data)

    def put(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({"error": "Brak zalogowanego uzytkownika."}, status=status.HTTP_401_UNAUTHORIZED)
        profile = get_or_create_profile(request.user)
        
        username = request.data.get("username")
        if username:
            username = username.strip()
            if username != request.user.username:
                if not username:
                    return Response({"error": "Nazwa użytkownika nie może być pusta."}, status=status.HTTP_400_BAD_REQUEST)
                if User.objects.filter(username=username).exists():
                    return Response({"error": "Użytkownik o takiej nazwie już istnieje."}, status=status.HTTP_400_BAD_REQUEST)
                request.user.username = username
                request.user.save(update_fields=["username"])

        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GenreList(generics.ListCreateAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer


class GenreDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer


class SongList(generics.ListCreateAPIView):
    serializer_class = SongSerializer

    def get_queryset(self):
        queryset = Song.objects.all()
        genre_id = self.request.query_params.get("genre_id")
        if genre_id:
            queryset = queryset.filter(genre_id=genre_id)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(artist__icontains=search))
        return queryset


class SongDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Song.objects.all()
    serializer_class = SongSerializer

class QuizList(generics.ListCreateAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer

class QuizDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer

class QuestionList(generics.ListCreateAPIView):
    serializer_class = QuestionSerializer

    def get_queryset(self):
        queryset = Question.objects.all()
        quiz_id = self.request.query_params.get("quiz_id")
        if quiz_id:
            queryset = queryset.filter(quiz_id=quiz_id)
        return queryset

class QuestionDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer


class AnswerList(generics.ListCreateAPIView):
    serializer_class = AnswerSerializer

    def get_queryset(self):
        queryset = Answer.objects.all()
        question_id = self.request.query_params.get("question_id")
        if question_id:
            queryset = queryset.filter(question_id=question_id)
        return queryset


class AnswerDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer

class UserScoreList(generics.ListCreateAPIView):
    queryset = UserScore.objects.all()
    serializer_class = UserScoreSerializer

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class GameSessionList(generics.ListCreateAPIView):
    queryset = GameSession.objects.all()
    serializer_class = GameSessionSerializer

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)


class GameSessionDetail(generics.RetrieveAPIView):
    queryset = GameSession.objects.all()
    serializer_class = GameSessionSerializer


class GameSessionAttemptCreate(APIView):
    def post(self, request, session_id, *args, **kwargs):
        session = get_object_or_404(GameSession, pk=session_id)
        if session.finished_at:
            return Response({"error": "Sesja jest zakonczona."}, status=status.HTTP_400_BAD_REQUEST)

        question_id = request.data.get("question_id")
        if not question_id:
            return Response({"error": "Brak question_id."}, status=status.HTTP_400_BAD_REQUEST)

        question = get_object_or_404(Question, pk=question_id, quiz=session.quiz)

        answer_id = request.data.get("answer_id")
        answer_text = request.data.get("answer_text")
        time_taken_seconds = float(request.data.get("time_taken_seconds", 0))

        selected_answer = None
        is_correct = False

        if answer_id:
            selected_answer = get_object_or_404(Answer, pk=answer_id, question=question)
            is_correct = selected_answer.is_correct
        elif answer_text:
            normalized = str(answer_text).strip()
            is_correct = question.answers.filter(is_correct=True, answer_text__iexact=normalized).exists()
            if not is_correct and question.song:
                is_correct = (normalized.lower() == question.song.title.lower())
        else:
            return Response({"error": "Podaj answer_id lub answer_text."}, status=status.HTTP_400_BAD_REQUEST)

        points_awarded = 0
        if is_correct:
            # Streak: consecutive correct attempts in this session before the current one
            consecutive_correct = 0
            last_attempts = QuestionAttempt.objects.filter(session=session).order_by('-created_at')
            for att in last_attempts:
                if att.is_correct:
                    consecutive_correct += 1
                else:
                    break
            
            base_points = calculate_time_score(question.points, question.min_points, time_taken_seconds, question.final_time_limit)
            bonus_multiplier = 1.0 + min(consecutive_correct * 0.1, 1.0)
            points_awarded = int(base_points * bonus_multiplier)

        attempt = QuestionAttempt.objects.create(
            session=session,
            question=question,
            selected_answer=selected_answer,
            answer_text=answer_text,
            is_correct=is_correct,
            time_taken_seconds=time_taken_seconds,
            points_awarded=points_awarded,
        )

        session.total_questions += 1
        if is_correct:
            session.correct_count += 1
        session.total_points += points_awarded
        session.total_time_seconds += time_taken_seconds
        session.average_time_seconds = (
            session.total_time_seconds / session.total_questions if session.total_questions else 0
        )
        session.save(update_fields=[
            "total_questions",
            "correct_count",
            "total_points",
            "total_time_seconds",
            "average_time_seconds",
        ])

        if session.user:
            profile = get_or_create_profile(session.user)
            profile.total_answers += 1
            profile.total_time_seconds += time_taken_seconds
            if is_correct:
                profile.correct_answers += 1
                profile.total_points += points_awarded
                profile.current_streak += 1
                profile.best_streak = max(profile.best_streak, profile.current_streak)
            else:
                profile.current_streak = 0
            profile.save(update_fields=[
                "total_answers",
                "total_time_seconds",
                "correct_answers",
                "total_points",
                "current_streak",
                "best_streak",
            ])

        return Response(QuestionAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class GameSessionFinish(APIView):
    def post(self, request, session_id, *args, **kwargs):
        session = get_object_or_404(GameSession, pk=session_id)
        if not session.finished_at:
            session.finished_at = timezone.now()
            session.save(update_fields=["finished_at"])

        score, created = UserScore.objects.get_or_create(
            session=session,
            defaults={
                "user": session.user,
                "quiz": session.quiz,
                "score": session.total_points,
                "correct_count": session.correct_count,
                "total_questions": session.total_questions,
                "average_time_seconds": session.average_time_seconds,
            },
        )

        if not created:
            score.score = session.total_points
            score.correct_count = session.correct_count
            score.total_questions = session.total_questions
            score.average_time_seconds = session.average_time_seconds
            score.save(update_fields=["score", "correct_count", "total_questions", "average_time_seconds"])

        if session.user and created:
            profile = get_or_create_profile(session.user)
            profile.games_played += 1
            profile.save(update_fields=["games_played"])

        return Response(UserScoreSerializer(score).data)


class LeaderboardView(APIView):
    def get(self, request, *args, **kwargs):
        limit = int(request.query_params.get("limit", 20))
        profiles = UserProfile.objects.select_related("user").order_by("-total_points", "-best_streak")[:limit]
        data = []
        for idx, profile in enumerate(profiles, start=1):
            data.append({
                "rank": idx,
                "username": profile.user.username,
                "display_name": profile.display_name or profile.user.username,
                "points": profile.total_points,
                "streak": profile.current_streak,
                "avatar": profile.avatar.url if profile.avatar else None,
            })
        return Response(data)


class StatsView(APIView):
    def get(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({"error": "Brak zalogowanego uzytkownika."}, status=status.HTTP_401_UNAUTHORIZED)

        profile = get_or_create_profile(request.user)
        accuracy = (profile.correct_answers / profile.total_answers * 100) if profile.total_answers else 0
        average_time = (profile.total_time_seconds / profile.total_answers) if profile.total_answers else 0

        favorite_artist = None
        favorite = (
            QuestionAttempt.objects.filter(
                session__user=request.user,
                is_correct=True,
                question__song__artist__isnull=False,
            )
            .values("question__song__artist")
            .annotate(count=Count("id"))
            .order_by("-count")
            .first()
        )
        if favorite:
            favorite_artist = favorite["question__song__artist"]

        recent_sessions = (
            GameSession.objects.filter(user=request.user, finished_at__isnull=False)
            .select_related("quiz", "quiz__genre")
            .order_by("-finished_at")[:10]
        )
        recent_games = []
        for session in recent_sessions:
            category = session.quiz.genre.name if session.quiz.genre else "Mix"
            recent_games.append({
                "id": session.id,
                "played_at": session.finished_at or session.started_at,
                "category": category,
                "points": session.total_points,
                "correct": session.correct_count,
                "total": session.total_questions,
            })

        genre_distribution = []
        genre_counts = (
            QuestionAttempt.objects.filter(
                session__user=request.user,
                is_correct=True,
                question__song__genre__isnull=False,
            )
            .values("question__song__genre__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        for row in genre_counts:
            genre_distribution.append({
                "genre": row["question__song__genre__name"],
                "count": row["count"],
            })

        decade_distribution = {}
        year_rows = (
            QuestionAttempt.objects.filter(
                session__user=request.user,
                is_correct=True,
                question__song__release_year__isnull=False,
            )
            .values("question__song__release_year")
            .annotate(count=Count("id"))
        )
        for row in year_rows:
            year = row["question__song__release_year"]
            if not year:
                continue
            decade = (year // 10) * 10
            key = f"{decade}s"
            decade_distribution[key] = decade_distribution.get(key, 0) + row["count"]

        summary = {
            "games_played": profile.games_played,
            "total_points": profile.total_points,
            "accuracy_percent": round(accuracy, 2),
            "best_streak": profile.best_streak,
            "average_reaction_time": round(average_time, 2),
            "favorite_artist": favorite_artist,
        }

        return Response({
            "summary": summary,
            "recent_games": recent_games,
            "genre_distribution": genre_distribution,
            "decade_distribution": decade_distribution,
        })

class CreateQuizFromArtistView(APIView):
    def post(self, request, *args, **kwargs):
        artist_name = request.data.get('artist_name')
        num_questions = int(request.data.get('num_questions', 10))

        if not artist_name:
            return Response({"error": "Nazwa artysty jest wymagana."}, status=status.HTTP_400_BAD_REQUEST)

        artists = music_api.search_artist(artist_name)
        if not artists:
            return Response({"error": f"Nie znaleziono artysty '{artist_name}'."}, status=status.HTTP_404_NOT_FOUND)
        
        artist_id = artists[0]['id']
        
        songs = music_api.get_random_song_by_artist(artist_id, limit=num_questions * 4)
        if not songs or len(songs) < num_questions:
            return Response({"error": "Nie znaleziono wystarczającej liczby piosenek dla tego artysty."}, status=status.HTTP_404_NOT_FOUND)

        quiz = Quiz.objects.create(title=f"Quiz o piosenkach {artists[0]['name']}", description=f"Zgadnij tytuły piosenek artysty {artists[0]['name']}.")

        selected_songs = random.sample(songs, num_questions)
        for song_data in selected_songs:
            question = Question.objects.create(
                quiz=quiz,
                question_text=f"Jaki jest tytuł tego utworu?",
            )
            
            Answer.objects.create(question=question, answer_text=song_data['title'], is_correct=True)

            other_songs = [s for s in songs if s['id'] != song_data['id']]
            wrong_answers_data = random.sample(other_songs, 3)
            for wrong_song in wrong_answers_data:
                Answer.objects.create(question=question, answer_text=wrong_song['title'], is_correct=False)
        
        serializer = QuizSerializer(quiz)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AddSongToQuizView(APIView):
    def post(self, request, quiz_id, *args, **kwargs):
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        song_id = request.data.get("song_id")
        if not song_id:
            return Response({"error": "Brak song_id."}, status=status.HTTP_400_BAD_REQUEST)

        song = get_object_or_404(Song, pk=song_id)
        question_text = request.data.get("question_text") or "Jaki jest tytul tego utworu?"
        time_limit = int(request.data.get("time_limit", 15))
        points = int(request.data.get("points", 1))
        min_points = int(request.data.get("min_points", 0))

        question = Question.objects.create(
            quiz=quiz,
            song=song,
            question_text=question_text,
            time_limit=time_limit,
            points=points,
            min_points=min_points,
        )

        answers = request.data.get("answers")
        if isinstance(answers, list) and answers:
            for answer in answers:
                Answer.objects.create(
                    question=question,
                    answer_text=answer.get("answer_text", ""),
                    is_correct=bool(answer.get("is_correct", False)),
                )
        else:
            Answer.objects.create(question=question, answer_text=song.title, is_correct=True)

        return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class ChangePasswordView(APIView):
    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({"error": "Brak zalogowanego użytkownika."}, status=status.HTTP_401_UNAUTHORIZED)
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        if not old_password or not new_password:
            return Response({"error": "Stare i nowe hasło są wymagane."}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(old_password):
            return Response({"error": "Niepoprawne stare hasło."}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(new_password, user=request.user)
        except ValidationError as e:
            return Response({"error": e.messages}, status=status.HTTP_400_BAD_REQUEST)
            
        request.user.set_password(new_password)
        request.user.save()
        
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, request.user)
        return Response({"message": "Hasło zostało pomyślnie zmienione."})


class DeleteAccountView(APIView):
    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({"error": "Brak zalogowanego użytkownika."}, status=status.HTTP_401_UNAUTHORIZED)
        password = request.data.get("password")
        if not password:
            return Response({"error": "Hasło jest wymagane w celu usunięcia konta."}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(password):
            return Response({"error": "Niepoprawne hasło."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        logout(request)
        user.delete()
        return Response({"message": "Konto zostało usunięte."}, status=status.HTTP_204_NO_CONTENT)
