import React from 'react';
import { Search, Star, Music, ChevronLeft, ChevronRight, Play, Flame, Trophy, Clock, Sparkles } from 'lucide-react';
import { pytaniaPlural } from '../utils/plurals';
import Carousel from './Carousel';

export default function HomeView({
    apiDebug,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    quizzes,
    isLoading,
    startSession,
    genres = []
}) {
    const [activeHeroIndex, setActiveHeroIndex] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const [isDraggingMove, setIsDraggingMove] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [dragOffset, setDragOffset] = React.useState(0);
    const [containerWidth, setContainerWidth] = React.useState(0);
    const containerRef = React.useRef(null);
    const heroQuizzes = quizzes.slice(0, 5);

    React.useEffect(() => {
        if (heroQuizzes.length <= 1 || isDragging) return;
        const interval = setInterval(() => {
            setActiveHeroIndex(prev => (prev + 1) % heroQuizzes.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [heroQuizzes.length, activeHeroIndex, isDragging]);

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click
        if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth);
        }
        setIsDragging(true);
        setIsDraggingMove(false);
        setStartX(e.clientX);
        setDragOffset(0);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const currentX = e.clientX;
        const diffX = currentX - startX;
        setDragOffset(diffX);
        if (Math.abs(diffX) > 10) {
            setIsDraggingMove(true);
        }
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        
        const threshold = 80;
        if (isDraggingMove && Math.abs(dragOffset) > threshold) {
            if (dragOffset < 0) {
                setActiveHeroIndex(prev => (prev + 1) % heroQuizzes.length);
            } else {
                setActiveHeroIndex(prev => (prev - 1 + heroQuizzes.length) % heroQuizzes.length);
            }
        }
        setDragOffset(0);
        setTimeout(() => setIsDraggingMove(false), 50);
    };

    const handleMouseLeave = () => {
        handleMouseUp();
    };

    const handleTouchStart = (e) => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth);
        }
        setIsDragging(true);
        setIsDraggingMove(false);
        setStartX(e.touches[0].clientX);
        setDragOffset(0);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        setDragOffset(diffX);
        if (Math.abs(diffX) > 10) {
            setIsDraggingMove(true);
        }
    };

    const handleTouchEnd = () => {
        handleMouseUp();
    };

    const categoriesRef = React.useRef(null);
    const [showLeftArrow, setShowLeftArrow] = React.useState(false);
    const [showRightArrow, setShowRightArrow] = React.useState(false);

    const allCategories = [
        'Wszystkie',
        ...genres.filter(g => g.name.toLowerCase() !== 'inne').map(g => g.name),
        ...genres.filter(g => g.name.toLowerCase() === 'inne').map(g => g.name)
    ];

    const checkScroll = () => {
        if (categoriesRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = categoriesRef.current;
            setShowLeftArrow(scrollLeft > 5);
            setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
        }
    };

    React.useEffect(() => {
        const timer = setTimeout(checkScroll, 100);
        window.addEventListener('resize', checkScroll);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScroll);
        };
    }, [allCategories.length, isLoading]);

    const scrollCategories = (direction) => {
        if (categoriesRef.current) {
            const scrollAmount = 200;
            categoriesRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Helper for media URLs
    const getFullCoverUrl = (url) => {
        if (!url) return '';
        const mediaIdx = url.indexOf('/media/');
        if (mediaIdx !== -1) {
            return url.substring(mediaIdx);
        }
        return url;
    };

    const getPlaceholderGradient = (title) => {
        const gradients = [
            'from-purple-900/60 via-indigo-950/40 to-black border-purple-500/10',
            'from-emerald-900/60 via-teal-950/40 to-black border-emerald-500/10',
            'from-rose-900/60 via-red-950/40 to-black border-rose-500/10',
            'from-amber-900/60 via-orange-950/40 to-black border-amber-500/10',
            'from-blue-900/60 via-cyan-950/40 to-black border-blue-500/10',
            'from-fuchsia-900/60 via-pink-950/40 to-black border-fuchsia-500/10'
        ];
        let sum = 0;
        for (let i = 0; i < title.length; i++) {
            sum += title.charCodeAt(i);
        }
        return gradients[sum % gradients.length];
    };

    // Filter logic
    const filteredQuizzes = quizzes.filter(quiz => {
        const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === 'Wszystkie' || 
                                (quiz.song_categories && quiz.song_categories.includes(selectedCategory)) ||
                                quiz.genre?.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Hero Quiz (featured) - take the first quiz
    const heroQuiz = quizzes.length > 0 ? quizzes[0] : null;

    // Intelligent Categories
    const trendingQuizzes = [...quizzes].sort((a, b) => (b.total_plays || 0) - (a.total_plays || 0)).slice(0, 12);
    const newQuizzes = [...quizzes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12);
    const hardestQuizzes = quizzes.filter(q => q.difficulty === 'HARD').slice(0, 12);
    const normalQuizzes = quizzes.filter(q => q.difficulty === 'MEDIUM' || q.difficulty === 'EASY').slice(0, 12);

    const isFiltered = searchQuery || selectedCategory !== 'Wszystkie';

    const renderSkeletonCard = (index) => (
        <div 
            key={`skeleton-card-${index}`} 
            className="w-full rounded-2xl border border-white/5 bg-gray-950 overflow-hidden"
        >
            <div className="aspect-[16/10] bg-gray-900/40 animate-pulse relative w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent"></div>
            </div>
            <div className="p-5 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="bg-gray-900/60 h-4 w-10 rounded animate-pulse"></div>
                        <div className="bg-gray-900/60 h-4 w-24 rounded animate-pulse"></div>
                    </div>
                    <div className="bg-gray-900/60 h-5 w-2/3 rounded animate-pulse mb-3"></div>
                    <div className="bg-gray-900/60 h-3 w-full rounded animate-pulse mb-1.5"></div>
                    <div className="bg-gray-900/60 h-3 w-5/6 rounded animate-pulse"></div>
                </div>
                
                <div className="flex justify-between items-center mt-6 pt-3 border-t border-white/5">
                    <div className="bg-gray-900/60 h-3.5 w-14 rounded animate-pulse"></div>
                    <div className="bg-gray-900/60 h-3.5 w-16 rounded animate-pulse"></div>
                </div>
            </div>
        </div>
    );

    const renderSkeletonHero = () => (
        <div className="relative w-full h-[320px] sm:h-[400px] rounded-3xl overflow-hidden border border-white/5 bg-gray-950/40 shadow-2xl flex items-end p-6 sm:p-12 md:p-12 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-transparent to-transparent"></div>
            <div className="relative z-10 max-w-2xl text-left w-full">
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-5 w-32 bg-gray-900/80 rounded-md"></div>
                    <div className="h-5 w-20 bg-gray-900/80 rounded-md"></div>
                </div>
                <div className="h-10 w-2/3 bg-gray-900/80 rounded mb-4"></div>
                <div className="h-4 w-full bg-gray-900/80 rounded mb-2"></div>
                <div className="h-4 w-5/6 bg-gray-900/80 rounded mb-6"></div>
                <div className="flex items-center gap-4">
                    <div className="h-12 w-36 bg-gray-900/80 rounded-xl"></div>
                    <div className="h-4 w-28 bg-gray-900/80 rounded"></div>
                </div>
            </div>
        </div>
    );

    const renderQuizCard = (quiz) => {
        const coverUrl = getFullCoverUrl(quiz.cover_image);
        const placeholderGrad = getPlaceholderGradient(quiz.title);

        return (
            <div 
                key={quiz.id} 
                onClick={() => startSession(quiz)}
                className="w-full group cursor-pointer relative rounded-2xl overflow-hidden border border-white/5 bg-gray-950 hover:border-green-500/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] transition-all duration-300 transform hover:-translate-y-2 hover:z-20"
            >
                {/* Aspect ratio box for Netflix look */}
                <div className="aspect-[16/10] relative w-full overflow-hidden">
                    {coverUrl ? (
                        <img 
                            src={coverUrl} 
                            alt={quiz.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${placeholderGrad} flex flex-col justify-between p-6 relative overflow-hidden`}>
                            {/* Graphic elements inside placeholder */}
                            <div className="absolute -right-10 -bottom-10 opacity-10 text-white transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                                <Music size={120} />
                            </div>
                            <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-green-400 self-start">
                                {quiz.genre?.name || 'Muzyczny'}
                            </div>
                            <div className="text-xl font-black text-white leading-tight line-clamp-2">
                                {quiz.title}
                            </div>
                        </div>
                    )}
                    
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent"></div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-green-500 text-black p-4 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <Play fill="black" size={24} className="ml-1" />
                        </div>
                    </div>
                </div>

                {/* Card Details */}
                <div className="p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="bg-gray-900 border border-gray-800 text-gray-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                                {quiz.genre?.name || 'Mix'}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                                quiz.difficulty === 'EASY' ? 'text-green-400' : quiz.difficulty === 'HARD' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                                {quiz.difficulty === 'EASY' ? 'Łatwy' : quiz.difficulty === 'HARD' ? 'Trudny' : 'Średni'} &bull; {pytaniaPlural(Math.min(quiz.questions_count || quiz.questions?.length || 0, quiz.num_questions_to_ask || 10))}
                            </span>
                        </div>
                        {coverUrl && (
                            <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors line-clamp-1 mb-1">
                                {quiz.title}
                            </h3>
                        )}
                        <p className="text-gray-500 text-xs line-clamp-2 min-h-[2rem]">
                            {quiz.description || "Brak dodatkowego opisu wyzwania."}
                        </p>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-4 pt-3 border-t border-white/5">
                        <span className="flex items-center gap-1">
                            <Music size={12}/> {pytaniaPlural(Math.min(quiz.questions_count || quiz.questions?.length || 0, quiz.num_questions_to_ask || 10))}
                        </span>
                        <span>
                            Graj teraz &rarr;
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col w-full max-w-7xl mx-auto pb-24 px-4 animate-in fade-in duration-300">
                <style>{`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>

                {/* Nagłówek z wyszukiwarką */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-800 tracking-tight uppercase italic flex items-center gap-3">
                            <Flame className="text-gray-800" size={36} fill="currentColor" />
                            Jaki to sygnał?
                        </h1>
                        <div className="h-4 w-64 bg-gray-900/60 rounded mt-2 animate-pulse"></div>
                    </div>

                    <div className="relative w-full md:w-80 h-11 bg-gray-900/60 rounded-xl animate-pulse"></div>
                </div>

                {/* Pasek gatunków - szkielet szeroki na całą stronę */}
                <div className="relative w-full mb-12 bg-gray-900/40 p-2 rounded-2xl border border-gray-850/60 h-14 animate-pulse flex gap-2 items-center overflow-hidden">
                    <div className="h-8 w-24 bg-gray-900/60 rounded-xl"></div>
                    <div className="h-8 w-20 bg-gray-900/60 rounded-xl"></div>
                    <div className="h-8 w-28 bg-gray-900/60 rounded-xl"></div>
                    <div className="h-8 w-16 bg-gray-900/60 rounded-xl"></div>
                    <div className="h-8 w-32 bg-gray-900/60 rounded-xl"></div>
                    <div className="h-8 w-24 bg-gray-900/60 rounded-xl"></div>
                </div>

                <div className="flex flex-col gap-12">
                    {renderSkeletonHero()}

                    <div className="flex flex-col gap-4">
                        <div className="h-6 w-44 bg-gray-900/60 rounded animate-pulse mb-2"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4 pb-4">
                            {[1, 2, 3, 4].map(renderSkeletonCard)}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="h-6 w-60 bg-gray-900/60 rounded animate-pulse mb-2"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4 pb-4">
                            {[5, 6, 7, 8].map(renderSkeletonCard)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full max-w-7xl mx-auto pb-24 px-4">
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {apiDebug && (
                <div className="bg-red-900/50 border-l-4 border-red-500 p-4 mb-8 w-full text-left font-mono text-sm text-red-200 rounded-r-xl">
                    <strong>Błąd komunikacji z serwerem:</strong><br />
                    {apiDebug}
                </div>
            )}

            {/* Nagłówek z wyszukiwarką */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                        <Flame className="text-green-500 animate-pulse" size={36} fill="currentColor" />
                        Jaki to sygnał?
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Wybierz quiz, posłuchaj dźwięków i zgadnij tytuł utworu!</p>
                </div>

                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="text-gray-500" size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Szukaj quizu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-900/90 border border-gray-800 focus:border-green-500 text-white pl-11 pr-4 py-3 text-sm rounded-xl outline-none transition-all shadow-lg focus:ring-2 focus:ring-green-500/20"
                    />
                </div>
            </div>

            {/* Pasek gatunków - szeroki na całą stronę z przyciskami przewijania */}
            <div className="relative w-full mb-12 group/categories">
                {showLeftArrow && (
                    <button 
                        onClick={() => scrollCategories('left')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-gray-950/90 hover:bg-green-500 hover:text-black border border-white/10 hover:border-green-500 text-gray-400 p-2.5 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 animate-in fade-in duration-200"
                        title="Przewiń w lewo"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
                
                <div 
                    ref={categoriesRef}
                    onScroll={checkScroll}
                    className="flex gap-2 overflow-x-auto no-scrollbar items-center bg-gray-900/40 p-2 rounded-2xl border border-gray-850/60 w-full scroll-smooth"
                >
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                                selectedCategory === cat 
                                ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50 hover:scale-102'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {showRightArrow && (
                    <button 
                        onClick={() => scrollCategories('right')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-gray-950/90 hover:bg-green-500 hover:text-black border border-white/10 hover:border-green-500 text-gray-400 p-2.5 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 animate-in fade-in duration-200"
                        title="Przewiń w prawo"
                    >
                        <ChevronRight size={16} />
                    </button>
                )}
            </div>

            {/* Widok filtrowany (Wyszukiwanie / Kategoria) */}
            {isFiltered ? (
                <div>
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-wide">
                            Wyniki dla: {searchQuery ? `"${searchQuery}"` : selectedCategory}
                        </h2>
                        <span className="text-gray-500 text-xs font-bold uppercase">{filteredQuizzes.length} Pasujących</span>
                    </div>

                    {filteredQuizzes.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredQuizzes.map(renderQuizCard)}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-gray-950/40 rounded-3xl border border-dashed border-gray-800">
                            <span className="text-lg font-bold text-gray-500 uppercase tracking-widest block mb-2">Brak wyników wyszukiwania</span>
                            <span className="text-gray-600 text-xs">Spróbuj wpisać inną nazwę lub zmień kategorię</span>
                        </div>
                    )}
                </div>
            ) : (
                /* Widok domyślny - Premium Netflix Style */
                <div className="flex flex-col gap-12">
                    {/* Hero Section Banner (Slideshow Carousel) */}
                    {heroQuizzes.length > 0 && (
                        <div 
                            ref={containerRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                            className="relative w-full h-[320px] sm:h-[400px] rounded-3xl overflow-hidden border border-white/5 bg-gray-950 shadow-2xl group select-none isolate"
                        >
                            {/* Slides Container */}
                            <div className="w-full h-full relative">
                                {heroQuizzes.map((quiz, idx) => {
                                    const isActive = idx === activeHeroIndex;
                                    const isPast = idx < activeHeroIndex;
                                    const coverUrl = getFullCoverUrl(quiz.cover_image);
                                    
                                    let slideStyle = {};
                                    let transitionClass = "transition-all duration-700 ease-in-out";
                                    let visibilityClass = "";

                                    if (isDragging && isDraggingMove && containerWidth > 0) {
                                        transitionClass = ""; // turn off CSS transition during drag
                                        const nextIdx = (activeHeroIndex + 1) % heroQuizzes.length;
                                        const prevIdx = (activeHeroIndex - 1 + heroQuizzes.length) % heroQuizzes.length;
                                        
                                        if (isActive) {
                                            slideStyle = {
                                                transform: `translateX(${dragOffset}px)`,
                                                opacity: 1 - Math.min(Math.abs(dragOffset) / containerWidth, 0.8),
                                                pointerEvents: 'none',
                                                zIndex: 10,
                                            };
                                        } else if (dragOffset < 0 && idx === nextIdx) {
                                            slideStyle = {
                                                transform: `translateX(${containerWidth + dragOffset}px)`,
                                                opacity: Math.min(Math.abs(dragOffset) / containerWidth, 1),
                                                pointerEvents: 'none',
                                                zIndex: 10,
                                            };
                                        } else if (dragOffset > 0 && idx === prevIdx) {
                                            slideStyle = {
                                                transform: `translateX(${-containerWidth + dragOffset}px)`,
                                                opacity: Math.min(Math.abs(dragOffset) / containerWidth, 1),
                                                pointerEvents: 'none',
                                                zIndex: 10,
                                            };
                                        } else {
                                            slideStyle = {
                                                transform: isPast ? 'translateX(-100%)' : 'translateX(100%)',
                                                opacity: 0,
                                                pointerEvents: 'none',
                                                zIndex: 0,
                                            };
                                        }
                                    } else {
                                        visibilityClass = isActive 
                                            ? 'opacity-100 translate-x-0 pointer-events-auto z-10' 
                                            : isPast 
                                            ? 'opacity-0 -translate-x-full pointer-events-none z-0' 
                                            : 'opacity-0 translate-x-full pointer-events-none z-0';
                                    }
                                    
                                    return (
                                        <div 
                                            key={quiz.id}
                                            onClick={(e) => {
                                                if (isDraggingMove) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                startSession(quiz);
                                            }}
                                            style={slideStyle}
                                            className={`absolute inset-0 w-full h-full cursor-pointer flex items-end rounded-3xl overflow-hidden ${transitionClass} ${visibilityClass}`}
                                        >
                                            {/* Background Image / Gradient */}
                                            {coverUrl ? (
                                                <img 
                                                    src={coverUrl} 
                                                    alt={quiz.title} 
                                                    draggable="false"
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-1000 select-none"
                                                />
                                            ) : (
                                                <div className={`absolute inset-0 bg-gradient-to-r ${getPlaceholderGradient(quiz.title)} group-hover:scale-[1.02] transition-transform duration-1000`}></div>
                                            )}

                                            {/* Cinematic Gradient Fade */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/45 to-transparent"></div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-transparent to-transparent"></div>

                                            {/* Hero Content */}
                                            <div className="relative z-10 p-6 sm:p-8 md:p-12 max-w-2xl text-left w-full">
                                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                                    <span className="bg-green-500 text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider shadow-lg shadow-green-500/20">
                                                        NAJPOPULARNIEJSZY QUIZ
                                                    </span>
                                                    <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider border border-white/10">
                                                        {quiz.genre?.name || 'Muzyczny'}
                                                    </span>
                                                </div>

                                                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-2 sm:mb-3 tracking-tight leading-none drop-shadow-md uppercase italic">
                                                    {quiz.title}
                                                </h2>

                                                <p className="text-gray-300 text-xs sm:text-sm md:text-base line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-6 font-medium leading-relaxed drop-shadow">
                                                    {quiz.description || "Wciel się w rolę detektywa muzycznego i rozpoznaj najgorętsze hity po pierwszych sekundach nagrania!"}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isDraggingMove) return;
                                                            startSession(quiz);
                                                        }}
                                                        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black uppercase px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-xl transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95 text-sm sm:text-base"
                                                    >
                                                        <Play fill="black" size={16} className="sm:w-[18px] sm:h-[18px]" />
                                                        Zagraj teraz
                                                    </button>
                                                    <div className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest">
                                                        Pytania: {Math.min(quiz.questions_count || quiz.questions?.length || 0, quiz.num_questions_to_ask || 10)} &bull; {quiz.difficulty === 'EASY' ? 'Łatwy' : quiz.difficulty === 'HARD' ? 'Trudny' : 'Średni'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Left/Right Chevrons */}
                            {heroQuizzes.length > 1 && (
                                <>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveHeroIndex(prev => (prev - 1 + heroQuizzes.length) % heroQuizzes.length);
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-gray-950/90 hover:bg-green-500 hover:text-black border border-white/10 hover:border-green-500 text-white p-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all duration-300 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                                        title="Poprzedni slajd"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveHeroIndex(prev => (prev + 1) % heroQuizzes.length);
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-gray-950/90 hover:bg-green-500 hover:text-black border border-white/10 hover:border-green-500 text-white p-3 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all duration-300 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                                        title="Następny slajd"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </>
                            )}

                            {/* Dots Indicators */}
                            {heroQuizzes.length > 1 && (
                                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-20 flex gap-2">
                                    {heroQuizzes.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveHeroIndex(idx);
                                            }}
                                            className={`h-2.5 rounded-full transition-all duration-300 ${
                                                idx === activeHeroIndex 
                                                    ? 'w-8 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' 
                                                    : 'w-2.5 bg-white/30 hover:bg-white/60'
                                            }`}
                                            title={`Slajd ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Baner Losowego Quizu na żądanie */}
                    <div 
                        onClick={() => startSession({ id: 'random', title: 'Losowy Quiz', isRandomQuizPlaceholder: true })}
                        className="w-full relative rounded-3xl overflow-hidden border border-green-500/20 bg-gradient-to-r from-green-950/40 via-gray-900/60 to-black p-8 sm:p-10 cursor-pointer group hover:border-green-500/40 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] transition-all duration-300 transform hover:-translate-y-1"
                    >
                        {/* Glow effect */}
                        <div className="absolute right-0 top-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-green-500/10 transition-colors duration-500"></div>
                        <div className="absolute -left-10 -bottom-10 opacity-5 text-white transform rotate-12 group-hover:scale-105 transition-transform duration-500">
                            <Sparkles size={180} className="text-green-500" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="text-left">
                                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                                    <Sparkles className="text-green-400 animate-pulse" size={24} fill="currentColor" />
                                    Losowy Quiz
                                </h2>
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startSession({ id: 'random', title: 'Losowy Quiz', isRandomQuizPlaceholder: true });
                                }}
                                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black uppercase px-6 py-3.5 rounded-2xl transition-all shadow-[0_10px_20px_rgba(34,197,94,0.2)] hover:scale-105 active:scale-95 text-sm sm:text-base self-start md:self-center"
                            >
                                <Play fill="black" size={16} />
                                Zagraj
                            </button>
                        </div>
                    </div>

                    {/* Netflix-style Carousels */}
                    {trendingQuizzes.length > 0 && (
                        <Carousel title="Na czasie (Popularne)" icon={Flame}>
                            {trendingQuizzes.map(renderQuizCard)}
                        </Carousel>
                    )}

                    {newQuizzes.length > 0 && (
                        <Carousel title="Nowości" icon={Star}>
                            {newQuizzes.map(renderQuizCard)}
                        </Carousel>
                    )}

                    {hardestQuizzes.length > 0 && (
                        <Carousel title="Prawdziwy sprawdzian słuchu (Trudne)" icon={Trophy}>
                            {hardestQuizzes.map(renderQuizCard)}
                        </Carousel>
                    )}

                    {normalQuizzes.length > 0 && (
                        <Carousel title="Rozgrzewka muzyczna (Łatwe / Średnie)" icon={Sparkles}>
                            {normalQuizzes.map(renderQuizCard)}
                        </Carousel>
                    )}
                </div>
            )}
        </div>
    );
}
