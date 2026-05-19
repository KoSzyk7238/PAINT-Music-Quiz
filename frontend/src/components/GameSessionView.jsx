import React from 'react';
import { Play, Pause, X } from 'lucide-react';

export default function GameSessionView({
    currentQuiz,
    currentQuestionIndex,
    timeLeft,
    isPlaying,
    togglePlay,
    audioDebug,
    feedback,
    inputValue,
    setInputValue,
    handleKeyDown,
    isSubmitting,
    handleAnswerSubmit,
    showSuggestions,
    filteredSuggestions,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    onQuit
}) {
    const question = currentQuiz?.questions?.[currentQuestionIndex];
    const isTimeRunningOut = timeLeft <= 5 && timeLeft > 0;

    return (
        <div className="w-full">
            {question ? (
                <div className="flex flex-col mb-16 max-w-4xl mx-auto w-full bg-gray-900/40 p-8 rounded-3xl border border-white/5 relative">
                    <button
                        onClick={onQuit}
                        className="absolute -top-4 -left-4 flex items-center gap-2 bg-red-950/80 hover:bg-red-900 text-red-400 hover:text-red-200 border-2 border-red-900/50 px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95"
                        title="Przerwij quiz i wróć do menu"
                    >
                        <X size={16} />
                        Przerwij
                    </button>

                    <div className="absolute -top-4 -right-4 bg-gray-800 text-gray-400 border-2 border-gray-700 px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg">
                        Pytanie {currentQuestionIndex + 1} / {currentQuiz.questions.length}
                    </div>

                    <div className="flex items-center gap-8 mb-6 mt-2">
                        <button
                            onClick={togglePlay}
                            disabled={!!feedback || isSubmitting}
                            className={`rounded-full p-6 transition-all hover:scale-105 shrink-0 ${
                                isPlaying ? 'bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-green-500 hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isPlaying ? (
                                <Pause fill="black" size={40} />
                            ) : (
                                <Play fill="black" size={40} className="ml-1" />
                            )}
                        </button>

                        <div className="flex-1 flex flex-col">
                            <div className={`flex justify-between font-mono mb-3 text-xl transition-colors ${isTimeRunningOut ? 'text-red-500' : 'text-green-500'}`}>
                                <span>0:00</span>
                                <span className={`font-bold ${isPlaying ? 'animate-pulse' : ''} ${isTimeRunningOut ? 'text-red-500' : 'text-white'}`}>
                                    0:{Math.ceil(timeLeft) < 10 ? `0${Math.ceil(timeLeft)}` : Math.ceil(timeLeft)}
                                </span>
                                <span>0:{question.time_limit || 30}</span>
                            </div>
                            <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-[width] ${isPlaying ? 'duration-100 ease-linear' : 'duration-0'} ${
                                        isTimeRunningOut
                                            ? 'bg-red-500 shadow-[0_0_15px_rgb(239,68,68)]'
                                            : 'bg-green-500 shadow-[0_0_10px_rgb(34,197,94)]'
                                    }`}
                                    style={{ width: `${(timeLeft / (question.time_limit || 30)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    
                    {audioDebug && (
                        <div className="text-red-400 text-sm font-bold text-center mt-2 bg-red-900/30 p-2 rounded-lg">
                            {audioDebug}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col justify-center items-center h-48 mb-16 max-w-4xl mx-auto w-full bg-gray-900/40 p-8 rounded-3xl border border-white/5">
                    <span className="text-2xl text-gray-500 mb-6">Brak dostępnych pytań w tym quizie. Przejdź do panelu /admin i dodaj muzykę do pytań.</span>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-gray-700 text-white font-bold uppercase rounded-xl hover:bg-gray-600 transition-colors"
                    >
                        Wróć do wyboru
                    </button>
                </div>
            )}

            <div className="w-full max-w-3xl mx-auto flex flex-col relative group">
                {feedback && (
                    <div className={`mb-6 p-6 rounded-2xl text-center text-3xl font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                        feedback.type === 'success' ? 'bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                    }`}>
                        {feedback.text}
                    </div>
                )}
                
                <div className="flex gap-4 relative">
                    <input
                        type="text"
                        placeholder="Zgaduj utwór..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSubmitting}
                        className="flex-1 bg-gray-900/80 border-2 border-gray-700 text-white p-5 text-2xl rounded-2xl outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all z-20 disabled:opacity-50"
                    />
                    <button
                        onClick={() => handleAnswerSubmit(inputValue)}
                        disabled={isSubmitting}
                        className="px-8 bg-green-500 text-black font-black text-xl rounded-2xl hover:bg-green-400 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)] z-20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ZATWIERDŹ
                    </button>
                </div>

                {showSuggestions && (
                    <div className="absolute top-full left-0 right-[200px] mt-2 bg-gray-900 border-2 border-gray-700 rounded-2xl max-h-60 overflow-y-auto z-30 shadow-2xl backdrop-blur-xl scrollbar-thin">
                        {filteredSuggestions.map((song, index) => (
                            <div
                                key={index}
                                onClick={() => {
                                    setInputValue(song.title);
                                    setActiveSuggestionIndex(-1);
                                }}
                                className={`p-4 border-b border-gray-800 last:border-0 cursor-pointer transition-all font-medium text-lg flex justify-between items-center ${
                                    index === activeSuggestionIndex 
                                    ? 'bg-green-500 text-black' 
                                    : 'hover:bg-green-500/50 text-white'
                                }`}
                            >
                                <span>{song.title}</span>
                                {song.artist && (
                                    <span className={`text-xs uppercase tracking-wider font-bold ml-4 shrink-0 px-2 py-0.5 rounded ${
                                        index === activeSuggestionIndex
                                        ? 'bg-black/20 text-black/80'
                                        : 'bg-gray-800 text-gray-400'
                                    }`}>
                                        {song.artist}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
