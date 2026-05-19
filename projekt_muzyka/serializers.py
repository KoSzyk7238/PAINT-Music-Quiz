from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils.text import slugify
from .models import Genre, Song, Quiz, Question, Answer, UserScore, GameSession, QuestionAttempt, UserProfile
from .apple_music import resolve_preview_url


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name", "slug"]

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = slugify(validated_data.get("name", ""))
        return super().create(validated_data)


class SongSerializer(serializers.ModelSerializer):
    genre = GenreSerializer(read_only=True)
    genre_id = serializers.PrimaryKeyRelatedField(source="genre", queryset=Genre.objects.all(), write_only=True, allow_null=True, required=False)

    class Meta:
        model = Song
        fields = [
            "id",
            "title",
            "artist",
            "genre",
            "genre_id",
            "apple_snippet_url",
            "audio_file",
            "release_year",
            "duration_seconds",
            "created_at",
        ]

class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'answer_text', 'is_correct']

class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)
    song = SongSerializer(read_only=True)
    song_id = serializers.PrimaryKeyRelatedField(source="song", queryset=Song.objects.all(), write_only=True, allow_null=True, required=False)
    audio_source_url = serializers.SerializerMethodField()
    audio_source_file = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id',
            'quiz',
            'song',
            'song_id',
            'question_text',
            'audio_url',
            'audio_file',
            'audio_source_url',
            'audio_source_file',
            'time_limit',
            'points',
            'min_points',
            'answers',
        ]

    def get_audio_source_url(self, obj):
        url = obj.audio_url
        if not url and obj.song and obj.song.apple_snippet_url:
            url = obj.song.apple_snippet_url

        if url:
            preview_url = resolve_preview_url(url)
            if preview_url:
                if not obj.audio_url and obj.song and obj.song.apple_snippet_url == url:
                    obj.song.apple_snippet_url = preview_url
                    obj.song.save(update_fields=['apple_snippet_url'])
                elif obj.audio_url == url:
                    obj.audio_url = preview_url
                    obj.save(update_fields=['audio_url'])
                return preview_url
        return url

    def get_audio_source_file(self, obj):
        file_obj = obj.audio_file or (obj.song.audio_file if obj.song else None)
        if not file_obj:
            return None
        try:
            return file_obj.url
        except ValueError:
            return None

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    genre = GenreSerializer(read_only=True)
    genre_id = serializers.PrimaryKeyRelatedField(source="genre", queryset=Genre.objects.all(), write_only=True, allow_null=True, required=False)
    stats = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'cover_image', 'genre', 'genre_id', 'difficulty', 'num_questions_to_ask', 'created_at', 'questions', 'stats']

    def get_stats(self, obj):
        sessions = obj.sessions.filter(finished_at__isnull=False)
        total_plays = sessions.count()
        if total_plays == 0:
            return {
                'total_plays': 0,
                'average_score_percent': 0.0,
                'average_time_seconds': 0.0,
                'dynamic_difficulty': obj.get_difficulty_display()
            }
        
        percentages = []
        times = []
        for s in sessions:
            q_count = s.total_questions if s.total_questions > 0 else s.attempts.count()
            if q_count > 0:
                max_possible = q_count * 3000
                percentages.append(min(100.0, (s.total_points / max_possible) * 100))
            if s.average_time_seconds:
                times.append(s.average_time_seconds)
                
        # Obliczanie mediany (statystycznego wyniku większości graczy)
        if percentages:
            percentages.sort()
            n = len(percentages)
            if n % 2 == 1:
                median_percent = percentages[n // 2]
            else:
                median_percent = (percentages[n // 2 - 1] + percentages[n // 2]) / 2.0
            avg_percent = round(median_percent, 1)
        else:
            avg_percent = 0.0
            
        avg_time = round(sum(times) / len(times), 1) if times else 0.0
        
        if avg_percent >= 75:
            dynamic_diff = 'Łatwy'
        elif avg_percent >= 45:
            dynamic_diff = 'Średni'
        else:
            dynamic_diff = 'Trudny'
            
        return {
            'total_plays': total_plays,
            'average_score_percent': avg_percent,
            'average_time_seconds': avg_time,
            'dynamic_difficulty': dynamic_diff
        }


class QuestionAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionAttempt
        fields = [
            "id",
            "session",
            "question",
            "selected_answer",
            "answer_text",
            "is_correct",
            "time_taken_seconds",
            "points_awarded",
            "created_at",
        ]


class GameSessionSerializer(serializers.ModelSerializer):
    attempts = QuestionAttemptSerializer(many=True, read_only=True)

    class Meta:
        model = GameSession
        fields = [
            "id",
            "user",
            "quiz",
            "started_at",
            "finished_at",
            "total_points",
            "correct_count",
            "total_questions",
            "total_time_seconds",
            "average_time_seconds",
            "attempts",
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")

    class Meta:
        model = UserProfile
        fields = [
            "user",
            "display_name",
            "avatar",
            "current_streak",
            "best_streak",
            "total_points",
            "games_played",
            "correct_answers",
            "total_answers",
            "total_time_seconds",
        ]
        read_only_fields = [
            "current_streak",
            "best_streak",
            "total_points",
            "games_played",
            "correct_answers",
            "total_answers",
            "total_time_seconds",
        ]


class UserPublicSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "profile"]

class UserScoreSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = UserScore
        fields = ['id', 'user', 'quiz', 'score', 'correct_count', 'total_questions', 'average_time_seconds', 'played_at']
