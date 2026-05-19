import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Trophy, Flame, Medal } from 'lucide-react';

export default function Friends() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Fetch the current user to know who is "Me"
                const userRes = await fetch('/api/auth/me/');
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setCurrentUser(userData.username);
                }

                // Fetch leaderboard data
                const res = await fetch('/api/leaderboard/');
                if (!res.ok) {
                    throw new Error('Nie udało się pobrać rankingu.');
                }
                const data = await res.json();
                
                // Map the API data to match the component's structure
                const mappedUsers = data.map((u) => ({
                    id: u.username,
                    rank: u.rank,
                    name: u.display_name,
                    points: u.points,
                    streak: u.streak,
                    isMe: currentUser === u.username || (!currentUser && false),
                    username: u.username,
                    avatar: u.avatar
                }));

                setUsers(mappedUsers);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [currentUser]);

    const getRankBadge = (rank) => {
        if (rank === 1) return <div className="text-yellow-400 flex items-center justify-center w-12 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]"><Medal size={36} /></div>;
        if (rank === 2) return <div className="text-gray-300 flex items-center justify-center w-12 drop-shadow-[0_0_10px_rgba(209,213,219,0.5)]"><Medal size={32} /></div>;
        if (rank === 3) return <div className="text-amber-600 flex items-center justify-center w-12"><Medal size={32} /></div>;
        return <div className="text-gray-600 font-black text-2xl flex items-center justify-center w-12">#{rank}</div>;
    };

    const getRowStyle = (rank, isMe) => {
        let baseStyle = "flex items-center gap-4 sm:gap-6 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ";

        if (isMe) return baseStyle + "bg-green-900/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
        if (rank === 1) return baseStyle + "bg-yellow-900/10 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]";
        if (rank === 2) return baseStyle + "bg-gray-900/40 border-gray-400/30";
        if (rank === 3) return baseStyle + "bg-amber-900/10 border-amber-600/30";

        return baseStyle + "bg-black/50 border-gray-800";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
                <span className="text-2xl font-bold">Ładowanie rankingu...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center gap-4">
                <span className="text-2xl font-bold text-red-500">{error}</span>
                <Link to="/" className="text-green-500 hover:text-green-400 font-bold uppercase underline">Wróć na stronę główną</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans p-10 flex flex-col items-center relative overflow-y-auto scrollbar-thin">

            <div className="w-full max-w-4xl flex justify-start mb-8 z-10">
                <Link
                    to="/"
                    className="flex items-center gap-3 text-green-500 hover:text-green-400 hover:-translate-x-2 transition-all font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={28} /> Powrót
                </Link>
            </div>

            <h1 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] uppercase italic z-10">
                Ranking
            </h1>
            <p className="text-gray-400 uppercase tracking-widest font-bold mb-12">Lista najlepszych graczy</p>

            <div className="w-full max-w-4xl flex flex-col gap-4 z-10">
                {users.map((user) => {
                    const isMe = user.username === currentUser;
                    return (
                        <div key={user.id} className={getRowStyle(user.rank, isMe)}>

                            {getRankBadge(user.rank)}

                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 overflow-hidden bg-black ${isMe ? 'border-green-500' : 'border-gray-700 bg-gray-900'}`}>
                                {user.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} className={isMe ? 'text-green-500' : 'text-gray-500'} />
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className={`text-xl font-bold ${isMe ? 'text-green-400' : 'text-white'}`}>
                                    {user.name}
                                    {isMe && <span className="ml-3 text-xs bg-green-500 text-black px-2 py-1 rounded-full uppercase font-black tracking-wider">Ty</span>}
                                </h3>
                            </div>

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
                    );
                })}
                {users.length === 0 && (
                    <div className="text-center text-gray-500 p-8">
                        Brak graczy w rankingu. Zostań pierwszym!
                    </div>
                )}
            </div>
        </div>
    );
}