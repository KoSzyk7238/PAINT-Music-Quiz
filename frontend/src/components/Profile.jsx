import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, KeyRound, UserMinus, ShieldAlert, CheckCircle2 } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import AuthModal from './AuthModal';
import useDialogFocus from '../hooks/useDialogFocus';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const getCroppedImg = (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                resolve(null);
                return;
            }
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
};

export default function Profile() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { isLoggedIn, loading: authLoading } = useAuth();
    const fileInputRef = useRef(null);

    // Profile data states
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');

    // Avatar crop states
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState('');
    const [crop, setCrop] = useState({ unit: '%', width: 50, aspect: 1 });
    const [completedCrop, setCompletedCrop] = useState(null);
    const imageRef = useRef(null);

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
    const [activeModal, setActiveModal] = useState(null);
    const closeDeleteModal = React.useCallback(() => {
        setShowDeleteModal(false);
        setDeleteConfirmPassword('');
        setDeleteError(null);
    }, []);
    const deleteDialogRef = useDialogFocus(showDeleteModal, closeDeleteModal);

    useEffect(() => {
        if (authLoading) return;

        const fetchProfile = async () => {
            if (!isLoggedIn) {
                setLoading(false);
                setError('Nie udało się pobrać profilu. Zaloguj się!');
                return;
            }
            try {
                setLoading(true);
                setError(null);
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
                showToast(err.message, 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [isLoggedIn, authLoading, showToast]);

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
            if (file.size > MAX_SIZE) {
                showToast('Rozmiar pliku awatara nie może przekraczać 2 MB.', 'error');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
                setAvatarFile(file);
                setAvatarPreview(URL.createObjectURL(file));
                showToast('Wykryto plik GIF - pominięto kadrowanie w celu zachowania animacji.', 'info');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                setCropImageSrc(reader.result);
                setShowCropModal(true);
            };
            reader.readAsDataURL(file);
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

    if (loading || authLoading) {
        return (
            <div className="flex-1 flex items-center justify-center py-24">
                <span className="text-2xl font-bold">Ładowanie profilu...</span>
            </div>
        );
    }

    if (error && !username) {
        return (
            <div className="flex flex-col items-center justify-center p-6 py-12">
                <div className="bg-gray-900/60 border border-white/10 p-10 rounded-[32px] w-full max-w-md flex flex-col items-center text-center shadow-[0_0_50px_rgba(34,197,94,0.1)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/30">
                        <KeyRound className="text-green-500" size={40} />
                    </div>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tight mb-4">
                        Dostęp tylko dla zalogowanych
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
                        Zaloguj się lub utwórz nowe konto, aby zarządzać swoim profilem, zmienić hasło lub dostosować awatar!
                    </p>
                    <div className="flex flex-col gap-4 w-full">
                        <button 
                            type="button"
                            onClick={() => setActiveModal('login')}
                            className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-green-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_rgba(34,197,94,0.2)]"
                        >
                            Zaloguj się
                        </button>
                        <button 
                            type="button"
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

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col items-center">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-6 sm:mb-12 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)] uppercase italic text-center">
                Ustawienia Konta
            </h1>

            <div className="w-full flex flex-col gap-10 pb-12">

                {/* --- SEKCJA 1: DANE PROFILU & AVATAR --- */}
                <div className="bg-gray-900/40 p-6 sm:p-10 rounded-2xl sm:rounded-[32px] border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col md:flex-row gap-10 items-center">
                    
                    {/* Upload Avatara */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarChange} 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                    />
                    <button
                        type="button"
                        className="relative group cursor-pointer shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-500"
                        onClick={handleAvatarClick}
                        aria-label="Zmień avatar"
                    >
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
                    </button>

                    {/* Inputs profilowe */}
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}
                        className="flex-1 w-full flex flex-col gap-5"
                    >
                        <h2 className="text-2xl font-black italic uppercase tracking-wider text-gray-400">Dane Użytkownika</h2>
                        
                        {error && <div role="alert" className="text-red-500 text-sm font-bold bg-red-900/20 p-3 rounded-xl border border-red-500/30 text-center">{error}</div>}
                        {successMsg && (
                            <div role="status" className="text-green-500 text-sm font-bold bg-green-950/30 p-3 rounded-xl border border-green-500/30 flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> {successMsg}
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label htmlFor="profile-username" className="text-green-500 text-xs font-bold uppercase tracking-widest pl-1">
                                Login (Nazwa unikalna)
                            </label>
                            <input
                                id="profile-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                className="w-full p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] outline-none transition-all font-medium"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="profile-display-name" className="text-green-500 text-xs font-bold uppercase tracking-widest pl-1">
                                Nazwa Wyświetlana
                            </label>
                            <input
                                id="profile-display-name"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                autoComplete="name"
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
                <div className="bg-gray-900/40 p-6 sm:p-10 rounded-2xl sm:rounded-[32px] border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                        <KeyRound className="text-green-500" size={28} />
                        <h2 className="text-2xl font-black italic uppercase tracking-wider text-gray-400">Zmiana Hasła</h2>
                    </div>

                    <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
                        {passwordError && <div role="alert" className="text-red-500 text-sm font-bold bg-red-900/20 p-3 rounded-xl border border-red-500/30 text-center">{passwordError}</div>}
                        {passwordSuccess && (
                            <div role="status" className="text-green-500 text-sm font-bold bg-green-950/30 p-3 rounded-xl border border-green-500/30 flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> {passwordSuccess}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="profile-old-password" className="text-gray-400 text-xs font-bold uppercase tracking-widest pl-1">Obecne Hasło</label>
                                <input
                                    id="profile-old-password"
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    className="p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="profile-new-password" className="text-gray-400 text-xs font-bold uppercase tracking-widest pl-1">Nowe Hasło</label>
                                <input
                                    id="profile-new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    className="p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="profile-confirm-password" className="text-gray-400 text-xs font-bold uppercase tracking-widest pl-1">Powtórz Nowe Hasło</label>
                                <input
                                    id="profile-confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
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
                <div className="bg-red-950/10 p-6 sm:p-10 rounded-2xl sm:rounded-[32px] border border-red-500/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                        <UserMinus className="text-red-500" size={28} />
                        <h2 className="text-2xl font-black italic uppercase tracking-wider text-red-500/80">Strefa Zagrożenia</h2>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-gray-400 text-sm max-w-xl text-center md:text-left">
                            Usunięcie konta jest **nieodwracalne**. Wszystkie Twoje statystyki, seria zwycięstw (streak) oraz historia rozegranych gier zostaną trwale usunięte z bazy danych.
                        </div>
                        <button
                            type="button"
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
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                        ref={deleteDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-account-title"
                        aria-describedby="delete-account-description"
                        tabIndex={-1}
                        className="bg-gray-900 border-2 border-red-500/30 p-6 sm:p-10 rounded-2xl sm:rounded-3xl max-w-md w-full flex flex-col gap-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center gap-3">
                            <ShieldAlert className="text-red-500" size={60} />
                            <h3 id="delete-account-title" className="text-2xl font-black uppercase text-white tracking-tight">Czy jesteś pewien?</h3>
                            <p id="delete-account-description" className="text-gray-400 text-sm">
                                Aby potwierdzić całkowite i trwałe usunięcie konta, wprowadź swoje obecne hasło poniżej.
                            </p>
                        </div>

                        {deleteError && <div role="alert" className="text-red-500 text-sm font-bold text-center bg-red-950/30 p-2 rounded-lg border border-red-500/20">{deleteError}</div>}

                        <label htmlFor="delete-account-password" className="sr-only">Hasło do potwierdzenia usunięcia konta</label>
                        <input
                            id="delete-account-password"
                            type="password"
                            placeholder="Wpisz hasło..."
                            value={deleteConfirmPassword}
                            onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                            required
                            className="p-4 bg-black border-2 border-gray-800 rounded-xl text-white focus:border-red-500 outline-none text-center"
                        />

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                className="flex-grow py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-sm"
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                className="flex-grow py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-500 transition-colors uppercase tracking-wider text-sm"
                            >
                                Usuń konto
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- MODAL KADROWANIA AWATARA --- */}
            {showCropModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border-2 border-green-500/20 p-6 sm:p-8 rounded-2xl max-w-lg w-full flex flex-col gap-6 shadow-[0_0_50px_rgba(34,197,94,0.15)] max-h-[90vh] overflow-y-auto">
                        <div className="text-center">
                            <h3 className="text-2xl font-black uppercase text-white tracking-tight">Dostosuj awatar</h3>
                            <p className="text-gray-400 text-sm mt-1">Przeciągnij i dopasuj kadr do kwadratu</p>
                        </div>

                        <div className="flex justify-center items-center overflow-hidden max-h-[50vh] bg-black/40 rounded-xl border border-white/5 p-2">
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                                circularCrop
                            >
                                <img
                                    ref={imageRef}
                                    src={cropImageSrc}
                                    alt="Crop Source"
                                    className="max-w-full max-h-[45vh] object-contain"
                                    onLoad={(e) => {
                                        const { width, height } = e.currentTarget;
                                        const minDim = Math.min(width, height);
                                        const initialCrop = {
                                            unit: 'px',
                                            width: minDim * 0.8,
                                            height: minDim * 0.8,
                                            x: (width - minDim * 0.8) / 2,
                                            y: (height - minDim * 0.8) / 2,
                                            aspect: 1
                                        };
                                        setCrop(initialCrop);
                                        setCompletedCrop(initialCrop);
                                    }}
                                />
                            </ReactCrop>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCropModal(false);
                                    setCropImageSrc('');
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="flex-grow py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors uppercase tracking-wider text-sm"
                            >
                                Anuluj
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (imageRef.current && completedCrop) {
                                        try {
                                            const croppedBlob = await getCroppedImg(imageRef.current, completedCrop);
                                            if (croppedBlob) {
                                                const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
                                                setAvatarFile(file);
                                                setAvatarPreview(URL.createObjectURL(croppedBlob));
                                                setShowCropModal(false);
                                                setCropImageSrc('');
                                            } else {
                                                showToast('Wystąpił błąd podczas kadrowania obrazu.', 'error');
                                            }
                                        } catch (err) {
                                            showToast('Błąd kadrowania: ' + err.message, 'error');
                                        }
                                    } else {
                                        showToast('Zaznacz obszar do wykadrowania.', 'error');
                                    }
                                }}
                                className="flex-grow py-4 bg-green-500 text-black font-black rounded-xl hover:bg-green-400 transition-all uppercase tracking-wider text-sm shadow-[0_10px_20px_rgba(34,197,94,0.2)]"
                            >
                                Zastosuj
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}