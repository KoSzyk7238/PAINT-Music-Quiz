import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Trophy, Flame, Medal } from 'lucide-react';

export default function Friends() {
    // Symulacja danych pobranych z bazy.
    // Zawiera miejsce gracza w rankingu oraz flagę 'isMe', aby podświetlić obecnego użytkownika.
    const users = [
        { id: 1, rank: 1, name: "Audiofil_99", points: 34500, streak: 24, isMe: false },
        { id: 2, rank: 2, name: "Freddie_M", points: 28200, streak: 15, isMe: false },
        { id: 3, rank: 3, name: "SynthwaveRider", points: 25800, streak: 8, isMe: false },
        { id: 4, rank: 4, name: "PopStar2000", points: 19400, streak: 5, isMe: false },
        { id: 5, rank: 5, name: "Użytkownik #123", points: 12850, streak: 3, isMe: true }, // To jesteśmy my!
        { id: 6, rank: 6, name: "JazzCat", points: 8900, streak: 0, isMe: false },
        { id: 7, rank: 7, name: "RockNrola", points: 7200, streak: 2, isMe: false },
        { id: 8, rank: 8, name: "Beethoven_Drip", points: 6100, streak: 1, isMe: false },
    ];

    // Funkcja przypisująca odpowiednią ikonę lub numer w zależności od miejsca na podium
    const getRankBadge = (rank) => {
        if (rank === 1) return <div className="text-yellow-400 flex items-center justify-center w-12 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]"><Medal size={36} /></div>;
        if (rank === 2) return <div className="text-gray-300 flex items-center justify-center w-12 drop-shadow-[0_0_10px_rgba(209,213,219,0.5)]"><Medal size={32} /></div>;
        if (rank === 3) return <div className="text-amber-600 flex items-center justify-center w-12"><Medal size={32} /></div>;
        return <div className="text-gray-600 font-black text-2xl flex items-center justify-center w-12">#{rank}</div>;
    };

    // Funkcja dobierająca tło i obramowanie w zależności od pozycji i tego, czy to Ty
    const getRowStyle = (rank, isMe) => {
        let baseStyle = "flex items-center gap-4 sm:gap-6 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ";

        if (isMe) return baseStyle + "bg-green-900/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
        if (rank === 1) return baseStyle + "bg-yellow-900/10 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]";
        if (rank === 2) return baseStyle + "bg-gray-900/40 border-gray-400/30";
        if (rank === 3) return baseStyle + "bg-amber-900/10 border-amber-600/30";

        return baseStyle + "bg-black/50 border-gray-800";
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans p-10 flex flex-col items-center relative overflow-y-auto scrollbar-thin">

            {/* Przycisk powrotu */}
            <div className="w-full max-w-4xl flex justify-start mb-8 z-10">
                <Link
                    to="/"
                    className="flex items-center gap-3 text-green-500 hover:text-green-400 hover:-translate-x-2 transition-all font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={28} /> Powrót
                </Link>
            </div>

            {/* Nagłówek */}
            <h1 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] uppercase italic z-10">
                Ranking
            </h1>
            <p className="text-gray-400 uppercase tracking-widest font-bold mb-12">Lista najlepszych graczy</p>

            {/* Lista Graczy */}
            <div className="w-full max-w-4xl flex flex-col gap-4 z-10">
                {users.map((user) => (
                    <div key={user.id} className={getRowStyle(user.rank, user.isMe)}>

                        {/* 1. Odznaka / Miejsce */}
                        {getRankBadge(user.rank)}

                        {/* 2. Miniaturka profilu */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 ${user.isMe ? 'border-green-500' : 'border-gray-700 bg-gray-900'}`}>
                            <User size={24} className={user.isMe ? 'text-green-500' : 'text-gray-500'} />
                        </div>

                        {/* 3. Nazwa użytkownika */}
                        <div className="flex-1">
                            <h3 className={`text-xl font-bold ${user.isMe ? 'text-green-400' : 'text-white'}`}>
                                {user.name}
                                {user.isMe && <span className="ml-3 text-xs bg-green-500 text-black px-2 py-1 rounded-full uppercase font-black tracking-wider">Ty</span>}
                            </h3>
                        </div>

                        {/* 4. Statystyki (Punkty i Streak) ukryte na bardzo małych ekranach, widoczne wyżej */}
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <Flame size={20} className={user.streak >= 10 ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'text-gray-600'} />
                                <span className="font-mono text-gray-300">{user.streak}</span>
                            </div>

                            <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1 sm:gap-2 w-24 justify-end">
                                <Trophy size={20} className="text-yellow-500" />
                                <span className="font-bold text-lg">{user.points.toLocaleString('pl-PL')}</span>
                            </div>
                        </div>

                    </div>
                ))}
            </div>

            {/* Zaślepka na dole */}
            <div className="mt-10 text-gray-600 italic">
                Pokaż więcej...
            </div>
        </div>
    );
}