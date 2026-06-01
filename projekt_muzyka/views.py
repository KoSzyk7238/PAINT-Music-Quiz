from django.http import HttpResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Count, Q, Case, When, Value, IntegerField
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
    QuizListSerializer,
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
import unicodedata
import re
import difflib


def normalize_text(text):
    if not text:
        return ""
    text = text.lower()
    
    # Polish characters manual mapping
    polish_map = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'a', 'Ć': 'c', 'Ę': 'e', 'Ł': 'l', 'Ń': 'n', 'Ó': 'o', 'Ś': 's', 'Ź': 'z', 'Ż': 'z'
    }
    for k, v in polish_map.items():
        text = text.replace(k, v)
        
    # Decompose unicode to strip other diacritics
    text = ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )
    return text


def clean_song_title(text):
    text = normalize_text(text)
    
    # Unify brackets to parentheses
    text = text.replace('[', '(').replace(']', ')')
    
    # Strip parenthetical annotations containing feature/remix etc.
    keywords = ['feat', 'ft', 'featuring', 'with', 'remix', 'remaster', 'live', 'single', 'edit', 'version', 'cover', 'acoustic']
    for kw in keywords:
        pattern = r'\([^)]*' + re.escape(kw) + r'[^)]*\)'
        text = re.sub(pattern, '', text)
        
    # Also strip dash annotations containing features/remix etc.
    for kw in keywords:
        pattern = r'\s*-\s*[^-$]*' + re.escape(kw) + r'[^-$]*'
        text = re.sub(pattern, '', text)
        
    # Strip any trailing/leading whitespace and double spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def strip_all_non_alphanumeric(text):
    return re.sub(r'[^a-z0-9]', '', text)


def is_similar_answer(user_ans, correct_ans):
    if not user_ans or not correct_ans:
        return False
        
    norm_user = normalize_text(user_ans).strip()
    norm_correct = normalize_text(correct_ans).strip()
    
    if norm_user == norm_correct:
        return True
        
    alpha_user = strip_all_non_alphanumeric(norm_user)
    alpha_correct = strip_all_non_alphanumeric(norm_correct)
    
    if alpha_user and alpha_correct and alpha_user == alpha_correct:
        return True
        
    clean_user = clean_song_title(user_ans)
    clean_correct = clean_song_title(correct_ans)
    
    if clean_user == clean_correct:
        return True
        
    alpha_clean_user = strip_all_non_alphanumeric(clean_user)
    alpha_clean_correct = strip_all_non_alphanumeric(clean_correct)
    
    if alpha_clean_user and alpha_clean_correct and alpha_clean_user == alpha_clean_correct:
        return True
        
    if len(clean_correct) >= 4:
        ratio = difflib.SequenceMatcher(None, clean_user, clean_correct).ratio()
        if ratio >= 0.85:
            return True
            
        ratio_alpha = difflib.SequenceMatcher(None, alpha_clean_user, alpha_clean_correct).ratio()
        if ratio_alpha >= 0.85:
            return True
            
    return False


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


def associate_session_with_user(user, session_id):
    if not session_id:
        return
    try:
        session = GameSession.objects.get(pk=session_id, user__isnull=True)
        session.user = user
        session.save(update_fields=["user"])

        # Update or create UserScore
        score, score_created = UserScore.objects.get_or_create(
            session=session,
            defaults={
                "user": user,
                "quiz": session.quiz,
                "score": session.total_points,
                "correct_count": session.correct_count,
                "total_questions": session.total_questions,
                "average_time_seconds": session.average_time_seconds,
            }
        )
        if not score_created:
            score.user = user
            score.save(update_fields=["user"])

        # Also update UserProfile stats
        profile = get_or_create_profile(user)
        profile.games_played += 1
        
        # Re-play attempts on the profile to accumulate stats
        attempts = session.attempts.order_by('created_at')
        for att in attempts:
            profile.total_answers += 1
            profile.total_time_seconds += att.time_taken_seconds
            if att.is_correct:
                profile.correct_answers += 1
                profile.total_points += att.points_awarded
                profile.current_streak += 1
                profile.best_streak = max(profile.best_streak, profile.current_streak)
            else:
                profile.current_streak = 0
                
        profile.save()
    except GameSession.DoesNotExist:
        pass


