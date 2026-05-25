import React, { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import useDialogFocus from '../hooks/useDialogFocus';

export default function AuthModal({ activeModal, setActiveModal, guestSessionId }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const closeModal = useCallback(() => setActiveModal(null), [setActiveModal]);
    const dialogRef = useDialogFocus(!!activeModal, closeModal);

    if (!activeModal) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (activeModal === 'register' && password !== confirmPassword) {
            setError('Hasła nie są identyczne');
            return;
        }

        setLoading(true);

        const url = activeModal === 'login' ? '/api/auth/login/' : '/api/auth/register/';

        const payload = { username, password };
        if (guestSessionId) {
            payload.session_id = guestSessionId;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Wystąpił błąd');
            } else {
                closeModal();
                // Optionally trigger a re-render or context update to fetch user profile
                window.location.reload();
            }
        } catch (err) {
            setError('Błąd połączenia z serwerem');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/90 flex flex-col justify-end sm:justify-center items-center z-50 backdrop-blur-md animate-in fade-in duration-300 p-0 sm:p-4"
            onClick={closeModal}
        >
            <div 
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                aria-describedby={error ? 'auth-modal-error' : undefined}
                tabIndex={-1}
                className="bg-gray-900 border-t-2 border-x-2 sm:border-2 border-green-500/50 p-6 pb-12 sm:pb-10 sm:p-10 w-full max-w-md rounded-t-3xl sm:rounded-[32px] relative shadow-[0_-10px_50px_rgba(34,197,94,0.15)] sm:shadow-[0_0_50px_rgba(34,197,94,0.2)] animate-in slide-in-from-bottom-full sm:zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Zamknij okno logowania lub rejestracji"
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={28} />
                </button>
                <h2 id="auth-modal-title" className="text-3xl sm:text-4xl font-black mb-6 sm:mb-8 text-white uppercase italic">
                    {activeModal === 'login' ? 'Witaj ponownie' : 'Nowe konto'}
                </h2>
                <form className="flex flex-col gap-5" onSubmit={handleSubmit} aria-busy={loading}>
                    {error && <div id="auth-modal-error" role="alert" className="text-red-500 text-sm font-bold text-center">{error}</div>}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="auth-username" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Nazwa użytkownika
                        </label>
                        <input
                            id="auth-username"
                            type="text"
                            placeholder="Nazwa użytkownika"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            className="p-4 bg-black border border-gray-800 rounded-xl text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="auth-password" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Hasło
                        </label>
                        <input
                            id="auth-password"
                            type="password"
                            placeholder="Hasło"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete={activeModal === 'login' ? 'current-password' : 'new-password'}
                            className="p-4 bg-black border border-gray-800 rounded-xl text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                            required
                        />
                    </div>
                    {activeModal === 'register' && (
                        <div className="flex flex-col gap-2">
                            <label htmlFor="auth-confirm-password" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                Powtórz hasło
                            </label>
                            <input
                                id="auth-confirm-password"
                                type="password"
                                placeholder="Powtórz hasło"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                className="p-4 bg-black border border-gray-800 rounded-xl text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                                required
                            />
                        </div>
                    )}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="mt-4 sm:mt-6 bg-green-500 text-black font-black py-4 rounded-xl text-lg sm:text-xl hover:bg-green-400 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
                    >
                        {loading ? 'CZEKAJ...' : (activeModal === 'login' ? 'GRAJ' : 'DOŁĄCZ')}
                    </button>
                </form>
            </div>
        </div>
    );
}