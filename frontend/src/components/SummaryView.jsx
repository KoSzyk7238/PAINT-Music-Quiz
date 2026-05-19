import React, { useEffect } from 'react';

export default function SummaryView({ sessionSummary, currentQuiz, onFinish }) {
    useEffect(() => {
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onFinish();
            }
        };
        window.addEventListener('keydown', handleEnter);
        return () => window.removeEventListener('keydown', handleEnter);
    }, [onFinish]);

    return (
        <div className="flex flex-col items-center max-w-4xl mx-auto w-full bg-gray-900/40 p-10 rounded-3xl border border-white/5 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <h2 className="text-6xl font-black mb-12 text-green-500 uppercase italic drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">Podsumowanie Quizu</h2>
            
            <div className="grid grid-cols-2 gap-8 w-full mb-12">
                <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-8 rounded-3xl border border-yellow-500/30 flex flex-col items-center shadow-[0_0_25px_rgba(234,179,8,0.15)] transform transition-transform hover:scale-105">
                    <span className="text-gray-400 text-xl uppercase tracking-widest mb-3 font-bold">Zdobyte Punkty</span>
                    <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-lg">{sessionSummary.score}</span>
                </div>
                <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-8 rounded-3xl border border-green-500/30 flex flex-col items-center shadow-[0_0_25px_rgba(34,197,94,0.15)] transform transition-transform hover:scale-105">
                    <span className="text-gray-400 text-xl uppercase tracking-widest mb-3 font-bold">Poprawne Odpowiedzi</span>
                    <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-green-600 drop-shadow-lg">{sessionSummary.correct_count} / {currentQuiz?.questions?.length || sessionSummary.total_questions}</span>
                </div>
                <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-8 rounded-3xl border border-blue-500/30 flex flex-col items-center col-span-2 shadow-[0_0_25px_rgba(59,130,246,0.15)] transform transition-transform hover:scale-105">
                    <span className="text-gray-400 text-xl uppercase tracking-widest mb-3 font-bold">Średni Czas Reakcji</span>
                    <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-600 drop-shadow-lg">{sessionSummary.average_time_seconds ? sessionSummary.average_time_seconds.toFixed(2) : 0}s</span>
                </div>
            </div>

            <button 
                onClick={onFinish}
                className="px-12 py-6 bg-green-500 text-black font-black text-2xl uppercase tracking-tighter rounded-2xl hover:bg-green-400 transition-all shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:scale-110 active:scale-95"
            >
                Zakończ i wróć do menu
            </button>
        </div>
    );
}
