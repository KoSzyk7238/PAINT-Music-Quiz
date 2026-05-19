import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame, Trophy, Target, Zap, Music, Crown } from 'lucide-react';
import AuthModal from './AuthModal';

export default function Stats() {
    const [statsData, setStatsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats/');
                if (!response.ok) {
                    throw new Error('Nie udało się pobrać statystyk. Zaloguj się!');
                }
                const data = await response.json();
                setStatsData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
                <span className="text-2xl font-bold">Ładowanie statystyk...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Back button */}
                <div className="w-full max-w-md flex justify-start mb-8 z-10">
                    <Link
                        to="/"
                        className="flex items-center gap-3 text-green-500 hover:text-green-400 hover:-translate-x-2 transition-all font-bold uppercase tracking-widest"
                    >
                        <ArrowLeft size={28} /> Powrót
                    </Link>
                </div>

                <div className="bg-gray-900/60 border border-white/10 p-10 rounded-[32px] w-full max-w-md flex flex-col items-center text-center shadow-[0_0_50px_rgba(34,197,94,0.1)] backdrop-blur-md z-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/30">
                        <Crown className="text-green-500" size={40} />
                    </div>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tight mb-4">
                        Dostęp tylko dla zalogowanych
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
                        Zaloguj się lub utwórz nowe konto, aby śledzić swoje statystyki, historię rozgrywek i rywalizować ze znajomymi!
                    </p>
                    <div className="flex flex-col gap-4 w-full">
                        <button 
                            onClick={() => setActiveModal('login')}
                            className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-green-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_rgba(34,197,94,0.2)]"
                        >
                            Zaloguj się
                        </button>
                        <button 
                            onClick={() => setActiveModal('register')}
                            className="w-full py-4 bg-transparent border-2 border-gray-700 text-white font-bold uppercase tracking-wider rounded-xl hover:border-green-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Utwórz konto
                        </button>
                    </div>
                </div>

                <AuthModal
                    activeModal={activeModal}
                    setActiveModal={setActiveModal}
                />
            </div>
        );
    }

    const { summary, recent_games, genre_distribution, decade_distribution } = statsData;

    const generalStats = [
        { label: "Rozegranych gier", value: summary.games_played, color: "border-blue-500", icon: <Music className="text-blue-500 mb-2" size={24}/> },
        { label: "Łączne punkty", value: summary.total_points, color: "border-yellow-500", icon: <Trophy className="text-yellow-500 mb-2" size={24}/> },
        { label: "Trafność", value: `${summary.accuracy_percent}%`, color: "border-green-500", icon: <Target className="text-green-500 mb-2" size={24}/> },
        { label: "Najlepsza seria", value: summary.best_streak, color: "border-orange-500", icon: <Flame className="text-orange-500 mb-2" size={24}/> },
        { label: "Śr. czas reakcji", value: `${summary.average_reaction_time}s`, color: "border-cyan-500", icon: <Zap className="text-cyan-500 mb-2" size={24}/> },
        { label: "Ulubiony artysta", value: summary.favorite_artist || "Brak", color: "border-purple-500", icon: <Crown className="text-purple-500 mb-2" size={24}/> },
    ];

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    // Obliczanie wartości dla wykresów na podstawie danych
    const totalGenres = genre_distribution.reduce((sum, g) => sum + g.count, 0) || 1;
    const colors = ["#f472b6", "#a78bfa", "#4ade80", "#facc15", "#38bdf8", "#ef4444"];
    
    let currentPercentage = 0;
    const genreStops = genre_distribution.slice(0, 5).map((g, idx) => {
        const percentage = (g.count / totalGenres) * 100;
        const start = currentPercentage;
        currentPercentage += percentage;
        return `${colors[idx % colors.length]} ${start}% ${currentPercentage}%`;
    });
    // Wypełnij resztę dla efektu donut
    if (currentPercentage < 100) {
        genreStops.push(`transparent ${currentPercentage}% 100%`);
    }
    const genreGradient = genreStops.join(", ");

    const totalDecades = Object.values(decade_distribution).reduce((sum, count) => sum + count, 0) || 1;
    let currentDecadePercentage = 0;
    const decadeColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
    const decadeEntries = Object.entries(decade_distribution).sort((a, b) => b[1] - a[1]);
    const decadeStops = decadeEntries.slice(0, 5).map(([decade, count], idx) => {
        const percentage = (count / totalDecades) * 100;
        const start = currentDecadePercentage;
        currentDecadePercentage += percentage;
        return `${decadeColors[idx % decadeColors.length]} ${start}% ${currentDecadePercentage}%`;
    });
    if (currentDecadePercentage < 100) {
        decadeStops.push(`transparent ${currentDecadePercentage}% 100%`);
    }
    const decadeGradient = decadeStops.join(", ");


    return (
        <div className="min-h-screen bg-black text-white font-sans p-10 flex flex-col items-center relative overflow-y-auto scrollbar-thin">

            <div className="w-full max-w-5xl flex justify-start mb-8 z-10">
                <Link
                    to="/"
                    className="flex items-center gap-3 text-green-500 hover:text-green-400 hover:-translate-x-2 transition-all font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={28} /> Powrót
                </Link>
            </div>

            <h1 className="text-6xl font-black tracking-tighter mb-12 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] uppercase italic z-10">
                Statystyki
            </h1>

            <div className="w-full max-w-5xl flex flex-col gap-10 z-10">

                {/* --- SEKCJA: OGÓLNE STATYSTYKI --- */}
                <div className="bg-gray-900/40 p-8 rounded-3xl border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
                    <h2 className="text-2xl font-black italic uppercase tracking-widest mb-6 text-gray-400">Podsumowanie</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {generalStats.map((stat, idx) => (
                            <div key={idx} className={`bg-black/50 p-6 rounded-2xl border-t-4 ${stat.color} flex flex-col items-center justify-center hover:scale-105 transition-transform duration-300`}>
                                {stat.icon}
                                <span className="text-3xl font-black text-white">{stat.value}</span>
                                <span className="text-xs text-gray-500 uppercase font-bold mt-1 tracking-wider">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- SEKCJA: WYKRESY KOŁOWE --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                    {/* Wykres 1: Gatunki muzyczne */}
                    <div className="bg-gray-900/40 p-8 rounded-3xl border border-white/5 flex flex-col items-center">
                        <h2 className="text-xl font-black italic uppercase tracking-widest mb-8 text-gray-400 w-full text-left">Gatunki muzyczne</h2>
                        <div className="flex w-full items-center justify-around">
                            {genre_distribution.length > 0 ? (
                                <>
                                    <div
                                        className="w-48 h-48 rounded-full relative flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                        style={{ background: `conic-gradient(${genreGradient})` }}
                                    >
                                        <div className="absolute inset-4 bg-gray-900 rounded-full flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black">{genre_distribution[0]?.count || 0}</span>
                                            <span className="text-xs text-gray-400">naj. gatunek</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {genre_distribution.slice(0, 5).map((g, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                                                <span className="w-20 font-bold truncate" title={g.genre}>{g.genre}</span>
                                                <span className="text-gray-400">{Math.round((g.count / totalGenres) * 100)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <span className="text-gray-500">Brak danych</span>
                            )}
                        </div>
                    </div>

                    {/* Wykres 2: Ulubione Dekady */}
                    <div className="bg-gray-900/40 p-8 rounded-3xl border border-white/5 flex flex-col items-center">
                        <h2 className="text-xl font-black italic uppercase tracking-widest mb-8 text-gray-400 w-full text-left">Trafność dekadami</h2>
                        <div className="flex w-full items-center justify-around">
                            {decadeEntries.length > 0 ? (
                                <>
                                    <div
                                        className="w-48 h-48 rounded-full relative flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                        style={{ background: `conic-gradient(${decadeGradient})` }}
                                    >
                                        <div className="absolute inset-4 bg-gray-900 rounded-full flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black">{decadeEntries[0]?.[0] || "-"}</span>
                                            <span className="text-xs text-gray-400">naj. dekada</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {decadeEntries.slice(0, 5).map(([decade, count], idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: decadeColors[idx % decadeColors.length] }}></div>
                                                <span className="w-20 font-bold">{decade}</span>
                                                <span className="text-gray-400">{Math.round((count / totalDecades) * 100)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <span className="text-gray-500">Brak danych</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- SEKCJA: OSTATNIE ROZGRYWKI --- */}
                <div className="bg-gray-900/40 p-8 rounded-3xl border border-white/5 mb-10">
                    <h2 className="text-2xl font-black italic uppercase tracking-widest mb-6 text-gray-400">Ostatnie rozgrywki</h2>
                    <div className="flex flex-col gap-4">
                        {recent_games.length > 0 ? (
                            recent_games.map((game, idx) => (
                                <div key={idx} className="bg-black/50 p-4 rounded-xl border border-gray-800 flex items-center gap-6">
                                    <span className="text-gray-500 text-sm font-mono">{formatTime(game.played_at)}</span>
                                    <span className="font-black uppercase w-24 text-blue-500 truncate" title={game.category}>{game.category}</span>
                                    <span className="text-yellow-500 font-bold w-20">{game.points} pkt</span>
                                    <span className="text-gray-400 text-sm">{game.correct}/{game.total}</span>

                                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden ml-4">
                                        <div
                                            className="h-full rounded-full bg-blue-500"
                                            style={{ width: `${game.total > 0 ? (game.correct / game.total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <span className="text-gray-500">Brak historii gier. Zagraj w quiz!</span>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}