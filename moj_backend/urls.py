from django.contrib import admin
from django.urls import path, include
from projekt_muzyka import views as music_views  # Importujemy widoki z naszej aplikacji

urlpatterns = [
    # Adres główny strony
    path('', music_views.home, name='home'),
    
    # Panel admina
    path('admin/', admin.site.urls),
    
    # Nasze API
    path('api/', include('projekt_muzyka.urls')),
]
