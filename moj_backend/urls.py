from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from projekt_muzyka import views as music_views  # Importujemy widoki z naszej aplikacji

urlpatterns = [
    # Adres główny strony
    path('', music_views.home, name='home'),
    
    # Panel admina
    path('admin/', admin.site.urls),
    
    # Nasze API
    path('api/', include('projekt_muzyka.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
