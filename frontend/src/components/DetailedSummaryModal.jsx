import React, { useEffect, useState, useRef } from 'react';
import { 
    X, 
    Play, 
    Pause, 
    Music, 
    Disc, 
    Timer, 
    Flame, 
    Check, 
    Clock, 
    Trophy,
    Volume2,
} from 'lucide-react';
import { parseApiError } from '../utils/api';
import { useToast } from '../context/ToastContext';

// Helper for genre gradients
const getGenreGradientClass = (genreName) => {
    const name = (genreName || '').toLowerCase();
    if (name.includes('rock') || name.includes('metal')) {
        return 'from-red-600 to-orange-800 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
    }
    if (name.includes('pop') || name.includes('dance')) {
        return 'from-purple-500 to-pink-600 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
    }
    if (name.includes('rap') || name.includes('hip')) {
        return 'from-slate-700 to-indigo-950 shadow-[0_0_15px_rgba(99,102,241,0.15)]';
    }
    if (name.includes('latino') || name.includes('reggae')) {
        return 'from-amber-400 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
    }
    if (name.includes('electronic') || name.includes('house') || name.includes('techno')) {
        return 'from-cyan-500 to-blue-700 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
    }
    // Default gradient
    return 'from-green-500 to-teal-700 shadow-[0_0_15px_rgba(34,197,94,0.15)]';
};

// Helper for formatting media URLs (removing Docker hostname so it resolves via browser/proxy)
const getFullCoverUrl = (url) => {
    if (!url) return '';
    const idx = url.indexOf('/media/');
    return idx !== -1 ? url.substring(idx) : url;
};

