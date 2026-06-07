import re
from django.db.models import Count
from django.utils.text import slugify
from projekt_muzyka.models import Genre, Question

def get_main_category_name(apple_raw_genre):
    if not apple_raw_genre:
        return "Inne"
        
    # Replace special characters with spaces
    cleaned = re.sub(r'[/\\_,\-&]', ' ', apple_raw_genre.lower())
    # Remove other punctuation but keep letters, numbers and spaces
    cleaned = re.sub(r'[^a-z0-9\s]', '', cleaned)
    tokens = cleaned.split()
    
    normalized_raw = " " + " ".join(tokens) + " "
    
    # Priority keywords mapped to main categories
    KEYWORD_MAPPING = [
        ('punk', 'Rock'),
        ('metal', 'Rock'),
        ('grunge', 'Rock'),
        ('shoegaze', 'Rock'),
        ('hardcore', 'Rock'),
        ('trap', 'Rap & Hip-Hop'),
        ('drill', 'Rap & Hip-Hop'),
        ('grime', 'Rap & Hip-Hop'),
        ('reggaeton', 'Latino'),
        ('salsa', 'Latino'),
        ('bachata', 'Latino'),
        ('bossa', 'Latino'),
        ('samba', 'Latino'),
        ('cumbia', 'Latino'),
        ('synthpop', 'Pop'),
        ('electropop', 'Pop'),
        ('dancepop', 'Pop'),
        ('dance pop', 'Pop'),
        ('k pop', 'Pop'),
        ('kpop', 'Pop'),
        ('j pop', 'Pop'),
        ('jpop', 'Pop'),
        ('disco', 'Pop'),
        ('hip hop', 'Rap & Hip-Hop'),
        ('hiphop', 'Rap & Hip-Hop'),
        ('rap', 'Rap & Hip-Hop'),
        ('house', 'Electronic'),
        ('techno', 'Electronic'),
        ('electro', 'Electronic'),
        ('edm', 'Electronic'),
        ('dubstep', 'Electronic'),
        ('trance', 'Electronic'),
        ('synthwave', 'Electronic'),
        ('ambient', 'Electronic'),
        ('latin', 'Latino'),
        ('latino', 'Latino'),
        ('latina', 'Latino'),
        ('indie', 'Rock'),
        ('alternative', 'Rock'),
        ('alt', 'Rock'),
        ('rock', 'Rock'),
        ('electronic', 'Electronic'),
        ('dance', 'Electronic'),
        ('r b', 'R&B & Soul'),
        ('rnb', 'R&B & Soul'),
        ('r & b', 'R&B & Soul'),
        ('soul', 'R&B & Soul'),
        ('funk', 'R&B & Soul'),
        ('blues', 'R&B & Soul'),
        ('gospel', 'R&B & Soul'),
        ('jazz', 'Jazz'),
        ('classical', 'Classical'),
        ('orchestral', 'Classical'),
        ('symphony', 'Classical'),
        ('opera', 'Classical'),
        ('pop', 'Pop'),
    ]
    
    for keyword, category in KEYWORD_MAPPING:
        if f" {keyword} " in normalized_raw:
            return category
            
    return "Inne"


def update_quiz_genre(quiz):
    # Find all songs in the quiz's questions that have a category
    categories = (
        Question.objects.filter(quiz=quiz, song__category__isnull=False)
        .values('song__category')
        .annotate(count=Count('song__category'))
        .order_by('-count', 'song__category__name')
    )
    
    if categories:
        most_common_category_id = categories[0]['song__category']
        most_common_category = Genre.objects.get(pk=most_common_category_id)
        if quiz.genre != most_common_category:
            quiz.genre = most_common_category
            quiz.save(update_fields=['genre'])
    else:
        # Default fallback to "Inne" if there are no songs or no categories
        slug = slugify("Inne")
        inne_category = Genre.objects.filter(name__iexact="Inne").first()
        if not inne_category:
            inne_category = Genre.objects.filter(slug=slug).first()
        if not inne_category:
            inne_category = Genre.objects.create(name="Inne", slug=slug, is_category=True)
        elif not inne_category.is_category:
            inne_category.is_category = True
            inne_category.save(update_fields=['is_category'])
            
        if quiz.genre != inne_category:
            quiz.genre = inne_category
            quiz.save(update_fields=['genre'])
