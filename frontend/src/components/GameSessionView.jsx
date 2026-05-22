import React, { useState, useEffect } from 'react';
import { Play, Pause, X, Volume2, VolumeX, ChevronRight, Music, Flame } from 'lucide-react';

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
    proceedToNextStep,
    volume,
    setVolume,
    sessionStreak
}) {
    const [songMetadata, setSongMetadata] = useState(null);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
    const [shrinkBar, setShrinkBar] = useState(false);

    const getPlaceholderGradient = (title) => {
        const gradients = [
            'from-purple-900/60 via-indigo-950/40 to-black border-purple-500/10',
            'from-emerald-900/60 via-teal-950/40 to-black border-emerald-500/10',
            'from-rose-900/60 via-red-950/40 to-black border-rose-500/10',
            'from-amber-900/60 via-orange-950/40 to-black border-amber-500/10',
            'from-blue-900/60 via-cyan-950/40 to-black border-blue-500/10',
            'from-fuchsia-900/60 via-pink-950/40 to-black border-fuchsia-500/10'
        ];
        if (!title) return gradients[0];
        let sum = 0;
        for (let i = 0; i < title.length; i++) {
            sum += title.charCodeAt(i);
        }
        return gradients[sum % gradients.length];
    };

    useEffect(() => {
        if (!feedback || !feedback.correctArtist || !feedback.correctTitle) {
            setSongMetadata(null);
            return;
        }

        let isMounted = true;
        setIsLoadingMetadata(true);

        const artist = feedback.correctArtist;
        const title = feedback.correctTitle;
        const query = `${artist} ${title}`;
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=1&entity=song`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                if (isMounted) {
                    if (data.results && data.results.length > 0) {
                        const result = data.results[0];
                        const artworkUrl = result.artworkUrl100 
                            ? result.artworkUrl100.replace('100x100bb', '400x400bb') 
                            : null;
                        setSongMetadata({
                            artworkUrl,
                            trackViewUrl: result.trackViewUrl,
                            trackName: result.trackName,
                            artistName: result.artistName,
                            trackId: result.trackId,
                            collectionId: result.collectionId
                        });
                    } else {
                        setSongMetadata(null);
                    }
                }
            })
            .catch(err => {
                console.error('Error fetching iTunes metadata:', err);
                if (isMounted) setSongMetadata(null);
            })
            .finally(() => {
                if (isMounted) setIsLoadingMetadata(false);
            });

        return () => {
            isMounted = false;
        };
    }, [feedback]);

    useEffect(() => {
        if (feedback && feedback.type === 'success') {
            setShrinkBar(false);
            const timer = setTimeout(() => {
                setShrinkBar(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setShrinkBar(false);
        }
    }, [feedback]);

    const getStreakLevelProps = (streak) => {
        if (!streak || streak === 0) {
            return {
                iconClass: 'text-gray-500 scale-100',
                textClass: 'text-white font-bold',
                label: 'Aktualna Seria',
                badge: null
            };
        }
        if (streak < 3) {
            return {
                iconClass: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)] scale-110',
                textClass: 'text-white font-bold',
                label: 'Aktualna Seria',
                badge: null
            };
        }
        if (streak < 6) {
            return {
                iconClass: 'text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] scale-120 animate-pulse',
                textClass: 'text-yellow-400 font-extrabold',
                label: 'Dobra Seria!',
                badge: (
                    <span className="text-[8px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-full uppercase tracking-wider absolute -top-3 left-1/2 transform -translate-x-1/2 animate-bounce">
                        GORĄCO!
                    </span>
                )
            };
        }
        return {
            iconClass: 'text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.9)] scale-130 animate-bounce duration-700',
            textClass: 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 font-black',
            label: 'W OGNIU!',
            badge: (
                <span className="text-[8px] font-black bg-gradient-to-r from-red-500 to-rose-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider absolute -top-3 left-1/2 transform -translate-x-1/2 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                    BOSKO! 🔥
                </span>
            )
        };
    };

    const streakProps = getStreakLevelProps(sessionStreak);
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

                    {/* Genre Display */}
                    <div className="text-center my-2 sm:my-3">
                        <span className="text-[10px] sm:text-xs font-bold tracking-widest text-gray-400 uppercase bg-gray-950/60 border border-gray-800 px-4 py-1.5 rounded-full inline-block shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
                            gatunek: <span className="text-green-500 font-black">{question?.song?.genre?.name || currentQuiz?.genre?.name || 'Mix'}</span>
                        </span>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center justify-center gap-3 mt-1 opacity-60 hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={() => setVolume(prev => prev > 0 ? 0 : 1)}
                            className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                            title={volume === 0 ? 'Włącz dźwięk' : 'Wycisz'}
                        >
                            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-32 sm:w-40 h-1.5 bg-gray-700/60 rounded-full appearance-none cursor-pointer
                                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-gray-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:bg-green-400 [&::-webkit-slider-thumb]:transition-colors
                                       [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:bg-gray-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:hover:bg-green-400
                                       [&::-moz-range-track]:bg-gray-700/60 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:h-1.5"
                        />
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                        <div className={`bg-gradient-to-b from-gray-900/95 to-black border-2 rounded-3xl max-w-2xl w-full p-5 sm:p-8 flex flex-col shadow-2xl relative overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-300 ${
                            feedback.type === 'success' 
                                ? 'border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)]' 
                                : 'border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]'
                        }`}>
                            
                            {/* Dynamic Blur Backdrop */}
                            {songMetadata?.artworkUrl && (
                                <div 
                                    className="absolute inset-0 bg-cover bg-center opacity-[0.18] blur-3xl scale-125 select-none pointer-events-none z-0 rounded-3xl"
                                    style={{ backgroundImage: `url(${songMetadata.artworkUrl})` }}
                                />
                            )}
                            
                            {/* Two-column layout container */}
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start w-full mb-2 z-10 relative">
                                
                                {/* Left Column: Cover Art and Apple Music link */}
                                <div className="flex flex-col items-center shrink-0 w-full md:w-auto">
                                    <div className="w-36 h-36 sm:w-56 sm:h-56 shadow-2xl rounded-2xl overflow-hidden border border-white/10 relative group/art bg-black/40 flex items-center justify-center shrink-0">
                                        {isLoadingMetadata ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-pulse">
                                                <Music size={48} className="text-white/20 animate-bounce mb-2" />
                                                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        ) : songMetadata?.artworkUrl ? (
                                            <img 
                                                src={songMetadata.artworkUrl} 
                                                alt={`${feedback.correctArtist} - ${feedback.correctTitle}`}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-105"
                                            />
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderGradient(feedback.correctTitle)} flex flex-col items-center justify-center p-4 text-center`}>
                                                <Music size={48} className="text-white/20 mb-2" />
                                                <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Brak okładki</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Apple Music Link or Shimmer Placeholder */}
                                    <div className="mt-4 flex items-center justify-center h-10 w-[135px] relative">
                                        {isLoadingMetadata ? (
                                            // Shimmer loader placeholder for Apple Music Badge to prevent layout shifts
                                            <div className="absolute inset-0 bg-zinc-800/80 animate-pulse rounded-[6px] border border-white/5 flex items-center justify-center">
                                                <div className="w-3.5 h-3.5 rounded-full bg-zinc-700 mr-2 animate-pulse"></div>
                                                <div className="w-16 h-2 bg-zinc-700 rounded animate-pulse"></div>
                                            </div>
                                        ) : songMetadata?.trackViewUrl ? (
                                            <a 
                                                href={songMetadata.trackViewUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                <img 
                                                    src="https://tools.applemediaservices.com/api/badges/listen-on-apple-music/badge/pl-pl?size=290x40" 
                                                    alt="Słuchaj w Apple Music"
                                                    className="h-10 w-auto shadow-md rounded-[6px]"
                                                />
                                            </a>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Right Column: Status info, Title/Artist, Streak stats, Next button */}
                                <div className="flex-1 w-full flex flex-col items-center md:items-start text-center md:text-left">
                                    
                                    {/* Points badge */}
                                    <div className={`px-4 py-1.5 rounded-full font-black text-xs sm:text-sm tracking-widest uppercase mb-3 border inline-block ${
                                        feedback.type === 'success'
                                            ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                            : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                    }`}>
                                        {feedback.type === 'success' ? `Gratulacje! +${feedback.points} PKT` : `Niestety! +${feedback.points} PKT`}
                                    </div>

                                    {/* Result text */}
                                    <h2 className={`text-2xl sm:text-4xl font-black tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r ${
                                        feedback.type === 'success' 
                                            ? 'from-green-400 to-emerald-300' 
                                            : 'from-red-500 to-rose-400'
                                    }`}>
                                        {feedback.text}
                                    </h2>

                                    {/* Metadata Info */}
                                    <div className="w-full mb-4">
                                        <h3 className="text-xl sm:text-2xl font-bold text-white line-clamp-1 mb-1" title={feedback.correctTitle}>
                                            {feedback.correctTitle}
                                        </h3>
                                        <p className="text-sm sm:text-base text-gray-400 font-medium line-clamp-1" title={feedback.correctArtist}>
                                            {feedback.correctArtist}
                                        </p>
                                    </div>

                                    {/* Stats Panel (Streak, Question Index & Time Taken) */}
                                    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 grid grid-cols-3 divide-x divide-white/10 text-center relative">
                                        <div className="flex flex-col items-center justify-center relative min-h-[50px]">
                                            {streakProps.badge}
                                            <div className={`flex items-center gap-1.5 transition-all duration-300 ${streakProps.iconClass}`}>
                                                <Flame fill={sessionStreak > 0 ? "currentColor" : "none"} size={20} />
                                                <span className={`${streakProps.textClass} text-base sm:text-xl font-black`}>{sessionStreak}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{streakProps.label}</span>
                                        </div>

                                        <div className="flex flex-col items-center justify-center min-h-[50px]">
                                            <span className="text-green-500 font-black text-base sm:text-xl">
                                                {currentQuestionIndex + 1} <span className="text-gray-400 text-xs font-normal">/ {currentQuiz?.questions?.length || 10}</span>
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Pytanie</span>
                                        </div>

                                        <div className="flex flex-col items-center justify-center min-h-[50px]">
                                            <span className="text-blue-400 font-black text-base sm:text-xl">
                                                {feedback.timeTaken !== undefined ? `${feedback.timeTaken.toFixed(1)}s` : '--'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Czas</span>
                                        </div>
                                    </div>

                                    {/* Main action button */}
                                    <div className="w-full">
                                        <button
                                            onClick={proceedToNextStep}
                                            className={`w-full font-black py-3.5 px-6 rounded-xl uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 border-2 ${
                                                feedback.type === 'success'
                                                    ? 'bg-green-500 border-green-500 hover:bg-green-400 text-black shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:shadow-[0_4px_20px_rgba(34,197,94,0.5)]'
                                                    : 'bg-white border-white hover:bg-gray-200 text-black shadow-[0_4px_15px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.4)]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>Następne pytanie</span>
                                                <kbd className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-normal ${
                                                    feedback.type === 'success'
                                                        ? 'bg-black/10 border-black/20 text-black/80'
                                                        : 'bg-gray-100 border-gray-300 text-gray-800'
                                                }`}>
                                                    Enter
                                                </kbd>
                                            </div>
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Countdown Bar */}
                            {feedback.type === 'success' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                                    <div 
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all ease-linear"
                                        style={{
                                            width: shrinkBar ? '0%' : '100%',
                                            transitionDuration: shrinkBar ? '3950ms' : '0ms'
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="h-14 sm:h-16 flex flex-row items-stretch gap-3 w-full relative">
                    <div className="flex-1 relative h-full">
                        <input
                            type="text"
                            placeholder="Zgaduj utwór..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSubmitting}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck="false"
                            enterKeyHint="send"
                            className="w-full bg-gray-900/80 border-2 border-gray-700 text-white h-full px-4 sm:px-5 text-base sm:text-xl rounded-xl sm:rounded-2xl outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all z-20 disabled:opacity-50"
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
                        onClick={() => {
                            if (feedback) {
                                proceedToNextStep();
                            } else {
                                if (inputValue.trim() === '') {
                                    handleAnswerSubmit('');
                                } else {
                                    handleAnswerSubmit(inputValue);
                                }
                            }
                        }}
                        disabled={isSubmitting && !feedback}
                        className={`flex items-center justify-center rounded-xl sm:rounded-2xl font-black text-lg transition-all z-20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-14 sm:w-auto sm:px-8 h-full border-2 ${
                            feedback 
                              ? 'bg-white text-black hover:bg-gray-200 border-white shadow-[0_4px_15px_rgba(255,255,255,0.3)]' 
                              : inputValue.trim() === ''
                                ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700/80 hover:border-gray-600'
                                : 'bg-green-500 border-green-500 text-black hover:bg-green-400 shadow-[0_10px_20px_rgba(34,197,94,0.3)]'
                        }`}
                        title={
                            feedback 
                              ? "Dalej" 
                              : inputValue.trim() === ''
                                ? "Pomiń utwór"
                                : "Zatwierdź odpowiedź"
                        }
                    >
                        <ChevronRight size={24} className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
                        <span className="hidden sm:inline ml-2 uppercase tracking-wider">
                            {feedback 
                              ? "Dalej" 
                              : inputValue.trim() === ''
                                ? "Pomiń"
                                : "Zatwierdź"
                            }
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
