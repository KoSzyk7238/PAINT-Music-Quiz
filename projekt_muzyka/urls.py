from django.urls import path
from . import views

urlpatterns = [
    path('quizzes/', views.QuizList.as_view(), name='quiz-list'),
    path('quizzes/create-from-artist/', views.CreateQuizFromArtistView.as_view(), name='create-quiz-from-artist'),
    path('quizzes/<int:pk>/', views.QuizDetail.as_view(), name='quiz-detail'),
    path('questions/', views.QuestionList.as_view(), name='question-list'),
    path('questions/<int:pk>/', views.QuestionDetail.as_view(), name='question-detail'),
    path('scores/', views.UserScoreList.as_view(), name='userscore-list'),
]
