import React from 'react';
import { Search, Star, Music, ChevronRight, Play, Flame, Trophy, Clock, Sparkles } from 'lucide-react';

export default function HomeView({
    apiDebug,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    quizzes,
    startSession
}) {
    const [activeHeroIndex, setActiveHeroIndex] = React.useState(0);
    const heroQuizzes = quizzes.slice(0, 5);

    React.useEffect(() => {
        if (heroQuizzes.length <= 1) return;
        const interval = setInterval(() => {
            setActiveHeroIndex(prev => (prev + 1) % heroQuizzes.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [heroQuizzes.length]);

    const allCategories = ['Wszystkie', ...new Set(quizzes.map(q => q.genre?.name).filter(Boolean))];

    // Helper for media URLs
    const getFullCoverUrl = (url) => {
        if (!url) return '';
        if (url.includes('localhost:8000')) {
            return url.replace('http://localhost:8000', '');
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
        const matchesCategory = selectedCategory === 'Wszystkie' || quiz.genre?.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Hero Quiz (featured) - take the first quiz
    const heroQuiz = quizzes.length > 0 ? quizzes[0] : null;

    // Row definitions
    const recommendedQuizzes = quizzes.slice(0, 6);
    const hardestQuizzes = quizzes.filter(q => q.difficulty === 'HARD');
    const normalQuizzes = quizzes.filter(q => q.difficulty === 'MEDIUM' || q.difficulty === 'EASY');

    const isFiltered = searchQuery || selectedCategory !== 'Wszystkie';

    const renderQuizCard = (quiz) => {
        const coverUrl = getFullCoverUrl(quiz.cover_image);
        const placeholderGrad = getPlaceholderGradient(quiz.title);

        return (
            <div 
                key={quiz.id} 
                onClick={() => startSession(quiz)}
                className="flex-shrink-0 w-80 group cursor-pointer relative rounded-2xl overflow-hidden border border-white/5 bg-gray-950 hover:border-green-500/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] transition-all duration-300 transform hover:-translate-y-2 hover:z-10"
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
                                {quiz.difficulty}
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
                            <Music size={12}/> {Math.min(quiz.questions?.length || 0, quiz.num_questions_to_ask || 10)} utworów
                        </span>
                        <span>
                            Graj teraz &rarr;
                        </span>
                    </div>
                </div>
            </div>
        );
    };

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                        <Flame className="text-green-500 animate-pulse" size={36} fill="currentColor" />
                        Jaki to sygnał?
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Wybierz quiz, posłuchaj dźwięków i zgadnij tytuł utworu!</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-stretch md:items-center">
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

                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center bg-gray-900/50 p-1.5 rounded-xl border border-gray-800/80">
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                                    selectedCategory === cat 
                                    ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
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
                        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden border border-white/5 bg-gray-950 shadow-2xl group">
                            {/* Slides Container */}
                            <div className="w-full h-full relative">
                                {heroQuizzes.map((quiz, idx) => {
                                    const isActive = idx === activeHeroIndex;
                                    const isPast = idx < activeHeroIndex;
                                    const coverUrl = getFullCoverUrl(quiz.cover_image);
                                    
                                    return (
                                        <div 
                                            key={quiz.id}
                                            onClick={() => startSession(quiz)}
                                            className={`absolute inset-0 w-full h-full cursor-pointer flex items-end transition-all duration-700 ease-in-out ${
                                                isActive 
                                                    ? 'opacity-100 translate-x-0 pointer-events-auto z-10' 
                                                    : isPast 
                                                    ? 'opacity-0 -translate-x-full pointer-events-none z-0' 
                                                    : 'opacity-0 translate-x-full pointer-events-none z-0'
                                            }`}
                                        >
                                            {/* Background Image / Gradient */}
                                            {coverUrl ? (
                                                <img 
                                                    src={coverUrl} 
                                                    alt={quiz.title} 
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-1000"
                                                />
                                            ) : (
                                                <div className={`absolute inset-0 bg-gradient-to-r ${getPlaceholderGradient(quiz.title)} group-hover:scale-[1.02] transition-transform duration-1000`}></div>
                                            )}

                                            {/* Cinematic Gradient Fade */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/45 to-transparent"></div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-transparent to-transparent"></div>

                                            {/* Hero Content */}
                                            <div className="relative z-10 p-8 md:p-12 max-w-2xl text-left w-full">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="bg-green-500 text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider shadow-lg shadow-green-500/20">
                                                        NAJPOPULARNIEJSZY QUIZ
                                                    </span>
                                                    <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider border border-white/10">
                                                        {quiz.genre?.name || 'Muzyczny'}
                                                    </span>
                                                </div>

                                                <h2 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight leading-none drop-shadow-md uppercase italic">
                                                    {quiz.title}
                                                </h2>

                                                <p className="text-gray-300 text-sm md:text-base line-clamp-3 mb-6 font-medium leading-relaxed drop-shadow">
                                                    {quiz.description || "Wciel się w rolę detektywa muzycznego i rozpoznaj najgorętsze hity po pierwszych sekundach nagrania!"}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-4">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startSession(quiz);
                                                        }}
                                                        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black uppercase px-6 py-3.5 rounded-xl transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95"
                                                    >
                                                        <Play fill="black" size={18} />
                                                        Zagraj teraz
                                                    </button>
                                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                                        Pytania: {Math.min(quiz.questions?.length || 0, quiz.num_questions_to_ask || 10)} &bull; {quiz.difficulty === 'EASY' ? 'Łatwy' : quiz.difficulty === 'HARD' ? 'Trudny' : 'Średni'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Dots Indicators */}
                            {heroQuizzes.length > 1 && (
                                <div className="absolute bottom-6 right-8 z-20 flex gap-2">
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

                    {/* Row 1: Najczęściej Polecane */}
                    {recommendedQuizzes.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <Star className="text-green-400" size={20} fill="currentColor" />
                                <h3 className="text-xl font-black text-white uppercase italic tracking-wide">Polecane wyzwania</h3>
                            </div>
                            <div className="flex gap-6 overflow-x-auto no-scrollbar pt-4 pb-4 snap-x">
                                {recommendedQuizzes.map(renderQuizCard)}
                            </div>
                        </div>
                    )}

                    {/* Row 2: Najtrudniejsze Wyzwania (HARD) */}
                    {hardestQuizzes.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="text-red-400" size={20} />
                                <h3 className="text-xl font-black text-white uppercase italic tracking-wide">Prawdziwy sprawdzian słuchu (Trudne)</h3>
                            </div>
                            <div className="flex gap-6 overflow-x-auto no-scrollbar pt-4 pb-4 snap-x">
                                {hardestQuizzes.map(renderQuizCard)}
                            </div>
                        </div>
                    )}

                    {/* Row 3: Standardowe Wyzwania */}
                    {normalQuizzes.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="text-yellow-400" size={20} />
                                <h3 className="text-xl font-black text-white uppercase italic tracking-wide">Rozgrzewka muzyczna (Łatwe / Średnie)</h3>
                            </div>
                            <div className="flex gap-6 overflow-x-auto no-scrollbar pt-4 pb-4 snap-x">
                                {normalQuizzes.map(renderQuizCard)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
