from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.utils.text import slugify
from projekt_muzyka.models import Song, Question, Genre
from projekt_muzyka.utils import get_main_category_name, update_quiz_genre

@receiver(pre_save, sender=Song)
def auto_classify_song(sender, instance, **kwargs):
    # 1. Fallback raw genre from the genre name if not provided
    if not instance.apple_raw_genre and instance.genre:
        instance.apple_raw_genre = instance.genre.name

    # 2. Assign main category if it's not set
    if not instance.category and instance.apple_raw_genre:
        category_name = get_main_category_name(instance.apple_raw_genre)
        slug = slugify(category_name)
        
        # Safe lookup for main category Genre
        genre = Genre.objects.filter(name__iexact=category_name).first()
        if not genre:
            genre = Genre.objects.filter(slug=slug).first()
            
        if genre:
            if not genre.is_category:
                genre.is_category = True
                genre.save(update_fields=['is_category'])
        else:
            # Generate a non-colliding slug if necessary
            if Genre.objects.filter(slug=slug).exists():
                slug = f"{slug}-cat"
            genre = Genre.objects.create(name=category_name, slug=slug, is_category=True)
            
        instance.category = genre


@receiver(post_save, sender=Question)
def question_saved(sender, instance, **kwargs):
    if instance.quiz:
        update_quiz_genre(instance.quiz)


@receiver(post_delete, sender=Question)
def question_deleted(sender, instance, **kwargs):
    if instance.quiz:
        update_quiz_genre(instance.quiz)