export default function DetailedSummaryModal({ 
    sessionId, 
    currentQuiz, 
    onClose,
    difficultyLabels = { EASY: 'Łatwy', MEDIUM: 'Średni', HARD: 'Trudny' }
}) {
    const { showToast } = useToast();
    const [sessionData, setSessionData] = useState(null);
    const [quizData, setQuizData] = useState(currentQuiz);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentQuiz) {
            setQuizData(currentQuiz);
        }
    }, [currentQuiz]);

    useEffect(() => {
        const fetchQuizDetails = async () => {
            if (!sessionData || quizData || !sessionData.quiz) return;
            try {
                const res = await fetch(`/api/quizzes/${sessionData.quiz}/`);
                if (res.ok) {
                    const data = await res.json();
                    setQuizData(data);
                }
            } catch (err) {
                console.error("Failed to fetch quiz details in summary modal:", err);
            }
        };
        fetchQuizDetails();
    }, [sessionData, quizData]);
    const [artworks, setArtworks] = useState({});
    
    // Audio Player State
    const [currentPreviewUrl, setCurrentPreviewUrl] = useState(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const audioPlayerRef = useRef(new Audio());

    useEffect(() => {
        const fetchSessionDetails = async () => {
            if (!sessionId) return;
            setLoading(true);
            try {
                const response = await fetch(`/api/sessions/${sessionId}/`);
                if (response.ok) {
                    const data = await response.json();
                    setSessionData(data);
                } else {
                    showToast(await parseApiError(response), 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Nie udało się załadować szczegółów sesji.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchSessionDetails();
    }, [sessionId, showToast]);

    // Fetch song artworks dynamically from Apple Music (iTunes Search API)
    useEffect(() => {
        if (!sessionData) return;

        const fetchAllArtworks = async () => {
            const newArtworks = {};
            const cache = { ...artworks };

            for (const attempt of enrichedAttempts) {
                const song = attempt.questionObj?.song;
                if (!song) continue;
                
                const songKey = `${song.title}::${song.artist || ''}`;
                if (cache[songKey] || newArtworks[songKey]) continue;

                // Try to extract track ID from URL
                let trackId = null;
                const songUrl = song.apple_snippet_url || attempt.questionObj?.audio_url || '';
                
                const matchI = songUrl.match(/[?&]i=(\d+)/);
                if (matchI) {
                    trackId = matchI[1];
                } else {
                    const matchId = songUrl.match(/\/song\/[^/]+\/(\d+)|\/song\/(\d+)|\/album\/[^/]+\/[^/]+\/(\d+)/);
                    if (matchId) {
                        trackId = matchId[1] || matchId[2] || matchId[3];
                    }
                }

                try {
                    let artworkUrl = null;
                    
                    if (trackId) {
                        const res = await fetch(`https://itunes.apple.com/lookup?id=${trackId}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.results && data.results.length > 0) {
                                artworkUrl = data.results[0].artworkUrl100;
                            }
                        }
                    }

                    if (!artworkUrl) {
                        const searchTerm = `${song.title} ${song.artist || ''}`.trim();
                        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&limit=1`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.results && data.results.length > 0) {
                                artworkUrl = data.results[0].artworkUrl100;
                            }
                        }
                    }

                    if (artworkUrl) {
                        const scaledUrl = artworkUrl.replace('100x100bb', '200x200bb');
                        newArtworks[songKey] = scaledUrl;
                    }
                } catch (err) {
                    console.error(`Failed to fetch artwork for ${songKey}:`, err);
                }
            }

            if (Object.keys(newArtworks).length > 0) {
                setArtworks(prev => ({ ...prev, ...newArtworks }));
            }
        };

        fetchAllArtworks();
    }, [sessionData]);

    // Handle closing and stopping audio
    const handleClose = () => {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
        setIsAudioPlaying(false);
        onClose();
    };

    // Close on ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Audio Playback logic
    const togglePlayPreview = (url) => {
        if (!url) return;
        const player = audioPlayerRef.current;
        
        if (currentPreviewUrl === url) {
            if (isAudioPlaying) {
                player.pause();
                setIsAudioPlaying(false);
            } else {
                player.play()
                    .then(() => setIsAudioPlaying(true))
                    .catch(e => {
                        console.error(e);
                        showToast('Błąd odtwarzania fragmentu piosenki.', 'error');
                    });
            }
        } else {
            player.pause();
            player.src = url;
            player.load();
            player.play()
                .then(() => {
                    setCurrentPreviewUrl(url);
                    setIsAudioPlaying(true);
                })
                .catch(e => {
                    console.error(e);
                    showToast('Błąd odtwarzania fragmentu piosenki.', 'error');
                });
        }
    };

    // Listen to native audio events to keep state sync
    useEffect(() => {
        const player = audioPlayerRef.current;
        const handleEnded = () => setIsAudioPlaying(false);
        const handlePause = () => setIsAudioPlaying(false);
        const handlePlay = () => setIsAudioPlaying(true);

        player.addEventListener('ended', handleEnded);
        player.addEventListener('pause', handlePause);
        player.addEventListener('play', handlePlay);

        return () => {
            player.removeEventListener('ended', handleEnded);
            player.removeEventListener('pause', handlePause);
            player.removeEventListener('play', handlePlay);
        };
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-t-green-500 border-green-500/20 rounded-full animate-spin"></div>
                    <span className="text-sm font-black tracking-widest text-green-500 uppercase">Ładowanie szczegółów...</span>
                </div>
            </div>
        );
    }

    if (!sessionData) return null;

    // Combine questions with attempts and compute streaks
    const questionsMap = {};
    if (quizData?.questions) {
        quizData.questions.forEach(q => {
            questionsMap[q.id] = q;
        });
    }

    // Attempts sorted chronologically to compute streaks
    const attempts = [...(sessionData.attempts || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    let consecutiveCorrect = 0;
    const enrichedAttempts = attempts.map(attempt => {
        const questionObj = questionsMap[attempt.question];
        const streakBefore = consecutiveCorrect;
        
        if (attempt.is_correct) {
            consecutiveCorrect += 1;
        } else {
            consecutiveCorrect = 0;
        }

        const difficultyLimits = { EASY: 30, MEDIUM: 15, HARD: 5 };
        const timeLimit = difficultyLimits[sessionData.chosen_difficulty] || 15;

        return {
            ...attempt,
            questionObj,
            streakBefore,
            timeLimit
        };
    });

    const diffMultipliers = { EASY: 1.0, MEDIUM: 1.5, HARD: 2.0 };
    const difficultyMultiplier = diffMultipliers[sessionData.chosen_difficulty] || 1.5;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-300">
            <div className="bg-gradient-to-b from-gray-950 to-black w-full sm:max-w-4xl h-full sm:h-[85vh] sm:rounded-3xl border-0 sm:border border-white/10 flex flex-col shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden">
                
                {/* Header close button */}
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                    <X size={18} />
                </button>

                {/* Top Cover Banner */}
                <div className="p-6 pt-12 sm:pt-8 bg-gradient-to-b from-green-950/20 to-transparent border-b border-white/5 relative shrink-0">
                    <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-end text-center sm:text-left">
                        {/* Quiz cover or genre gradient placeholder */}
                        {quizData?.cover_image ? (
                            <img 
                                src={getFullCoverUrl(quizData.cover_image)} 
                                alt={quizData.title} 
                                className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-2xl border border-white/10 shadow-lg shadow-black/55 shrink-0"
                            />
                        ) : (
                            <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br ${getGenreGradientClass(quizData?.genre?.name)} flex items-center justify-center border border-white/10 shadow-lg shadow-black/55 shrink-0`}>
                                <Disc size={48} className="text-white/40 animate-spin" style={{ animationDuration: '8s' }} />
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5 min-w-0">
                            <span className="text-[10px] font-black tracking-widest text-green-500 uppercase">
                                Szczegółowe podsumowanie
                            </span>
                            <h1 className="text-xl sm:text-3xl font-black text-white truncate max-w-md sm:max-w-xl">
                                {quizData?.title || 'Muzyczny Quiz'}
                            </h1>
                            <p className="text-xs text-gray-400 font-medium line-clamp-1 max-w-sm sm:max-w-md">
                                {quizData?.description || 'Zgadnij tytuły piosenek ze słuchu.'}
                            </p>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5 text-xs text-gray-400 font-bold">
                                <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-green-400">
                                    {difficultyLabels[sessionData.chosen_difficulty]} ({difficultyMultiplier.toFixed(1)}x)
                                </span>
                                <span>•</span>
                                <span>{sessionData.correct_count} / {sessionData.total_questions} popr.</span>
                                <span>•</span>
                                <span>{sessionData.total_points} pkt</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Playlist Song List Area */}
                <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 min-h-0">
                    <div className="flex flex-col gap-2">
                        {/* Header titles */}
                        <div className="grid grid-cols-[30px_1fr_90px] sm:grid-cols-[40px_1.5fr_1fr_90px] gap-4 px-3 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500 border-b border-white/5 select-none items-center">
                            <div className="text-center">#</div>
                            <div>Utwór</div>
                            <div className="hidden sm:block">Czas zgadnięcia</div>
                            <div className="text-right">Punkty</div>
                        </div>

                        {/* Song items */}
                        {enrichedAttempts.map((attempt, index) => {
                            const song = attempt.questionObj?.song;
                            const isPlayingThis = currentPreviewUrl === (attempt.questionObj?.audio_source_url || attempt.questionObj?.audio_source_file) && isAudioPlaying;
                            const audioUrl = attempt.questionObj?.audio_source_url || attempt.questionObj?.audio_source_file;
                            
                            // Compute remaining time (timeLeft) percentages to reflect in-game shrinking bar (right-to-left)
                            const totalTimeLimit = attempt.timeLimit || 15;
                            const timeLeft = Math.max(0, totalTimeLimit - attempt.time_taken_seconds);
                            const gracePercent = Math.min(80, (2.0 / totalTimeLimit) * 100);
                            const nonGracePercent = 100 - gracePercent;
                            const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalTimeLimit) * 100));
                            const activeMainPercent = Math.min(progressPercent, nonGracePercent);
                            const activeGracePercent = Math.max(0, progressPercent - nonGracePercent);

                            return (
                                <div 
                                    key={attempt.id}
                                    className="grid grid-cols-[30px_1fr_90px] sm:grid-cols-[40px_1.5fr_1fr_90px] gap-4 p-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all items-center border border-transparent hover:border-white/5 group"
                                >
                                    {/* Number / Status Icon */}
                                    <div className="flex items-center justify-center">
                                        <div className="text-xs font-black text-gray-600 group-hover:hidden select-none">
                                            {index + 1}
                                        </div>
                                        <div className={`hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full ${attempt.is_correct ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                            {attempt.is_correct ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                                        </div>
                                    </div>

                                    {/* Thumbnail + Song details */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Thumbnail with play overlay */}
                                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 group/cover">
                                            {/* Apple Music Artwork */}
                                            {artworks[`${song?.title}::${song?.artist || ''}`] ? (
                                                <img 
                                                    src={artworks[`${song?.title}::${song?.artist || ''}`]} 
                                                    alt={song?.title} 
                                                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                                                />
                                            ) : (
                                                <div className={`absolute inset-0 bg-gradient-to-br ${getGenreGradientClass(song?.genre?.name)} flex items-center justify-center`}>
                                                    <Music size={16} className="text-white/30" />
                                                </div>
                                            )}

                                            {/* Audio play overlay */}
                                            {audioUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => togglePlayPreview(audioUrl)}
                                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity cursor-pointer text-white"
                                                    aria-label={isPlayingThis ? 'Wstrzymaj fragment' : 'Odsłuchaj fragment'}
                                                >
                                                    {isPlayingThis ? (
                                                        <Pause size={16} fill="currentColor" className="animate-scale-in" />
                                                    ) : (
                                                        <Play size={16} fill="currentColor" className="translate-x-0.5 animate-scale-in" />
                                                    )}
                                                </button>
                                            )}

                                            {/* Playing Equalizer Overlay if active */}
                                            {isPlayingThis && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover/cover:hidden pointer-events-none">
                                                    <div className="flex items-end gap-0.5 h-3 text-green-500">
                                                        <span className="w-0.5 bg-green-500 rounded-full animate-[bounce_0.8s_infinite_100ms] h-2"></span>
                                                        <span className="w-0.5 bg-green-500 rounded-full animate-[bounce_0.8s_infinite_300ms] h-3"></span>
                                                        <span className="w-0.5 bg-green-500 rounded-full animate-[bounce_0.8s_infinite_500ms] h-1.5"></span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0 text-left">
                                            <span className={`text-xs font-black truncate ${attempt.is_correct ? 'text-white' : 'text-gray-400 line-through'}`}>
                                                {song?.title || 'Nieznany tytuł'}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-bold truncate">
                                                {song?.artist || 'Nieznany artysta'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Guess Time Visualization Track (Hidden on mobile) */}
                                    <div className="hidden sm:flex flex-col gap-1 pr-4">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-500 tracking-wider select-none">
                                            <span className="flex items-center gap-1">
                                                <Timer size={10} />
                                                Czas: {attempt.time_taken_seconds.toFixed(1)}s
                                            </span>
                                            <span className="opacity-70">Limit: {attempt.timeLimit}s</span>
                                        </div>
                                        {/* Progress Bar with positioned thumb mirroring the in-game timer bar layout */}
                                        <div className="w-full h-2 rounded-full bg-white/5 border border-white/5 relative overflow-hidden select-none">
                                            {/* Grace period background stripe on the right */}
                                            <div 
                                                className="absolute top-0 bottom-0 right-0 bg-yellow-400/10 border-l border-yellow-400/20"
                                                style={{ width: `${gracePercent}%` }}
                                            />
                                            {/* End of grace period divider marker */}
                                            <div 
                                                className="absolute top-0 bottom-0 w-[1px] bg-yellow-400/50 shadow-[0_0_5px_rgba(250,204,21,0.5)] z-20"
                                                style={{ right: `${gracePercent}%` }}
                                            />
                                            {/* Green/Red active main bar on the left */}
                                            <div 
                                                className={`absolute top-0 bottom-0 left-0 rounded-l-full transition-all duration-300 ${
                                                    attempt.is_correct 
                                                        ? 'bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                                                        : 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                                }`}
                                                style={{ 
                                                    width: `${activeMainPercent}%`,
                                                    boxShadow: attempt.is_correct 
                                                        ? '0 0 10px rgba(34,197,94,0.4)' 
                                                        : '0 0 10px rgba(239,68,68,0.4)'
                                                }}
                                            />
                                            {/* Yellow active grace bar on the right */}
                                            <div 
                                                className="absolute top-0 bottom-0 bg-yellow-400 transition-all duration-300"
                                                style={{ 
                                                    left: `${nonGracePercent}%`, 
                                                    width: `${activeGracePercent}%`,
                                                    boxShadow: '0 0 10px rgba(250,204,21,0.4)'
                                                }}
                                            />
                                            {/* Thumb handle indicator at progressPercent */}
                                            <div 
                                                className={`absolute w-2 h-2 rounded-full top-0 border border-gray-950 -translate-x-1/2 z-30 transition-all duration-300 ${
                                                    attempt.is_correct ? 'bg-green-400 shadow-md' : 'bg-red-400 shadow-md'
                                                }`}
                                                style={{ left: `${progressPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Points and streaks */}
                                    <div className="flex flex-col items-end justify-center min-w-0 select-none">
                                        <span className={`text-sm font-black tracking-tight ${attempt.is_correct ? 'text-green-400' : 'text-gray-600'}`}>
                                            {attempt.is_correct ? `+${attempt.points_awarded}` : '+0'}
                                        </span>
                                        {/* Streak Badge */}
                                        {attempt.is_correct && attempt.streakBefore > 0 && (
                                            <div className="flex items-center gap-0.5 bg-orange-500/10 border border-orange-500/30 px-1 py-0.5 rounded text-[8px] font-black text-orange-400 uppercase tracking-widest mt-0.5 animate-pulse">
                                                <Flame size={8} fill="currentColor" />
                                                <span>+{attempt.streakBefore * 10}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer close */}
                <div className="p-4 sm:p-5 bg-black/60 border-t border-white/5 flex items-center justify-end shrink-0 select-none">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="py-3 px-8 bg-green-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-green-400 active:scale-95 transition-all shadow-[0_5px_15px_rgba(34,197,94,0.25)] hover:shadow-[0_5px_20px_rgba(34,197,94,0.45)] cursor-pointer"
                    >
                        Zamknij podsumowanie
                    </button>
                </div>

            </div>
        </div>
    );
}
