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
    onQuit,
    proceedToNextStep
}) {
    const question = currentQuiz?.questions?.[currentQuestionIndex];
    const totalTimeLimit = question?.time_limit || 30;
    const isGracePeriod = (totalTimeLimit - timeLeft) <= 2.0 && timeLeft > 0;
    const isTimeRunningOut = timeLeft <= (totalTimeLimit <= 8 ? totalTimeLimit * 0.3 : 5) && timeLeft > 0 && !isGracePeriod;
    const gracePercent = Math.min(80, (2.0 / totalTimeLimit) * 100);
    const progressPercent = (timeLeft / totalTimeLimit) * 100;
    const progressScale = progressPercent > 0 ? (10000 / progressPercent) : 100;

    return (
        <div className="w-full">
            {question ? (
                <div className="flex flex-col sm:relative mb-16 max-w-4xl mx-auto w-full bg-gray-900/40 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/5">
                    {/* Top control bar: absolute on desktop, in-flow on mobile */}
                    <div className="flex justify-between items-center w-full mb-6 sm:mb-2">
                        <button
                            onClick={onQuit}
                            className="sm:absolute sm:-top-4 sm:-left-4 flex items-center gap-2 bg-red-950/80 hover:bg-red-900 text-red-400 hover:text-red-200 border-2 border-red-900/50 px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 z-10"
                            title="Przerwij quiz i wróć do menu"
                        >
                            <X size={16} />
                            Przerwij
                        </button>

                        <div className="sm:absolute sm:-top-4 sm:-right-4 bg-gray-800 text-gray-400 border-2 border-gray-700 px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg">
                            Pytanie {currentQuestionIndex + 1} / {currentQuiz.questions.length}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-8 mb-6 mt-2">
                        <button
                            onClick={togglePlay}
                            disabled={!!feedback || isSubmitting}
                            className={`rounded-full p-4 sm:p-6 transition-all hover:scale-105 shrink-0 ${
                                isPlaying ? 'bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-green-500 hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isPlaying ? (
                                <Pause fill="black" size={24} className="w-6 h-6 sm:w-10 sm:h-10" />
                            ) : (
                                <Play fill="black" size={24} className="ml-0.5 w-6 h-6 sm:w-10 sm:h-10" />
                            )}
                        </button>

                        <div className="flex-1 flex flex-col">
                            <div className={`flex justify-between items-center font-mono mb-3 text-sm sm:text-xl transition-colors ${
                                isGracePeriod 
                                    ? 'text-yellow-400' 
                                    : isTimeRunningOut 
                                        ? 'text-red-500' 
                                        : 'text-green-500'
                            }`}>
                                <span>0:00</span>
                                <div className="flex flex-col items-center">
                                    <span className={`font-bold ${isPlaying ? 'animate-pulse' : ''} ${
                                        isGracePeriod
                                            ? 'text-yellow-400'
                                            : isTimeRunningOut
                                                ? 'text-red-500'
                                                : 'text-white'
                                    }`}>
                                        0:{Math.ceil(timeLeft) < 10 ? `0${Math.ceil(timeLeft)}` : Math.ceil(timeLeft)}
                                    </span>
                                    {isGracePeriod && isPlaying && (
                                        <span className="text-[10px] font-black bg-yellow-400 text-black px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 animate-pulse">
                                            BEZPIECZNE 2S
                                        </span>
                                    )}
                                </div>
                                <span>0:{totalTimeLimit}</span>
                            </div>
                            <div 
                                className="w-full h-4 bg-gray-800 rounded-full overflow-hidden relative"
                                style={{
                                    background: `linear-gradient(to right, rgb(31, 41, 55) 0%, rgb(31, 41, 55) ${100 - gracePercent}%, rgba(250, 204, 21, 0.3) ${100 - gracePercent}%, rgba(250, 204, 21, 0.3) 100%)`
                                }}
                            >
                                <div 
                                    className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] z-20"
                                    style={{ right: `${gracePercent}%` }}
                                    title="Koniec bezpiecznego czasu (2 sekundy)"
                                ></div>
                                <div
                                    className="absolute inset-y-0 left-0 right-0"
                                    style={{
                                        clipPath: `inset(0 ${100 - progressPercent}% 0 0)`,
                                        transition: isPlaying ? 'clip-path 100ms linear' : 'none',
                                        background: `linear-gradient(to right, ${
                                            isTimeRunningOut 
                                                ? 'rgb(239, 68, 68)' 
                                                : 'rgb(34, 197, 94)'
                                        } 0%, ${
                                            isTimeRunningOut 
                                                ? 'rgb(239, 68, 68)' 
                                                : 'rgb(34, 197, 94)'
                                        } ${100 - gracePercent}%, rgb(250, 204, 21) ${100 - gracePercent}%, rgb(250, 204, 21) 100%)`,
                                        boxShadow: isTimeRunningOut 
                                            ? '0 0 15px rgba(239,68,68,0.6)' 
                                            : isGracePeriod
                                                ? '0 0 15px rgba(250,204,21,0.6)'
                                                : '0 0 10px rgba(34,197,94,0.6)'
                                    }}
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
                    <div className={`mb-6 p-4 sm:p-6 rounded-2xl text-center text-xl sm:text-3xl font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col items-center justify-center ${
                        feedback.type === 'success' ? 'bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                    }`}>
                        <div>{feedback.text}</div>
                        {feedback.type === 'error' && feedback.correctTitle && (
                            <div className="text-sm sm:text-lg font-bold tracking-normal normal-case mt-2 text-red-200">
                                Poprawna odpowiedź: <span className="underline decoration-red-400 font-extrabold text-white">{feedback.correctArtist} - {feedback.correctTitle}</span>
                            </div>
                        )}
                        {feedback.type === 'error' && (
                            <button
                                onClick={proceedToNextStep}
                                className="mt-4 px-5 py-2 bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_rgba(255,255,255,0.2)]"
                            >
                                Dalej (Enter)
                            </button>
                        )}
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 relative">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Zgaduj utwór..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSubmitting}
                            className="w-full bg-gray-900/80 border-2 border-gray-700 text-white p-4 sm:p-5 text-lg sm:text-2xl rounded-xl sm:rounded-2xl outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all z-20 disabled:opacity-50"
                        />
                        
                        {showSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border-2 border-gray-700 rounded-2xl max-h-60 overflow-y-auto z-30 shadow-2xl backdrop-blur-xl scrollbar-thin">
                                {filteredSuggestions.map((song, index) => (
                                    <div
                                        key={index}
                                        onClick={() => {
                                            setInputValue(song.title);
                                            setActiveSuggestionIndex(-1);
                                        }}
                                        className={`p-3 sm:p-4 border-b border-gray-800 last:border-0 cursor-pointer transition-all font-medium text-sm sm:text-lg flex justify-between items-center ${
                                            index === activeSuggestionIndex 
                                            ? 'bg-green-500 text-black' 
                                            : 'hover:bg-green-500/50 text-white'
                                        }`}
                                    >
                                        <span>{song.title}</span>
                                        {song.artist && (
                                            <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-bold ml-4 shrink-0 px-2 py-0.5 rounded ${
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
                    
                    <button
                        onClick={() => handleAnswerSubmit(inputValue)}
                        disabled={isSubmitting}
                        className="py-4 sm:py-0 px-8 bg-green-500 text-black font-black text-lg sm:text-xl rounded-xl sm:rounded-2xl hover:bg-green-400 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)] z-20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ZATWIERDŹ
                    </button>
                </div>
            </div>
        </div>
    );
}
