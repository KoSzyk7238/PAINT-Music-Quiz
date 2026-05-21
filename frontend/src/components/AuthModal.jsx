import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AuthModal({ activeModal, setActiveModal, guestSessionId }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
                setActiveModal(null);
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
            onClick={() => setActiveModal(null)}
        >
            <div 
                className="bg-gray-900 border-t-2 border-x-2 sm:border-2 border-green-500/50 p-6 pb-12 sm:pb-10 sm:p-10 w-full max-w-md rounded-t-3xl sm:rounded-[32px] relative shadow-[0_-10px_50px_rgba(34,197,94,0.15)] sm:shadow-[0_0_50px_rgba(34,197,94,0.2)] animate-in slide-in-from-bottom-full sm:zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => setActiveModal(null)}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={28} />
                </button>
                <h2 className="text-3xl sm:text-4xl font-black mb-6 sm:mb-8 text-white uppercase italic">
                    {activeModal === 'login' ? 'Witaj ponownie' : 'Nowe konto'}
                </h2>
                <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                    {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}
                    <input
                        type="text"
                        placeholder="Nazwa użytkownika"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-4 bg-black border border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Hasło"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="p-4 bg-black border border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                        required
                    />
                    {activeModal === 'register' && (
                        <input
                            type="password"
                            placeholder="Powtórz hasło"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="p-4 bg-black border border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                            required
                        />
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