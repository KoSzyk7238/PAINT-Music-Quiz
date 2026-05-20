import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function SummaryView({ sessionSummary, currentQuiz, onFinish, isLoggedIn, onLoginClick, onRegisterClick }) {
    const [showEncourageModal, setShowEncourageModal] = useState(!isLoggedIn);

    useEffect(() => {
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (showEncourageModal) {
                    setShowEncourageModal(false);
                } else {
                    onFinish();
                }
            }
        };
        window.addEventListener('keydown', handleEnter);
        return () => window.removeEventListener('keydown', handleEnter);
    }, [onFinish, showEncourageModal]);

    return (
        <div className="flex flex-col items-center max-w-4xl mx-auto w-full bg-gray-900/40 p-6 sm:p-10 rounded-2xl sm:rounded-3xl border border-white/5 animate-in fade-in slide-in-from-bottom-10 duration-700 relative">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black mb-6 sm:mb-12 text-green-500 uppercase italic drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">Podsumowanie Quizu</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 w-full mb-6 sm:mb-12">
                <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-yellow-500/30 flex flex-col items-center shadow-[0_0_25px_rgba(234,179,8,0.15)] transform transition-transform hover:scale-105">
                    <span className="text-gray-400 text-sm sm:text-xl uppercase tracking-widest mb-2 sm:mb-3 font-bold text-center">Zdobyte Punkty</span>
                    <span className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-lg">{sessionSummary.score}</span>
                </div>
                <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-green-500/30 flex flex-col items-center shadow-[0_0_25px_rgba(34,197,94,0.15)] transform transition-transform hover:scale-105">
                    <span className="text-gray-400 text-sm sm:text-xl uppercase tracking-widest mb-2 sm:mb-3 font-bold text-center">Poprawne Odpowiedzi</span>
                    <span className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-green-600 drop-shadow-lg">{sessionSummary.correct_count} / {currentQuiz?.questions?.length || sessionSummary.total_questions}</span>
                </div>
                <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-blue-500/30 flex flex-col items-center col-span-1 sm:col-span-2 shadow-[0_0_25px_rgba(59,130,246,0.15)] transform transition-transform hover:scale-105">
                    <span className="text-gray-400 text-sm sm:text-xl uppercase tracking-widest mb-2 sm:mb-3 font-bold text-center">Średni Czas Reakcji</span>
                    <span className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-600 drop-shadow-lg">{sessionSummary.average_time_seconds ? sessionSummary.average_time_seconds.toFixed(2) : 0}s</span>
                </div>
            </div>

            <button 
                onClick={onFinish}
                className="px-6 py-4 sm:px-12 sm:py-6 bg-green-500 text-black font-black text-lg sm:text-2xl uppercase tracking-tighter rounded-xl sm:rounded-2xl hover:bg-green-400 transition-all shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:scale-[1.05] active:scale-95 text-center"
            >
                Zakończ i wróć do menu
            </button>

            {showEncourageModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-950 border border-green-500/30 p-6 sm:p-10 rounded-2xl sm:rounded-[32px] max-w-md w-full flex flex-col gap-6 shadow-[0_0_50px_rgba(34,197,94,0.15)] animate-in zoom-in-95 duration-200 text-center relative">
                        <button
                            onClick={() => setShowEncourageModal(false)}
                            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30 animate-pulse">
                                <Sparkles className="text-green-500" size={32} />
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight italic">
                                Zapisz swój wynik!
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Twój wynik to aż <span className="text-yellow-400 font-bold">{sessionSummary.score} pkt</span>! Zaloguj się lub utwórz konto, aby zapisać swoje punkty, zdobyć odznaki i rywalizować w rankingu z innymi graczami!
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowEncourageModal(false);
                                    onLoginClick();
                                }}
                                className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-green-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_rgba(34,197,94,0.2)]"
                            >
                                Zaloguj się
                            </button>
                            <button
                                onClick={() => {
                                    setShowEncourageModal(false);
                                    onRegisterClick();
                                }}
                                className="w-full py-4 bg-transparent border-2 border-gray-800 text-white font-bold uppercase tracking-wider rounded-xl hover:border-green-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Utwórz konto
                            </button>
                            <button
                                onClick={() => setShowEncourageModal(false)}
                                className="w-full py-3 text-gray-500 hover:text-gray-400 font-medium text-sm transition-colors mt-2"
                            >
                                Kontynuuj jako gość
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
