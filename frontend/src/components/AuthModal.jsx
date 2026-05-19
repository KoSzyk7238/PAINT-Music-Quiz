import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AuthModal({ activeModal, setActiveModal }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!activeModal) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const url = activeModal === 'login' ? '/api/auth/login/' : '/api/auth/register/';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-gray-900 border-2 border-green-500/50 p-10 w-full max-w-md rounded-[32px] relative shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                <button
                    onClick={() => setActiveModal(null)}
                    className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={28} />
                </button>
                <h2 className="text-4xl font-black mb-8 text-white uppercase italic">
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
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="mt-6 bg-green-500 text-black font-black py-4 rounded-xl text-xl hover:bg-green-400 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
                    >
                        {loading ? 'CZEKAJ...' : (activeModal === 'login' ? 'GRAJ' : 'DOŁĄCZ')}
                    </button>
                </form>
            </div>
        </div>
    );
}