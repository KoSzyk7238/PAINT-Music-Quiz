import React from 'react';
import { X } from 'lucide-react';

export default function AuthModal({ activeModal, setActiveModal }) {
    if (!activeModal) return null;

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
                <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="text"
                        placeholder="Nazwa użytkownika"
                        className="p-4 bg-black border border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Hasło"
                        className="p-4 bg-black border border-gray-800 rounded-xl text-white focus:border-green-500 outline-none transition-all"
                    />
                    <button className="mt-6 bg-green-500 text-black font-black py-4 rounded-xl text-xl hover:bg-green-400 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)]">
                        {activeModal === 'login' ? 'GRAJ' : 'DOŁĄCZ'}
                    </button>
                </form>
            </div>
        </div>
    );
}