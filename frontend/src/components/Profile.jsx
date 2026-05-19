import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Camera, ArrowLeft, KeyRound, UserMinus, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Profile() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Profile data states
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');

    // Password change states
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Delete account states
    const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // UX states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [deleteError, setDeleteError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profile/');
                if (!res.ok) {
                    throw new Error('Nie udało się pobrać profilu. Zaloguj się!');
                }
                const data = await res.json();
                setUsername(data.user || '');
                setDisplayName(data.display_name || '');
                setAvatarUrl(data.avatar || '');
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        setSuccessMsg('');
        setError(null);
        
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('display_name', displayName);
            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const res = await fetch('/api/profile/', {
                method: 'PUT',
                body: formData, // Fetch automatically sets Content-Type to multipart/form-data with boundaries
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Nie udało się zapisać zmian.');
            }

            const data = await res.json();
            setDisplayName(data.display_name);
            setUsername(data.user);
            setAvatarUrl(data.avatar);
            setAvatarFile(null);
            setAvatarPreview('');
            setSuccessMsg('Profil został pomyślnie zaktualizowany!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError('Nowe hasła nie są identyczne.');
            return;
        }

        try {
            const res = await fetch('/api/auth/change-password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Nie udało się zmienić hasła.');
            }

            setPasswordSuccess('Hasło zostało pomyślnie zmienione!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordSuccess(''), 3000);
        } catch (err) {
            setPasswordError(err.message);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteError(null);

        try {
            const res = await fetch('/api/auth/delete-account/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deleteConfirmPassword })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Błąd podczas usuwania konta.');
            }

            // Successfully deleted account - redirect to home page (where login state is reset)
            window.location.href = '/';
        } catch (err) {
            setDeleteError(err.message);
        }
    };

    // Helper for resolving absolute media source url
    const getFullAvatarUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return url;
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
        <div className="min-h-screen bg-black text-white font-sans p-10 flex flex-col items-center relative overflow-y-auto scrollbar-thin">
            <div className="w-full max-w-4xl flex justify-start mb-8 z-10">
                <Link
                    to="/"
                    className="flex items-center gap-3 text-green-500 hover:text-green-400 hover:-translate-x-2 transition-all font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={28} /> Powrót
                </Link>
            </div>

            <h1 className="text-6xl font-black tracking-tighter mb-12 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] uppercase italic z-10">
                Ustawienia Konta
            </h1>

            <div className="w-full max-w-4xl flex flex-col gap-10 z-10 pb-20">

                {/* --- SEKCJA 1: DANE PROFILU & AVATAR --- */}
                <div className="bg-gray-900/40 p-10 rounded-[32px] border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col md:flex-row gap-10 items-center">
                    
                    {/* Upload Avatara */}
                    <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleAvatarChange} 
                            style={{ display: 'none' }} 
                            accept="image/*" 
                        />
                        <div className="w-48 h-48 rounded-full bg-black border-4 border-green-500/30 overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.2)] flex items-center justify-center transition-all duration-300 group-hover:border-green-500 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Podgląd" className="w-full h-full object-cover" />
                            ) : avatarUrl ? (
                                <img src={getFullAvatarUrl(avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={100} className="text-gray-600 group-hover:opacity-20 transition-opacity duration-300" />
                            )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full bg-black/40">
                            <Camera size={44} className="text-green-400 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                        </div>
                    </div>

                    {/* Inputs profilowe */}
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}
                        className="flex-1 w-full flex flex-col gap-5"
                    >
                        <h2 className="text-2xl font-black italic uppercase tracking-wider text-gray-400">Dane Użytkownika</h2>
                        
                        {error && <div className="text-red-500 text-sm font-bold bg-red-900/20 p-3 rounded-xl border border-red-500/30 text-center">{error}</div>}
                        {successMsg && (
                            <div className="text-green-500 text-sm font-bold bg-green-950/30 p-3 rounded-xl border border-green-500/30 flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> {successMsg}
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-green-500 text-xs font-bold uppercase tracking-widest pl-1">
                                Login (Nazwa unikalna)
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] outline-none transition-all font-medium"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-green-500 text-xs font-bold uppercase tracking-widest pl-1">
                                Nazwa Wyświetlana
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] outline-none transition-all font-medium"
                            />
                        </div>

                        <button
                            type="submit"
                            className="mt-2 bg-green-500 text-black font-black py-4 rounded-xl hover:bg-green-400 hover:scale-[1.01] transition-all shadow-[0_10px_20px_rgba(34,197,94,0.2)] uppercase tracking-wider active:scale-95"
                        >
                            Zapisz Profil
                        </button>
                    </form>
                </div>

                {/* --- SEKCJA 2: ZMIANA HASŁA --- */}
                <div className="bg-gray-900/40 p-10 rounded-[32px] border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                        <KeyRound className="text-green-500" size={28} />
                        <h2 className="text-2xl font-black italic uppercase tracking-wider text-gray-400">Zmiana Hasła</h2>
                    </div>

                    <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
                        {passwordError && <div className="text-red-500 text-sm font-bold bg-red-900/20 p-3 rounded-xl border border-red-500/30 text-center">{passwordError}</div>}
                        {passwordSuccess && (
                            <div className="text-green-500 text-sm font-bold bg-green-950/30 p-3 rounded-xl border border-green-500/30 flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> {passwordSuccess}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest pl-1">Obecne Hasło</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    required
                                    className="p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest pl-1">Nowe Hasło</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest pl-1">Powtórz Nowe Hasło</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="bg-green-500 text-black font-black py-4 rounded-xl hover:bg-green-400 hover:scale-[1.01] transition-all shadow-[0_10px_20px_rgba(34,197,94,0.2)] uppercase tracking-wider active:scale-95"
                        >
                            Zmień Hasło
                        </button>
                    </form>
                </div>

                {/* --- SEKCJA 3: STREFA NIEBEZPIECZEŃSTWA (DANGER ZONE) --- */}
                <div className="bg-red-950/10 p-10 rounded-[32px] border border-red-500/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                        <UserMinus className="text-red-500" size={28} />
                        <h2 className="text-2xl font-black italic uppercase tracking-wider text-red-500/80">Strefa Zagrożenia</h2>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-gray-400 text-sm max-w-xl text-center md:text-left">
                            Usunięcie konta jest **nieodwracalne**. Wszystkie Twoje statystyki, seria zwycięstw (streak) oraz historia rozegranych gier zostaną trwale usunięte z bazy danych.
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="px-8 py-4 bg-red-600/80 border border-red-500/40 text-white font-black rounded-xl hover:bg-red-500 hover:scale-105 transition-all shadow-[0_5px_15px_rgba(239,68,68,0.2)] uppercase tracking-wider whitespace-nowrap active:scale-95"
                        >
                            Usuń Konto
                        </button>
                    </div>
                </div>

            </div>

            {/* --- MODAL POTWIERDZENIA USUNIĘCIA KONTA --- */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                        className="bg-gray-900 border-2 border-red-500/30 p-10 rounded-3xl max-w-md w-full flex flex-col gap-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex flex-col items-center text-center gap-3">
                            <ShieldAlert className="text-red-500" size={60} />
                            <h3 className="text-2xl font-black uppercase text-white tracking-tight">Czy jesteś pewien?</h3>
                            <p className="text-gray-400 text-sm">
                                Aby potwierdzić całkowite i trwałe usunięcie konta, wprowadź swoje obecne hasło poniżej.
                            </p>
                        </div>

                        {deleteError && <div className="text-red-500 text-sm font-bold text-center bg-red-950/30 p-2 rounded-lg border border-red-500/20">{deleteError}</div>}

                        <input
                            type="password"
                            placeholder="Wpisz hasło..."
                            value={deleteConfirmPassword}
                            onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                            required
                            className="p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-red-500 outline-none text-center"
                        />

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmPassword('');
                                    setDeleteError(null);
                                }}
                                className="flex-1 py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-sm"
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-500 transition-colors uppercase tracking-wider text-sm"
                            >
                                Usuń konto
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}