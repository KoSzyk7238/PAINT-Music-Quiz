import React from 'react';
import { Link } from 'react-router-dom';
import { X, User } from 'lucide-react';

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, setActiveModal }) {
    return (
        <div
            className={`fixed top-0 right-0 h-full w-80 bg-gray-900 border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transform transition-transform duration-500 ease-in-out z-40 ${
                isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            } flex flex-col`}
        >
            <div className="p-6 flex justify-between items-center border-b border-white/5">
                <span className="text-xl font-bold text-green-500 uppercase tracking-widest">Menu</span>
                <button onClick={() => setIsSidebarOpen(false)} className="hover:rotate-90 transition-transform duration-300">
                    <X size={32} />
                </button>
            </div>

            <div className="p-10 flex flex-col items-center border-b border-white/5">
                <div className="w-28 h-28 rounded-full bg-black border-4 border-green-500/30 overflow-hidden mb-4 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    <User size={60} className="m-auto mt-4 text-gray-600" />
                </div>
                <span className="text-xl font-medium text-white">Użytkownik #123</span>
            </div>

            <div className="p-8 flex flex-col gap-4">
                <button
                    onClick={() => setActiveModal('login')}
                    className="w-full py-3 bg-green-500 text-black font-black uppercase tracking-tighter rounded-xl hover:bg-green-400 transition-all active:scale-95"
                >
                    Zaloguj się
                </button>
                <button
                    onClick={() => setActiveModal('register')}
                    className="w-full py-3 border-2 border-gray-700 text-white font-bold rounded-xl hover:border-green-500 transition-all active:scale-95"
                >
                    Rejestracja
                </button>
            </div>

            <nav className="flex-1 p-8 flex flex-col gap-8 text-3xl font-black italic uppercase tracking-tighter">
                <Link to="/stats" className="text-white hover:text-green-500 transition-colors">Stats</Link>
                <Link to="/friends" className="text-white hover:text-green-500 transition-colors">Friends</Link>
            </nav>
        </div>
    );
}