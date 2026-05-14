from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Quiz, Question, Answer, UserScore
from .serializers import QuizSerializer, QuestionSerializer, UserScoreSerializer
from . import music_api
import random

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

class QuizList(generics.ListCreateAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer

class QuizDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer

class QuestionList(generics.ListCreateAPIView):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer

class QuestionDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer

class UserScoreList(generics.ListCreateAPIView):
    queryset = UserScore.objects.all()
    serializer_class = UserScoreSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
