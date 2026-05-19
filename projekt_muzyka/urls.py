from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='auth-register'),
    path('auth/login/', views.LoginView.as_view(), name='auth-login'),
    path('auth/logout/', views.LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', views.MeView.as_view(), name='auth-me'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/delete-account/', views.DeleteAccountView.as_view(), name='auth-delete-account'),

    path('genres/', views.GenreList.as_view(), name='genre-list'),
    path('genres/<int:pk>/', views.GenreDetail.as_view(), name='genre-detail'),
    path('songs/', views.SongList.as_view(), name='song-list'),
    path('songs/<int:pk>/', views.SongDetail.as_view(), name='song-detail'),

    path('quizzes/', views.QuizList.as_view(), name='quiz-list'),
    path('quizzes/create-from-artist/', views.CreateQuizFromArtistView.as_view(), name='create-quiz-from-artist'),
    path('quizzes/<int:quiz_id>/add-song/', views.AddSongToQuizView.as_view(), name='quiz-add-song'),
    path('quizzes/<int:pk>/', views.QuizDetail.as_view(), name='quiz-detail'),
    path('questions/', views.QuestionList.as_view(), name='question-list'),
    path('questions/<int:pk>/', views.QuestionDetail.as_view(), name='question-detail'),
    path('answers/', views.AnswerList.as_view(), name='answer-list'),
    path('answers/<int:pk>/', views.AnswerDetail.as_view(), name='answer-detail'),
    path('scores/', views.UserScoreList.as_view(), name='userscore-list'),

    path('sessions/', views.GameSessionList.as_view(), name='session-list'),
    path('sessions/<int:pk>/', views.GameSessionDetail.as_view(), name='session-detail'),
    path('sessions/<int:session_id>/attempts/', views.GameSessionAttemptCreate.as_view(), name='session-attempts'),
    path('sessions/<int:session_id>/finish/', views.GameSessionFinish.as_view(), name='session-finish'),

    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),
    path('stats/', views.StatsView.as_view(), name='stats'),
]
