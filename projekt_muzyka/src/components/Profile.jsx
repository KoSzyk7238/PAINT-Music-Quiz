import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Camera, ArrowLeft } from 'lucide-react';

export default function Profile() {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profile/');
                if (!res.ok) {
                    throw new Error('Nie udało się pobrać profilu. Zaloguj się!');
                }
                const data = await res.json();
                setUsername(data.display_name || data.user || '');
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        setSuccessMsg('');
        setError(null);
        try {
            const res = await fetch('/api/profile/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ display_name: username }),
            });
            if (!res.ok) {
                throw new Error('Nie udało się zapisać zmian.');
            }
            setSuccessMsg('Zmiany zostały zapisane!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
                <span className="text-2xl font-bold">Ładowanie profilu...</span>
            </div>
        );
    }

    if (error && !username) {
        return (
            <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center gap-4">
                <span className="text-2xl font-bold text-red-500">{error}</span>
                <Link to="/" className="text-green-500 hover:text-green-400 font-bold uppercase underline">Wróć na stronę główną</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans p-10 flex flex-col items-center relative overflow-hidden">

            <div className="w-full max-w-3xl flex justify-start mb-8 z-10">
                <Link
                    to="/"
                    className="flex items-center gap-3 text-green-500 hover:text-green-400 hover:-translate-x-2 transition-all font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={28} /> Powrót
                </Link>
            </div>

            <h1 className="text-6xl font-black tracking-tighter mb-12 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] uppercase italic z-10">
                Twój Profil
            </h1>

            <div className="bg-gray-900/60 border border-white/10 p-12 rounded-[32px] w-full max-w-2xl flex flex-col items-center gap-10 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md z-10">

                <div className="relative group cursor-pointer">
                    <div className="w-48 h-48 rounded-full bg-black border-4 border-green-500/30 overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.2)] flex items-center justify-center transition-all duration-300 group-hover:border-green-500 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                        <User size={100} className="text-gray-600 group-hover:opacity-20 transition-opacity duration-300" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Camera size={50} className="text-green-400 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-300 text-sm px-4 py-1.5 rounded-full border border-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Zmień zdjęcie
                    </div>
                </div>

                <div className="w-full flex flex-col gap-4">
                    {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}
                    {successMsg && <div className="text-green-500 text-sm font-bold text-center">{successMsg}</div>}
                    <label className="text-green-500 text-sm font-bold uppercase tracking-widest pl-2">
                        Nazwa użytkownika
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-5 bg-black border-2 border-gray-800 rounded-2xl text-white focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.2)] outline-none transition-all text-xl font-medium"
                    />

                    <button
                        onClick={handleSave}
                        className="mt-6 bg-green-500 text-black font-black py-5 rounded-2xl text-xl hover:bg-green-400 hover:scale-[1.02] transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)] uppercase tracking-tight active:scale-95"
                    >
                        Zapisz zmiany
                    </button>
                </div>
            </div>
        </div>
    );
}