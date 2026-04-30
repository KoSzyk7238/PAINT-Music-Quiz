import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame, Trophy, Target, Zap, Music, Crown } from 'lucide-react';

export default function Stats() {
    // Przykładowe dane do wydmuszki (do podmiany przez backend w przyszłości)
    const generalStats = [
        { label: "Rozegranych gier", value: "2115", color: "border-blue-500", icon: <Music className="text-blue-500 mb-2" size={24}/> },
        { label: "Łączne punkty", value: "6767", color: "border-yellow-500", icon: <Trophy className="text-yellow-500 mb-2" size={24}/> },
        { label: "Trafność", value: "67.67%", color: "border-green-500", icon: <Target className="text-green-500 mb-2" size={24}/> },
        { label: "Najlepsza seria", value: "12", color: "border-orange-500", icon: <Flame className="text-orange-500 mb-2" size={24}/> },
        { label: "Śr. czas reakcji", value: "6.7s", color: "border-cyan-500", icon: <Zap className="text-cyan-500 mb-2" size={24}/> },
        { label: "Ulubiony artysta", value: "Skolim", color: "border-purple-500", icon: <Crown className="text-purple-500 mb-2" size={24}/> },
    ];

    const recentGames = [
        { date: "12.04", category: "Pop", points: 450, correct: 8, total: 10, color: "bg-blue-500" },
        { date: "11.04", category: "Rock", points: 320, correct: 6, total: 10, color: "bg-purple-500" },
        { date: "10.04", category: "Mix", points: 510, correct: 9, total: 10, color: "bg-green-500" },
    ];

    return (
        <div className="min-h-screen bg-black text-white font-sans p-10 flex flex-col items-center relative overflow-y-auto scrollbar-thin">

            {/* Przycisk powrotu */}
            <div className="w-full max-w-5xl flex justify-start mb-8 z-10">
                <Link
                    to="/"
                    className="flex items-center gap-3 text-green-500 hover:text-green-400 hover:-translate-x-2 transition-all font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={28} /> Powrót
                </Link>
            </div>

            {/* Nagłówek */}
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
                            {/* Wykres Donut (zbudowany za pomocą conic-gradient) */}
                            <div
                                className="w-48 h-48 rounded-full relative flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                style={{ background: "conic-gradient(#f472b6 0% 35%, #a78bfa 35% 63%, #4ade80 63% 81%, #facc15 81% 93%, #38bdf8 93% 100%)" }}
                            >
                                {/* Ciemny środek (tworzy oponkę) */}
                                <div className="absolute inset-4 bg-gray-900 rounded-full flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black">164</span>
                                    <span className="text-xs text-gray-400">trafień</span>
                                </div>
                            </div>

                            {/* Legenda 1 */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#f472b6]"></div><span className="w-20 font-bold">Pop</span><span className="text-gray-400">35%</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#a78bfa]"></div><span className="w-20 font-bold">Rock</span><span className="text-gray-400">28%</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#4ade80]"></div><span className="w-20 font-bold">Metal</span><span className="text-gray-400">18%</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#facc15]"></div><span className="w-20 font-bold">Hip-Hop</span><span className="text-gray-400">12%</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#38bdf8]"></div><span className="w-20 font-bold">Inne</span><span className="text-gray-400">7%</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Wykres 2: Ulubione Dekady */}
                    <div className="bg-gray-900/40 p-8 rounded-3xl border border-white/5 flex flex-col items-center">
                        <h2 className="text-xl font-black italic uppercase tracking-widest mb-8 text-gray-400 w-full text-left">Trafność dekadami</h2>
                        <div className="flex w-full items-center justify-around">
                            <div
                                className="w-48 h-48 rounded-full relative flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                style={{ background: "conic-gradient(#ef4444 0% 50%, #f97316 50% 75%, #eab308 75% 90%, #22c55e 90% 100%)" }}
                            >
                                <div className="absolute inset-4 bg-gray-900 rounded-full flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black">73%</span>
                                    <span className="text-xs text-gray-400">średnia</span>
                                </div>
                            </div>

                            {/* Legenda 2 */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#ef4444]"></div><span className="w-20 font-bold">Lata 80</span><span className="text-gray-400">50%</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#f97316]"></div><span className="w-20 font-bold">Lata 90</span><span className="text-gray-400">25%</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#eab308]"></div><span className="w-20 font-bold">Lata 00</span><span className="text-gray-400">15%</span></div>
                                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#22c55e]"></div><span className="w-20 font-bold">Nowe</span><span className="text-gray-400">10%</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- SEKCJA: OSTATNIE ROZGRYWKI --- */}
                <div className="bg-gray-900/40 p-8 rounded-3xl border border-white/5 mb-10">
                    <h2 className="text-2xl font-black italic uppercase tracking-widest mb-6 text-gray-400">Ostatnie rozgrywki</h2>
                    <div className="flex flex-col gap-4">
                        {recentGames.map((game, idx) => (
                            <div key={idx} className="bg-black/50 p-4 rounded-xl border border-gray-800 flex items-center gap-6">
                                <span className="text-gray-500 text-sm font-mono">{game.date}</span>
                                <span className={`font-black uppercase w-16 ${game.color.replace('bg-', 'text-')}`}>{game.category}</span>
                                <span className="text-yellow-500 font-bold w-20">{game.points} pkt</span>
                                <span className="text-gray-400 text-sm">{game.correct}/{game.total}</span>

                                {/* Pasek postępu */}
                                <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden ml-4">
                                    <div
                                        className={`h-full rounded-full ${game.color}`}
                                        style={{ width: `${(game.correct / game.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}