class RegisterView(APIView):
    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")
        display_name = request.data.get("display_name")
        session_id = request.data.get("session_id")

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
        if session_id:
            associate_session_with_user(user, session_id)
        return Response(UserPublicSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")
        session_id = request.data.get("session_id")

        if not username or not password:
            return Response({"error": "Username i haslo sa wymagane."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({"error": "Niepoprawne dane logowania."}, status=status.HTTP_400_BAD_REQUEST)

        login(request, user)
        if session_id:
            associate_session_with_user(user, session_id)
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
    serializer_class = GenreSerializer

    def get_queryset(self):
        show_categories = self.request.query_params.get("show_categories") == "true"
        if show_categories:
            return Genre.objects.filter(is_category=True).annotate(songs_count=Count('category_songs')).order_by('name')
        return Genre.objects.annotate(songs_count=Count('songs')).order_by('name')


class GenreDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer


class SongList(generics.ListCreateAPIView):
    serializer_class = SongSerializer

    def get_queryset(self):
        queryset = Song.objects.select_related('genre').all()
        genre_id = self.request.query_params.get("genre_id")
        if genre_id:
            queryset = queryset.filter(genre_id=genre_id)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(artist__icontains=search))
            queryset = queryset.annotate(
                relevance=Case(
                    When(title__istartswith=search, then=Value(1)),
                    When(artist__istartswith=search, then=Value(2)),
                    default=Value(3),
                    output_field=IntegerField(),
                )
            ).order_by('relevance', 'title')
        limit = self.request.query_params.get("limit")
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass
        return queryset


class SongDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Song.objects.all()
    serializer_class = SongSerializer

class QuizList(generics.ListCreateAPIView):
    serializer_class = QuizListSerializer

    def get_queryset(self):
        return Quiz.objects.select_related('genre').prefetch_related(
            'questions__song__category'
        ).annotate(
            questions_count=Count('questions', distinct=True),
            total_plays=Count('sessions', filter=Q(sessions__finished_at__isnull=False), distinct=True)
        ).filter(is_random=False).all()

class QuizDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Quiz.objects.prefetch_related('sessions', 'sessions__attempts', 'questions', 'questions__answers', 'questions__song', 'questions__song__genre', 'genre').all()
    serializer_class = QuizSerializer


class CreateRandomQuizView(APIView):
    def post(self, request, *args, **kwargs):
        genre_id = request.data.get("genre_id")
        genre_ids = request.data.get("genre_ids")
        difficulty = request.data.get("difficulty", "MEDIUM")
        num_questions = request.data.get("num_questions", 10)
        
        try:
            num_questions = int(num_questions)
        except (ValueError, TypeError):
            num_questions = 10

        # Get or create the permanent random quiz
        quiz, created = Quiz.objects.get_or_create(
            title="Losowy Quiz",
            is_random=True,
            defaults={
                "description": "Losowy quiz generowany na zawołanie.",
                "difficulty": difficulty,
                "num_questions_to_ask": num_questions,
                "time_limit": 15,
            }
        )

        songs_qs = Song.objects.all()

        selected_genre_ids = []
        if isinstance(genre_ids, list):
            for gid in genre_ids:
                try:
                    selected_genre_ids.append(int(gid))
                except (ValueError, TypeError):
                    pass
        elif genre_ids:
            try:
                selected_genre_ids.append(int(genre_ids))
            except (ValueError, TypeError):
                pass

        if not selected_genre_ids and genre_id:
            try:
                selected_genre_ids.append(int(genre_id))
            except (ValueError, TypeError):
                pass

        if selected_genre_ids:
            songs_qs = songs_qs.filter(category_id__in=selected_genre_ids)

        songs_list = list(songs_qs)
        if not songs_list:
            return Response(
                {"error": "Nie znaleziono piosenek spełniających kryteria."},
                status=status.HTTP_400_BAD_REQUEST
            )

        actual_num_questions = min(num_questions, len(songs_list))
        selected_songs = random.sample(songs_list, actual_num_questions)

        new_questions = []
        for song in selected_songs:
            question, q_created = Question.objects.get_or_create(
                quiz=quiz,
                song=song,
                defaults={
                    "question_text": "Zgadnij tytuł tej piosenki",
                    "points": 1,
                    "min_points": 0,
                }
            )
            if q_created:
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
            new_questions.append(question)

        serializer = QuizSerializer(quiz)
        data = serializer.data
        data['questions'] = QuestionSerializer(new_questions, many=True).data
        data['difficulty'] = difficulty
        data['num_questions_to_ask'] = actual_num_questions

        return Response(data, status=status.HTTP_201_CREATED)

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
        elif answer_text is not None:
            normalized = str(answer_text).strip()
            correct_titles = list(question.answers.filter(is_correct=True).values_list('answer_text', flat=True))
            if question.song and question.song.title:
                correct_titles.append(question.song.title)
            
            is_correct = False
            for correct_title in correct_titles:
                if is_similar_answer(normalized, correct_title):
                    is_correct = True
                    break
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
            
            session_time_limit = GameSession.DIFFICULTY_TIME_MAP.get(session.chosen_difficulty, 15)
            base_points = calculate_time_score(question.points, question.min_points, time_taken_seconds, session_time_limit)
            
            # Difficulty multipliers to reward harder games with more points
            diff_multipliers = {
                'EASY': 1.0,
                'MEDIUM': 1.5,
                'HARD': 2.0,
            }
            difficulty_multiplier = diff_multipliers.get(session.chosen_difficulty, 1.5)
            
            bonus_multiplier = 1.0 + min(consecutive_correct * 0.1, 1.0)
            points_awarded = int(base_points * bonus_multiplier * difficulty_multiplier)

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
        limit = int(request.query_params.get("limit", 50))
        leaderboard_type = request.query_params.get("type", "global")
        
        if leaderboard_type == "quiz":
            quiz_id = request.query_params.get("quiz_id")
            if not quiz_id:
                return Response({"error": "Parametr quiz_id jest wymagany dla rankingu quizu."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Fetch all user scores for this quiz for registered users, sorted by score desc, then by average time asc
            scores = UserScore.objects.filter(quiz_id=quiz_id, user__isnull=False).select_related('user', 'user__profile').order_by('-score', 'average_time_seconds')
            
            # Deduplicate by user to keep their highest score
            seen_users = set()
            deduped_scores = []
            for s in scores:
                if s.user_id not in seen_users:
                    seen_users.add(s.user_id)
                    deduped_scores.append(s)
            
            # Slice to limit
            deduped_scores = deduped_scores[:limit]
            
            data = []
            for idx, s in enumerate(deduped_scores, start=1):
                data.append({
                    "rank": idx,
                    "username": s.user.username,
                    "display_name": s.user.profile.display_name or s.user.username,
                    "points": s.score,
                    "correct_count": s.correct_count,
                    "total_questions": s.total_questions,
                    "average_time_seconds": round(s.average_time_seconds, 2),
                    "avatar": s.user.profile.avatar.url if s.user.profile.avatar else None,
                })
            return Response(data)
            
        else:
            # Global leaderboard
            sort_by = request.query_params.get("sort", "points")
            profiles = UserProfile.objects.select_related("user").all()
            
            # Convert to list of dictionaries with calculated accuracy
            profile_list = []
            for p in profiles:
                acc = (p.correct_answers / p.total_answers * 100) if p.total_answers else 0
                profile_list.append({
                    "username": p.user.username,
                    "display_name": p.display_name or p.user.username,
                    "points": p.total_points,
                    "streak": p.best_streak,
                    "current_streak": p.current_streak,
                    "games_played": p.games_played,
                    "accuracy": round(acc, 1),
                    "avatar": p.avatar.url if p.avatar else None,
                })
            
            # Sort list in Python
            if sort_by == "streak":
                profile_list.sort(key=lambda x: (-x["streak"], -x["points"]))
            elif sort_by == "accuracy":
                profile_list.sort(key=lambda x: (-x["accuracy"], -x["points"]))
            elif sort_by == "games":
                profile_list.sort(key=lambda x: (-x["games_played"], -x["points"]))
            else: # points
                profile_list.sort(key=lambda x: (-x["points"], -x["streak"]))
                
            # Slice and assign ranks
            sliced_profiles = profile_list[:limit]
            for idx, p in enumerate(sliced_profiles, start=1):
                p["rank"] = idx
                
            return Response(sliced_profiles)


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

class ArtistSearchView(APIView):
    """Podpowiedzi nazw artystów z MusicBrainz (dla formularza quizu o artyście)."""

    def get(self, request, *args, **kwargs):
        query = (request.query_params.get('q') or '').strip()
        if len(query) < 2:
            return Response([])

        artists = music_api.search_artist(query, limit=10)
        results = [
            {"id": artist.get("id"), "name": artist.get("name")}
            for artist in artists
            if artist.get("name")
        ]
        return Response(results)


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
