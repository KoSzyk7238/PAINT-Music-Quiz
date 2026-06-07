import React, { useEffect, useState } from 'react';
import { User, Trophy, Flame, Medal, Target, BarChart2, Zap, Music, Crown } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Friends() {
    const { showToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    
    // Advanced Leaderboard States
    const [leaderboardType, setLeaderboardType] = useState('global'); // 'global' | 'quiz'
    const [globalSort, setGlobalSort] = useState('points'); // 'points' | 'streak' | 'accuracy' | 'games'
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState(null);

    // Image fallback state
    const [imageErrors, setImageErrors] = useState({});

    const handleImageError = (id) => {
        setImageErrors(prev => ({ ...prev, [id]: true }));
    };

    // Helper for media URLs (removing Docker hostname so it resolves via browser/proxy)
    const getFullCoverUrl = (url) => {
        if (!url) return '';
        const mediaIdx = url.indexOf('/media/');
        if (mediaIdx !== -1) {
            return url.substring(mediaIdx);
        }
        return url;
    };

    useEffect(() => {
        const fetchQuizzesAndLeaderboard = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Fetch current user username if not available
                let currentUsername = currentUser;
                if (!currentUsername) {
                    try {
                        const userRes = await fetch('/api/auth/me/');
                        if (userRes.ok) {
                            const userData = await userRes.json();
                            currentUsername = userData.username;
                            setCurrentUser(userData.username);
                        }
                    } catch (err) {
                        console.warn("Not logged in or unable to fetch user:", err);
                    }
                }

                // 2. Fetch quizzes if not available
                let fetchedQuizzes = quizzes;
                if (quizzes.length === 0) {
                    const quizRes = await fetch('/api/quizzes/');
                    if (quizRes.ok) {
                        fetchedQuizzes = await quizRes.json();
                        if (!Array.isArray(fetchedQuizzes) && fetchedQuizzes.results) {
                            fetchedQuizzes = fetchedQuizzes.results;
                        }
                        setQuizzes(fetchedQuizzes);
                    }
                }

                // 3. Determine selected quiz id
                let quizId = selectedQuizId;
                if (leaderboardType === 'quiz' && !quizId && fetchedQuizzes.length > 0) {
                    quizId = fetchedQuizzes[0].id;
                    setSelectedQuizId(fetchedQuizzes[0].id);
                }

                // 4. Fetch leaderboard data
                let url = '/api/leaderboard/';
                if (leaderboardType === 'quiz') {
                    if (quizId) {
                        url += `?type=quiz&quiz_id=${quizId}`;
                    } else {
                        setUsers([]);
                        setLoading(false);
                        return;
                    }
                } else {
                    url += `?type=global&sort=${globalSort}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error('Nie udało się pobrać danych rankingu.');
                }
                const data = await res.json();
                
                const mappedUsers = data.map((u) => ({
                    rank: u.rank,
                    username: u.username,
                    name: u.display_name,
                    points: u.points,
                    streak: u.streak, // best streak from API
                    current_streak: u.current_streak,
                    games_played: u.games_played,
                    accuracy: u.accuracy,
                    correct_count: u.correct_count,
                    total_questions: u.total_questions,
                    average_time_seconds: u.average_time_seconds,
                    isMe: currentUsername === u.username,
                    avatar: u.avatar
                }));

                setUsers(mappedUsers);
            } catch (err) {
                const msg = err.message || 'Nie udało się załadować rankingu.';
                setError(msg);
                showToast(msg, 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzesAndLeaderboard();
    }, [leaderboardType, globalSort, selectedQuizId]);

    const getRankBadge = (rank) => {
        if (rank === 1) return <div className="text-yellow-400 flex items-center justify-center w-12 drop-shadow-[0_0_15px_rgba(234,179,8,0.9)] animate-bounce"><Crown size={36} /></div>;
        if (rank === 2) return <div className="text-gray-300 flex items-center justify-center w-12 drop-shadow-[0_0_10px_rgba(209,213,219,0.5)]"><Medal size={32} /></div>;
        if (rank === 3) return <div className="text-amber-600 flex items-center justify-center w-12"><Medal size={32} /></div>;
        return <div className="text-gray-600 font-black text-2xl flex items-center justify-center w-12">#{rank}</div>;
    };

    const getRowStyle = (rank, isMe) => {
        let baseStyle = "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-300 hover:scale-[1.01] ";

        if (isMe) return baseStyle + "bg-green-900/20 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]";
        if (rank === 1) return baseStyle + "bg-gradient-to-r from-yellow-950/20 to-black/50 border-yellow-500/50 shadow-[0_0_25px_rgba(234,179,8,0.15)]";
        if (rank === 2) return baseStyle + "bg-gray-900/40 border-gray-400/30";
        if (rank === 3) return baseStyle + "bg-amber-900/10 border-amber-600/30";

        return baseStyle + "bg-black/50 border-gray-800";
    };

    const getPlaceholderGradient = (title) => {
        const gradients = [
            'from-purple-900/40 to-black border-purple-500/10',
            'from-emerald-900/40 to-black border-emerald-500/10',
            'from-rose-900/40 to-black border-rose-500/10',
            'from-amber-900/40 to-black border-amber-500/10',
            'from-blue-900/40 to-black border-blue-500/10',
            'from-fuchsia-900/40 to-black border-fuchsia-500/10'
        ];
        let sum = 0;
        for (let i = 0; i < title.length; i++) {
            sum += title.charCodeAt(i);
        }
        return gradients[sum % gradients.length];
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col items-center">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] uppercase italic text-center">
                Ranking Graczy
            </h1>
            <p className="text-gray-400 uppercase tracking-widest font-bold mb-6 sm:mb-10 text-xs sm:text-sm text-center">Rywalizuj z najlepszymi w quizach muzycznych</p>

            {/* MAIN LEADERBOARD TABS */}
            <div className="flex bg-gray-900/50 p-1.5 rounded-2xl border border-white/5 mb-8 z-10 max-w-md w-full">
                <button
                    type="button"
                    onClick={() => {
                        setLeaderboardType('global');
                        setUsers([]);
                    }}
                    aria-pressed={leaderboardType === 'global'}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${
                        leaderboardType === 'global'
                            ? 'bg-green-500 text-black shadow-[0_4px_12px_rgba(34,197,94,0.3)]'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Ranking Ogólny
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setLeaderboardType('quiz');
                        setUsers([]);
                    }}
                    aria-pressed={leaderboardType === 'quiz'}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${
                        leaderboardType === 'quiz'
                            ? 'bg-green-500 text-black shadow-[0_4px_12px_rgba(34,197,94,0.3)]'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Ranking Quizów
                </button>
            </div>

            {/* DYNAMIC FILTERS AND SELECTORS */}
            <div className="w-full max-w-4xl z-10 mb-8">
                {leaderboardType === 'global' ? (
                    /* Global sorting options */
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-950/40 p-4 rounded-3xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setGlobalSort('points')}
                            aria-pressed={globalSort === 'points'}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                                globalSort === 'points'
                                    ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Trophy size={16} /> Suma Punktów
                        </button>
                        <button
                            type="button"
                            onClick={() => setGlobalSort('streak')}
                            aria-pressed={globalSort === 'streak'}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                                globalSort === 'streak'
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Flame size={16} /> Najlepsza Seria
                        </button>
                        <button
                            type="button"
                            onClick={() => setGlobalSort('accuracy')}
                            aria-pressed={globalSort === 'accuracy'}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                                globalSort === 'accuracy'
                                    ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Target size={16} /> Skuteczność %
                        </button>
                        <button
                            type="button"
                            onClick={() => setGlobalSort('games')}
                            aria-pressed={globalSort === 'games'}
                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                                globalSort === 'games'
                                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <BarChart2 size={16} /> Rozegrane Gry
                        </button>
                    </div>
                ) : (
                    /* Quiz Selector Chips Grid */
                    <div className="flex flex-col gap-3">
                        <div className="text-xs font-black uppercase text-green-500 tracking-widest pl-1">
                            Wybierz Playlistę / Quiz:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {quizzes.map((quiz) => {
                                const isActive = selectedQuizId === quiz.id;
                                const placeholderGrad = getPlaceholderGradient(quiz.title);
                                const hasError = imageErrors[quiz.id];
                                const coverUrl = getFullCoverUrl(quiz.cover_image);

                                return (
                                    <button
                                        type="button"
                                        key={quiz.id}
                                        onClick={() => setSelectedQuizId(quiz.id)}
                                        aria-pressed={isActive}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                                            isActive
                                                ? 'bg-green-950/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.02]'
                                                : 'bg-gray-900/40 border-white/5 hover:border-gray-700 hover:bg-gray-900/60'
                                        }`}
                                    >
                                        {/* Cover thumbnail */}
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${placeholderGrad} border shrink-0 overflow-hidden flex items-center justify-center`}>
                                            {!hasError && quiz.cover_image ? (
                                                <img 
                                                    src={coverUrl} 
                                                    alt="" 
                                                    onError={() => handleImageError(quiz.id)}
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <Music size={16} className="text-gray-500" />
                                            )}
                                        </div>
                                        <div className="truncate">
                                            <div className="font-bold text-sm text-white truncate">{quiz.title}</div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                                                {quiz.difficulty === 'EASY' ? 'Łatwy' : quiz.difficulty === 'HARD' ? 'Trudny' : 'Średni'}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* LEADERBOARD LIST CONTAINER */}
            <div className="w-full max-w-4xl flex flex-col gap-4 z-10 pb-20">
                {loading ? (
                    <div className="text-center text-gray-500 py-16">
                        <span className="text-xl font-bold animate-pulse">Ładowanie rankingu...</span>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 py-16 bg-gray-900/20 border border-red-500/20 rounded-3xl flex flex-col items-center gap-3">
                        <span className="text-xl font-bold">{error}</span>
                        <button 
                            type="button"
                            onClick={() => {
                                setError(null);
                                setLeaderboardType('global');
                            }}
                            className="px-6 py-2.5 bg-green-500 text-black font-black uppercase tracking-wider text-xs rounded-xl hover:bg-green-400 transition-all"
                        >
                            Wróć do rankingu ogólnego
                        </button>
                    </div>
                ) : users.length > 0 ? (
                    users.map((user) => {
                        const avatarUrl = getFullCoverUrl(user.avatar);
                        const userHasError = imageErrors[user.username];

                        return (
                            <div key={user.username} className={getRowStyle(user.rank, user.isMe)}>
                                
                                {/* Rank, Avatar & Name Group */}
                                <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                                    {getRankBadge(user.rank)}

                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-2 overflow-hidden bg-black ${user.isMe ? 'border-green-500' : 'border-gray-700 bg-gray-900'}`}>
                                        {!userHasError && user.avatar ? (
                                            <img 
                                                src={avatarUrl} 
                                                alt="Avatar" 
                                                onError={() => handleImageError(user.username)}
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <User size={28} className={user.isMe ? 'text-green-500' : 'text-gray-500'} />
                                        )}
                                    </div>

                                    <div className="truncate">
                                        <h3 className={`text-xl font-black tracking-tight ${user.isMe ? 'text-green-400' : 'text-white'}`}>
                                            {user.name}
                                            {user.isMe && (
                                                <span className="ml-3 text-[10px] bg-green-500 text-black px-2.5 py-1 rounded-full uppercase font-black tracking-wider shadow-[0_4px_10px_rgba(34,197,94,0.3)]">
                                                    Ty
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-semibold truncate">@{user.username}</p>
                                    </div>
                                </div>

                                {/* Dynamic Stats Area */}
                                <div className="flex items-center gap-6 sm:gap-8 justify-between sm:justify-end shrink-0 pl-16 sm:pl-0">
                                    {leaderboardType === 'global' ? (
                                        /* Global statistics presentation */
                                        <div className="flex items-center gap-6 sm:gap-8">
                                            {/* Sub stats */}
                                            <div className="hidden md:flex gap-6 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                                {globalSort !== 'points' && (
                                                    <div className="flex items-center gap-1.5" title="Suma Punktów">
                                                        <Trophy size={14} className="text-gray-600" />
                                                        <span>{user.points.toLocaleString('pl-PL')}</span>
                                                    </div>
                                                )}
                                                {globalSort !== 'streak' && (
                                                    <div className="flex items-center gap-1.5" title="Najlepsza seria">
                                                        <Flame size={14} className="text-gray-600" />
                                                        <span>{user.streak}</span>
                                                    </div>
                                                )}
                                                {globalSort !== 'accuracy' && (
                                                    <div className="flex items-center gap-1.5" title="Skuteczność">
                                                        <Target size={14} className="text-gray-600" />
                                                        <span>{user.accuracy}%</span>
                                                    </div>
                                                )}
                                                {globalSort !== 'games' && (
                                                    <div className="flex items-center gap-1.5" title="Rozegrane gry">
                                                        <BarChart2 size={14} className="text-gray-600" />
                                                        <span>{user.games_played}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Primary sorted stat badge */}
                                            {globalSort === 'points' && (
                                                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 py-2 px-4 rounded-xl text-yellow-400 shadow-[0_4px_10px_rgba(234,179,8,0.1)]">
                                                    <Trophy size={18} />
                                                    <span className="font-black text-lg">{user.points.toLocaleString('pl-PL')}</span>
                                                </div>
                                            )}
                                            {globalSort === 'streak' && (
                                                <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 py-2 px-4 rounded-xl text-orange-400 shadow-[0_4px_10px_rgba(249,115,22,0.1)]">
                                                    <Flame size={18} />
                                                    <span className="font-black text-lg">{user.streak}</span>
                                                </div>
                                            )}
                                            {globalSort === 'accuracy' && (
                                                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 py-2 px-4 rounded-xl text-green-400 shadow-[0_4px_10px_rgba(34,197,94,0.1)]">
                                                    <Target size={18} />
                                                    <span className="font-black text-lg">{user.accuracy}%</span>
                                                </div>
                                            )}
                                            {globalSort === 'games' && (
                                                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 py-2 px-4 rounded-xl text-blue-400 shadow-[0_4px_10px_rgba(59,130,246,0.1)]">
                                                    <BarChart2 size={18} />
                                                    <span className="font-black text-lg">{user.games_played}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Quiz specific statistics presentation */
                                        <div className="flex items-center gap-6 sm:gap-8">
                                            {/* Sub stats */}
                                            <div className="flex flex-col items-end gap-1 font-semibold">
                                                <div className="flex items-center gap-1.5 text-xs text-green-400">
                                                    <Target size={12} />
                                                    <span>{user.correct_count} / {user.total_questions}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-blue-400">
                                                    <Zap size={12} />
                                                    <span>{user.average_time_seconds}s</span>
                                                </div>
                                            </div>

                                            {/* High score badge */}
                                            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 py-2 px-4 rounded-xl text-yellow-400 shadow-[0_4px_10px_rgba(234,179,8,0.1)]">
                                                <Trophy size={18} />
                                                <span className="font-black text-lg">{user.points}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-gray-500 py-16 bg-gray-900/20 border border-white/5 rounded-3xl">
                        Brak wyników w tej kategorii. Bądź pierwszym graczem, który ustanowi rekord!
                    </div>
                )}
            </div>
        </div>
    );
}