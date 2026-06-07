from django.apps import AppConfig

class ProjektMuzykaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'projekt_muzyka'

    def ready(self):
        import projekt_muzyka.signals
