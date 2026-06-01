import React, { useEffect, useState } from 'react';
import { 
    Sparkles, 
    Trophy, 
    Clock, 
    CheckCircle2, 
    ChevronRight, 
    Flame, 
    Zap, 
    Hourglass, 
    Crown, 
    Award, 
    ThumbsUp, 
    Frown, 
    Music,
    Share2,
    RotateCcw,
    ListMusic,
} from 'lucide-react';
import useDialogFocus from '../hooks/useDialogFocus';
import { useToast } from '../context/ToastContext';
import { shareSession } from '../utils/shareResult';
import DetailedSummaryModal from './DetailedSummaryModal';

export default function SummaryView({ 
    sessionSummary, 
    sessionId,
    currentQuiz, 
    onFinish, 
    onPlayAgain,
    isLoggedIn, 
    onLoginClick, 
    onRegisterClick,
    maxStreak,
    fastestCorrectTime,
    totalTimeTaken,
    guestSessionPending = false,
}) {
    const { showToast } = useToast();
    const [sharing, setSharing] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const summaryDialogRef = useDialogFocus(true, onFinish);

    useEffect(() => {
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                const activeEl = document.activeElement;
                const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
                if (!isInputFocused) {
                    e.preventDefault();
                    onFinish();
                }
            }
        };
        window.addEventListener('keydown', handleEnter);
        return () => window.removeEventListener('keydown', handleEnter);
    }, [onFinish]);

    const totalQuestions = currentQuiz?.questions?.length || sessionSummary.total_questions || 10;
    const correctRatio = Math.round((sessionSummary.correct_count / totalQuestions) * 100);

    const handleShare = async () => {
        setSharing(true);
        try {
            const result = await shareSession({
                quizTitle: currentQuiz?.title,
                quizId: currentQuiz?.id ?? sessionSummary.quiz,
                score: sessionSummary.score,
                correctCount: sessionSummary.correct_count,
                totalQuestions,
                accuracyPercent: correctRatio,
                difficulty: sessionSummary.chosen_difficulty || currentQuiz?.difficulty,
            });
            if (result === 'shared') {
                showToast('Udostępniono!', 'success');
            } else if (result === 'copied') {
                showToast('Wynik skopiowany do schowka!', 'success');
            } else if (result === 'failed') {
                showToast('Nie udało się udostępnić wyniku.', 'error');
            }
        } catch {
            showToast('Nie udało się udostępnić wyniku.', 'error');
        } finally {
            setSharing(false);
        }
    };

    const getPerformanceBadge = (ratio) => {
        if (ratio === 100) {
            return (
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full shadow-[0_0_25px_rgba(234,179,8,0.2)] animate-pulse shrink-0">
                    <Crown className="text-yellow-400 animate-glow-pulse shrink-0" size={24} fill="currentColor" />
                    <span className="text-xs sm:text-sm font-black text-yellow-400 uppercase tracking-widest">Perfekcyjnie!</span>
                    <Crown className="text-yellow-400 animate-glow-pulse shrink-0" size={24} fill="currentColor" />
                </div>
            );
        }
        if (ratio >= 80) {
            return (
                <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.15)] shrink-0">
                    <Flame className="text-orange-500 animate-pulse shrink-0" size={18} fill="currentColor" />
                    <Trophy className="text-yellow-500 shrink-0 animate-pulse" size={20} fill="currentColor" />
                    <span className="text-[10px] sm:text-xs font-black text-orange-400 uppercase tracking-widest">Rewelacja!</span>
                    <Flame className="text-orange-500 animate-pulse shrink-0" size={18} fill="currentColor" />
                </div>
            );
        }
        if (ratio >= 60) {
            return (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.1)] shrink-0">
                    <Award className="text-blue-400 shrink-0" size={20} />
                    <span className="text-[10px] sm:text-xs font-black text-blue-400 uppercase tracking-widest">Świetny wynik!</span>
                </div>
            );
        }
        if (ratio >= 40) {
            return (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.1)] shrink-0">
                    <ThumbsUp className="text-green-400 shrink-0 animate-bounce duration-2000" size={18} fill="currentColor" />
                    <span className="text-[10px] sm:text-xs font-black text-green-400 uppercase tracking-widest">Dobrze poszło!</span>
                </div>
            );
        }
        if (ratio >= 20) {
            return (
                <div className="flex items-center gap-2 bg-gray-500/10 border border-gray-500/30 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full shrink-0">
                    <Music className="text-gray-400 shrink-0" size={16} />
                    <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest">Dobra próba</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/30 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full shrink-0">
                <Frown className="text-red-400 shrink-0" size={16} />
                <span className="text-[10px] sm:text-xs font-black text-red-400 uppercase tracking-widest">Poćwicz jeszcze!</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <style>{`
                @keyframes glow-pulse {
                    0%, 100% {
                        filter: drop-shadow(0 0 2px rgba(234, 179, 8, 0.4)) brightness(0.9);
                        opacity: 0.8;
                    }
                    50% {
                        filter: drop-shadow(0 0 12px rgba(234, 179, 8, 0.9)) brightness(1.2);
                        opacity: 1;
                    }
                }
                .animate-glow-pulse {
                    animation: glow-pulse 2s ease-in-out infinite;
                }
            `}</style>
            <div
                ref={summaryDialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="summary-title"
                aria-describedby="summary-description"
                tabIndex={-1}
                className="bg-gradient-to-b from-gray-900/95 to-black border-2 border-green-500/30 rounded-3xl max-w-2xl w-full p-5 sm:p-8 flex flex-col shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-thin animate-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(34,197,94,0.15)] z-50"
            >
                
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6 mt-2 relative z-10 shrink-0">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30 mb-3 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                        <Trophy className="text-green-500" size={32} />
                    </div>
                    <h2 id="summary-title" className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mb-1">
                        Koniec Quizu!
                    </h2>
                    <p id="summary-description" className="text-xs sm:text-sm text-gray-400 font-medium mb-3">
                        Ukończyłeś quiz: <span className="text-green-400 font-bold">{currentQuiz?.title || 'Muzyczny Quiz'}</span>
                    </p>

                    {/* Odznaka skuteczności */}
                    {getPerformanceBadge(correctRatio)}
                </div>

                {/* Glassmorphic Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full mb-6 relative z-10 shrink-0">
                    {/* Points card */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent p-4 rounded-2xl border border-yellow-500/20 flex flex-col items-center text-center shadow-[0_4px_15px_rgba(234,179,8,0.03)] group hover:border-yellow-500/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2 border border-yellow-500/20 text-yellow-500 shrink-0">
                            <Trophy size={16} fill="currentColor" />
                        </div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest font-black mb-1">Punkty</span>
                        <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-md">
                            {sessionSummary.score}
                        </span>
                    </div>

                    {/* Correct Answers card */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent p-4 rounded-2xl border border-green-500/20 flex flex-col items-center text-center shadow-[0_4px_15px_rgba(34,197,94,0.03)] group hover:border-green-500/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mb-2 border border-green-500/20 text-green-500 shrink-0">
                            <CheckCircle2 size={16} />
                        </div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest font-black mb-1">Poprawne</span>
                        <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-green-600 drop-shadow-md">
                            {sessionSummary.correct_count}/{totalQuestions}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-green-500 font-bold mt-0.5">{correctRatio}% popr.</span>
                    </div>

                    {/* Reaction Time card */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent p-4 rounded-2xl border border-blue-500/20 flex flex-col items-center text-center shadow-[0_4px_15px_rgba(59,130,246,0.03)] group hover:border-blue-500/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 border border-blue-500/20 text-blue-400 shrink-0">
                            <Clock size={16} />
                        </div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest font-black mb-1">Śr. Czas</span>
                        <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-600 drop-shadow-md">
                            {sessionSummary.average_time_seconds ? `${sessionSummary.average_time_seconds.toFixed(1)}s` : '0.0s'}
                        </span>
                    </div>

                    {/* Best Streak card */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent p-4 rounded-2xl border border-orange-500/20 flex flex-col items-center text-center shadow-[0_4px_15px_rgba(249,115,22,0.03)] group hover:border-orange-500/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center mb-2 border border-orange-500/20 text-orange-500 shrink-0">
                            <Flame size={16} fill="currentColor" />
                        </div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest font-black mb-1">Najl. Seria</span>
                        <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-orange-600 drop-shadow-md">
                            {maxStreak}
                        </span>
                    </div>

                    {/* Fastest Response card */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent p-4 rounded-2xl border border-purple-500/20 flex flex-col items-center text-center shadow-[0_4px_15px_rgba(168,85,247,0.03)] group hover:border-purple-500/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-2 border border-purple-500/20 text-purple-400 shrink-0">
                            <Zap size={16} fill="currentColor" />
                        </div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest font-black mb-1">Najl. Czas</span>
                        <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-600 drop-shadow-md">
                            {fastestCorrectTime !== null ? `${fastestCorrectTime.toFixed(1)}s` : '--'}
                        </span>
                    </div>

                    {/* Total Time card */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent p-4 rounded-2xl border border-rose-500/20 flex flex-col items-center text-center shadow-[0_4px_15px_rgba(244,63,94,0.03)] group hover:border-rose-500/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center mb-2 border border-rose-500/20 text-rose-400 shrink-0">
                            <Hourglass size={16} />
                        </div>
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest font-black mb-1">Łączny Czas</span>
                        <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-rose-600 drop-shadow-md">
                            {totalTimeTaken ? `${totalTimeTaken.toFixed(0)}s` : '0s'}
                        </span>
                    </div>
                </div>

                {/* Actions / Encourage Block */}
                <div className="w-full relative z-10 shrink-0 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={handleShare}
                            disabled={sharing}
                            className="font-bold py-3 px-4 rounded-xl uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-gray-700 text-white hover:border-green-500 disabled:opacity-50 cursor-pointer"
                        >
                            <Share2 size={16} aria-hidden />
                            Udostępnij
                        </button>
                        {onPlayAgain && (
                            <button
                                type="button"
                                onClick={onPlayAgain}
                                className="font-bold py-3 px-4 rounded-xl uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-purple-500/50 text-purple-300 hover:bg-purple-950/40 cursor-pointer"
                            >
                                <RotateCcw size={16} aria-hidden />
                                Zagraj ponownie
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowDetails(true)}
                        className="w-full font-bold py-3 px-4 rounded-xl uppercase tracking-wider text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-green-500/30 text-green-400 hover:border-green-500 hover:bg-green-500/10 cursor-pointer"
                    >
                        <ListMusic size={16} aria-hidden />
                        Szczegółowe podsumowanie
                    </button>

                    {isLoggedIn ? (
                        <button
                            type="button"
                            onClick={onFinish}
                            className="w-full font-black py-4 px-6 rounded-xl uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 border-2 bg-green-500 border-green-500 hover:bg-green-400 text-black shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:shadow-[0_4px_20px_rgba(34,197,94,0.5)]"
                        >
                            <div className="flex items-center gap-2">
                                <span>Zakończ i wróć do menu</span>
                                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border border-black/20 bg-black/10 text-black/80 uppercase tracking-normal">
                                    Enter
                                </kbd>
                            </div>
                            <ChevronRight size={18} />
                        </button>
                    ) : (
                        <div className="bg-green-950/20 border border-green-500/20 rounded-2xl p-4 sm:p-5 text-center flex flex-col items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-2 text-green-400">
                                <Sparkles size={16} className="animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-wider">Zapisz swój wynik!</span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md">
                                Twój wynik to aż <span className="text-yellow-400 font-bold">{sessionSummary.score} pkt</span>!
                                {guestSessionPending
                                    ? ' Zaloguj się — wynik z tej sesji zostanie przypisany do Twojego konta.'
                                    : ' Zaloguj się lub utwórz konto, aby zapisać punkty i rywalizować w rankingu.'}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-1">
                                <button
                                    type="button"
                                    onClick={onLoginClick}
                                    className="py-3 px-4 bg-green-500 text-black font-black uppercase text-xs tracking-wider rounded-xl hover:bg-green-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_5px_15px_rgba(34,197,94,0.2)]"
                                >
                                    Zaloguj się
                                </button>
                                <button
                                    type="button"
                                    onClick={onRegisterClick}
                                    className="py-3 px-4 bg-transparent border-2 border-gray-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:border-green-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Utwórz konto
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={onFinish}
                                className="text-gray-400 hover:text-white transition-colors text-xs font-medium uppercase tracking-wider mt-1 flex items-center justify-center gap-1"
                            >
                                <span>Kontynuuj bez zapisu</span>
                                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border border-white/10 bg-white/5 text-gray-300 uppercase tracking-normal ml-1">
                                    Enter
                                </kbd>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {showDetails && (
                <DetailedSummaryModal
                    sessionId={sessionId}
                    currentQuiz={currentQuiz}
                    onClose={() => setShowDetails(false)}
                />
            )}
        </div>
    );
}
