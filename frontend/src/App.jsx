import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Menu, Trophy, Flame, X, Play, Clock, Music, Sparkles, BarChart2, Settings, Zap, Timer, Hash } from 'lucide-react';

const DIFFICULTY_TIME_MAP = { EASY: 30, MEDIUM: 15, HARD: 5 };
const DIFFICULTY_LABELS = { EASY: 'Łatwy', MEDIUM: 'Średni', HARD: 'Trudny' };
const QUESTION_PRESETS = [5, 10, 15, 20];

const getPlaceholderGradient = (title) => {
    const gradients = [
        'from-purple-900/60 via-indigo-950/40 to-black border-purple-500/10',
        'from-emerald-900/60 via-teal-950/40 to-black border-emerald-500/10',
        'from-rose-900/60 via-red-950/40 to-black border-rose-500/10',
        'from-amber-900/60 via-orange-950/40 to-black border-amber-500/10',
        'from-blue-900/60 via-cyan-950/40 to-black border-blue-500/10',
        'from-fuchsia-900/60 via-pink-950/40 to-black border-fuchsia-500/10'
    ];
    let sum = 0;
    for (let i = 0; i < title.length; i++) {
        sum += title.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
};

const getSongsPlural = (n) => {
    if (n === 1) return `${n} utwór`;
    const lastDigit = n % 10;
    const lastTwo = n % 100;
    if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
        return `${n} utwory`;
    }
    return `${n} utworów`;
};

import Stats from './components/Stats';
import Friends from './components/Friends';
import Profile from './components/Profile';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';

import HomeView from './components/HomeView';
import GameSessionView from './components/GameSessionView';
import SummaryView from './components/SummaryView';
import { pytaniaPlural } from './utils/plurals';

function GameView() {
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // Globalne statystyki profilu
  const [, setGlobalStreak] = useState(0);
  const [, setGlobalPoints] = useState(0);

  // Lokalne statystyki dla obecnej sesji quizu
  const [sessionStreak, setSessionStreak] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [fastestCorrectTime, setFastestCorrectTime] = useState(null);
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);

  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [quizzes, setQuizzes] = useState([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isLoadingQuizDetail, setIsLoadingQuizDetail] = useState(false);
  const [dbSuggestions, setDbSuggestions] = useState([]);
  const suggestionsCache = useRef({});
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [apiDebug, setApiDebug] = useState(null);
  const [audioDebug, setAudioDebug] = useState('');

  // Filtrowanie i kategorie
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [selectedQuizForPreview, setSelectedQuizForPreview] = useState(null);
  const [chosenDifficulty, setChosenDifficulty] = useState('MEDIUM');
  const [chosenNumQuestions, setChosenNumQuestions] = useState(10);
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);
  const [wasPlayingBeforeQuitConfirm, setWasPlayingBeforeQuitConfirm] = useState(false);
  const [selectedRandomGenreIds, setSelectedRandomGenreIds] = useState([]);
  const [genres, setGenres] = useState([]);

  const toggleRandomGenreId = (genreId) => {
    setSelectedRandomGenreIds(prev => 
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const audioRef = useRef(null);
  const nextQuestionTimeoutRef = useRef(null);
  const audioFadeIntervalRef = useRef(null);

  const [volume, setVolume] = useState(() => {
      const stored = localStorage.getItem('quizVolume');
      return stored !== null ? parseFloat(stored) : 1;
  });

  const clearAudioFade = () => {
    if (audioFadeIntervalRef.current) {
      clearInterval(audioFadeIntervalRef.current);
      audioFadeIntervalRef.current = null;
    }
  };

  const fadeInAudio = () => {
    if (!audioRef.current) return;
    const targetVolume = volume * volume;
    
    clearAudioFade();
    
    // Rozpocznij od głośności 0
    audioRef.current.volume = 0;
    
    audioRef.current.play().then(() => {
        setIsPlaying(true);
        const duration = 600; // czas wygaszania (ms)
        const stepTime = 30; // krok czasowy (ms)
        const steps = duration / stepTime;
        let step = 0;
        
        audioFadeIntervalRef.current = setInterval(() => {
            step++;
            const progress = step / steps;
            // Kwadratowe ease-in dla naturalnego przejścia głośności
            const newVol = progress * progress * targetVolume;
            
            if (audioRef.current) {
                audioRef.current.volume = Math.min(newVol, targetVolume);
            }
            
            if (step >= steps) {
                clearAudioFade();
                if (audioRef.current) {
                    audioRef.current.volume = targetVolume;
                }
            }
        }, stepTime);
    }).catch(e => {
        console.error("Audio play/fade-in error:", e);
        // Fallback w razie blokady autoodtwarzania przeglądarki
        if (audioRef.current) {
            audioRef.current.volume = targetVolume;
        }
    });
  };

  const fadeOutAudio = (onComplete) => {
    if (!audioRef.current) { onComplete?.(); return; }
    const currentVol = audioRef.current.volume;
    if (currentVol === 0) { audioRef.current.pause(); onComplete?.(); return; }
    
    clearAudioFade();
    
    const duration = 700; // czas wyciszania (ms)
    const stepTime = 25;
    const steps = duration / stepTime;
    let step = 0;
    
    audioFadeIntervalRef.current = setInterval(() => {
        step++;
        const progress = step / steps;
        // Kwadratowe ease-out dla naturalnego wyciszenia
        const newVol = currentVol * (1 - progress) * (1 - progress);
        
        if (audioRef.current) {
            audioRef.current.volume = Math.max(newVol, 0);
        }
        
        if (step >= steps) {
            clearAudioFade();
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.volume = volume * volume;
            }
            setIsPlaying(false);
            onComplete?.();
        }
    }, stepTime);
  };

  useEffect(() => {
    if (audioRef.current && !audioFadeIntervalRef.current) {
      audioRef.current.volume = volume * volume;
    }
    localStorage.setItem('quizVolume', volume.toString());
  }, [volume]);

  // Prevent pull-to-refresh on mobile when in a quiz session
  useEffect(() => {
    if (currentQuiz && !sessionSummary) {
      document.body.style.overscrollBehaviorY = 'none';
      document.documentElement.style.overscrollBehaviorY = 'none';
    } else {
      document.body.style.overscrollBehaviorY = 'auto';
      document.documentElement.style.overscrollBehaviorY = 'auto';
    }
    return () => {
      document.body.style.overscrollBehaviorY = 'auto';
      document.documentElement.style.overscrollBehaviorY = 'auto';
    };
  }, [currentQuiz, sessionSummary]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile/');
        if (res.ok) {
          const data = await res.json();
          setGlobalStreak(data.current_streak);
          setGlobalPoints(data.total_points);
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error(err);
        setIsLoggedIn(false);
      }
    };

    const fetchQuizzes = async () => {
      try {
        setIsLoadingQuizzes(true);
        const res = await fetch('/api/quizzes/');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setQuizzes(data);
          } else if (data && Array.isArray(data.results)) {
            setQuizzes(data.results);
          } else {
             setApiDebug(`Otrzymano dziwny format: ${JSON.stringify(data).substring(0, 100)}`);
          }
        } else {
            const errText = await res.text();
            setApiDebug(`Błąd serwera (Kod ${res.status}): ${errText.substring(0, 200)}`);
        }
      } catch (err) {
        console.error(err);
        setApiDebug(`Błąd sieci: ${err.message}`);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };

    const fetchGenres = async () => {
      try {
        const res = await fetch('/api/genres/?show_categories=true');
        if (res.ok) {
          const data = await res.json();
          setGenres(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      }
    };

    fetchProfile();
    fetchQuizzes();
    fetchGenres();
  }, []);

  // Reset indeksu podpowiedzi przy zmianie tekstu
  useEffect(() => {
      setActiveSuggestionIndex(-1);
  }, [inputValue]);

  // Dynamic fetching of suggestions as the user types (with debounce and caching)
  useEffect(() => {
    if (!inputValue || inputValue.trim().length < 2) {
      setDbSuggestions([]);
      return;
    }

    const trimmedValue = inputValue.trim().toLowerCase();
    if (suggestionsCache.current[trimmedValue]) {
      setDbSuggestions(suggestionsCache.current[trimmedValue]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/songs/?search=${encodeURIComponent(inputValue)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const songsList = Array.isArray(data) ? data : (data?.results || []);
          
          const formattedSongs = [];
          const seen = new Set();
          songsList.forEach(s => {
            const key = `${(s.title || '').toLowerCase()}::${(s.artist || '').toLowerCase()}`;
            if (s.title && !seen.has(key)) {
              seen.add(key);
              formattedSongs.push({ title: s.title, artist: s.artist || '' });
            }
          });
          
          suggestionsCache.current[trimmedValue] = formattedSongs;
          setDbSuggestions(formattedSongs);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, 150); // 150ms debounce (near-instant feedback with reduced server hit)

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  useEffect(() => {
    if (selectedQuizForPreview) {
      const isRandom = selectedQuizForPreview.isRandomQuizPlaceholder;
      const totalSongsInGenres = genres.reduce((acc, g) => acc + (g.songs_count || 0), 0);
      const maxQ = isRandom
        ? (selectedRandomGenreIds.length > 0
            ? selectedRandomGenreIds.reduce((sum, id) => {
                const g = genres.find(genre => genre.id.toString() === id.toString());
                return sum + (g?.songs_count || 0);
              }, 0)
            : totalSongsInGenres)
        : (selectedQuizForPreview.questions?.length || selectedQuizForPreview.questions_count || 20);
      
      // Clamp chosenNumQuestions to maxQ
      if (chosenNumQuestions > maxQ) {
        setChosenNumQuestions(maxQ > 0 ? Math.min(10, maxQ) : 0);
      } else if (chosenNumQuestions === 0 && maxQ > 0) {
        setChosenNumQuestions(Math.min(10, maxQ));
      }
    }
  }, [selectedRandomGenreIds, selectedQuizForPreview, genres]);

  const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const handleSelectQuizForPreview = async (quiz) => {
    setSelectedQuizForPreview(quiz);
    setChosenDifficulty('MEDIUM');
    setChosenNumQuestions(10);
    setSelectedRandomGenreIds([]); // reset genre selection for the new session
    if (quiz.isRandomQuizPlaceholder) {
      setIsLoadingQuizDetail(false);
      return;
    }
    setIsLoadingQuizDetail(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/`);
      if (res.ok) {
        const detailedQuiz = await res.json();
        setSelectedQuizForPreview(detailedQuiz);
        // Update num questions if quiz detail has more info
        const maxQ = detailedQuiz.questions?.length || detailedQuiz.questions_count || 10;
        const defaultNum = detailedQuiz.num_questions_to_ask || 10;
        setChosenNumQuestions(Math.min(defaultNum, maxQ));
      } else {
        console.error("Failed to load quiz details");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingQuizDetail(false);
    }
  };

  const startSession = async (quiz, difficulty, numQuestions) => {
    if (nextQuestionTimeoutRef.current) {
        clearTimeout(nextQuestionTimeoutRef.current);
        nextQuestionTimeoutRef.current = null;
    }
    setFeedback(null);

    const sessionDifficulty = difficulty || chosenDifficulty || quiz.difficulty || 'MEDIUM';
    const sessionTimeLimit = DIFFICULTY_TIME_MAP[sessionDifficulty] || 15;

    let fullQuiz = quiz;
    if (quiz.isRandomQuizPlaceholder) {
      setIsLoadingQuizDetail(true);
      try {
        const res = await fetch('/api/quizzes/create-random/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genre_ids: selectedRandomGenreIds,
            difficulty: sessionDifficulty,
            num_questions: numQuestions
          })
        });
        if (res.ok) {
          fullQuiz = await res.json();
        } else {
          const errData = await res.json();
          console.error("Failed to generate random quiz:", errData.error);
          alert(errData.error || "Wystąpił błąd podczas generowania losowego quizu.");
          setIsLoadingQuizDetail(false);
          return;
        }
      } catch (err) {
        console.error("Error generating random quiz:", err);
        setIsLoadingQuizDetail(false);
        return;
      } finally {
        setIsLoadingQuizDetail(false);
      }
    } else if (!fullQuiz.questions) {
      setIsLoadingQuizDetail(true);
      try {
        const res = await fetch(`/api/quizzes/${quiz.id}/`);
        if (res.ok) {
          fullQuiz = await res.json();
        } else {
          console.error("Failed to fetch quiz detail in startSession");
          setIsLoadingQuizDetail(false);
          return;
        }
      } catch (err) {
        console.error(err);
        setIsLoadingQuizDetail(false);
        return;
      } finally {
        setIsLoadingQuizDetail(false);
      }
    }

    const shuffledQuestions = shuffleArray(fullQuiz.questions || []);
    const limit = numQuestions || chosenNumQuestions || fullQuiz.num_questions_to_ask || 10;
    const limitedQuestions = shuffledQuestions.slice(0, limit);
    // Override time_limit on all questions based on chosen difficulty
    const questionsWithTimeOverride = limitedQuestions.map(q => ({
      ...q,
      time_limit: sessionTimeLimit
    }));
    const quizWithShuffled = { ...fullQuiz, questions: questionsWithTimeOverride };

    setCurrentQuiz(quizWithShuffled);
    setCurrentQuestionIndex(0);
    setSessionSummary(null);
    setAudioDebug('');
    setIsSubmitting(false);
    setSessionStreak(0); // Reset lokalnego streaka
    setSessionPoints(0); // Reset lokalnych punktów
    setMaxStreak(0);
    setFastestCorrectTime(null);
    setTotalTimeTaken(0);

    try {
      const res = await fetch('/api/sessions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz: fullQuiz.id,
          chosen_difficulty: sessionDifficulty,
          chosen_num_questions: limit
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
        setupQuestion(questionsWithTimeOverride[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuitSession = () => {
    setWasPlayingBeforeQuitConfirm(isPlaying);
    setIsPlaying(false);
    audioRef.current?.pause();
    clearAudioFade();
    setShowQuitConfirmation(true);
  };

  const confirmQuitSession = () => {
    setShowQuitConfirmation(false);
    clearAudioFade();
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
    }
    if (nextQuestionTimeoutRef.current) {
        clearTimeout(nextQuestionTimeoutRef.current);
        nextQuestionTimeoutRef.current = null;
    }
    setFeedback(null);
    setCurrentQuiz(null);
    setSessionSummary(null);
    setIsPlaying(false);
  };

  // Helper do budowania pełnego URL-a do mediów
  const getFullAudioUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url; // Zewnętrzne URL, np. Apple Music
      return url;
  };

  const setupQuestion = (question) => {
    if (!question) return;
    setTimeLeft(question.time_limit || 30);
    setInputValue('');
    setAudioDebug('');
    setIsPlaying(false); 
    setIsSubmitting(false); // Resetujemy blokadę po załadowaniu nowego pytania
    clearAudioFade();
    
    if (audioRef.current) {
        audioRef.current.pause();
        const rawSrc = question.audio_source_url || question.audio_source_file || '';
        const finalSrc = getFullAudioUrl(rawSrc);
        
        if (!finalSrc) {
            setAudioDebug("Błąd: Pytanie nie ma przypisanego żadnego pliku w bazie.");
            return;
        }

        audioRef.current.src = finalSrc;
        audioRef.current.load();
        audioRef.current.volume = volume * volume;
    }
  };

  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0 && !isSubmitting) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const nextVal = prev - 0.1;
          return nextVal <= 0 ? 0 : nextVal;
        });
      }, 100);
    } else if (isPlaying && timeLeft === 0 && !isSubmitting) {
      setIsPlaying(false);
      audioRef.current?.pause();
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, isSubmitting]);

  // Preload the next question's audio in the background for zero-lag playback
  useEffect(() => {
    if (currentQuiz?.questions && currentQuestionIndex !== undefined) {
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = currentQuiz.questions[nextIndex];
      if (nextQuestion) {
        const nextRawSrc = nextQuestion.audio_source_url || nextQuestion.audio_source_file || '';
        const nextFinalSrc = getFullAudioUrl(nextRawSrc);
        if (nextFinalSrc) {
            const audioPreload = new Audio();
            audioPreload.src = nextFinalSrc;
            audioPreload.preload = 'auto';
        }
      }
    }
  }, [currentQuestionIndex, currentQuiz]);

  const handleAudioEnded = () => {
    if (isSubmitting || feedback) return;
    setIsPlaying(false);
    setTimeLeft(0);
  };

  const togglePlay = () => {
    if (isSubmitting || feedback || timeLeft <= 0) return;

    const question = currentQuiz?.questions?.[currentQuestionIndex];
    if (!question) return;
    
    if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
        clearAudioFade();
        if (audioRef.current) {
            audioRef.current.volume = volume * volume;
        }
    } else {
        setAudioDebug('');
        const rawSrc = question.audio_source_url || question.audio_source_file || '';
        const finalSrc = getFullAudioUrl(rawSrc);

        if (!finalSrc) {
             setAudioDebug("Błąd: Brak pliku audio/url w bazie!");
             return;
        }

        if (audioRef.current) {
            if (!audioRef.current.src || !audioRef.current.src.includes(rawSrc)) {
                audioRef.current.src = finalSrc;
                audioRef.current.load();
            }
            clearAudioFade();
            audioRef.current.volume = volume * volume;
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(e => {
                console.error("Audio play error", e);
                setAudioDebug(`Błąd odtwarzania (sprawdź format pliku lub połączenie z portem 8000): ${e.message}`);
                setIsPlaying(false);
            });
        }
    }
  };

  const proceedToNextStep = () => {
    if (nextQuestionTimeoutRef.current) {
        clearTimeout(nextQuestionTimeoutRef.current);
        nextQuestionTimeoutRef.current = null;
    }
    
    const doTransition = () => {
        setFeedback(null);
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < currentQuiz.questions.length) {
            setCurrentQuestionIndex(nextIndex);
            setupQuestion(currentQuiz.questions[nextIndex]);
        } else {
            finishSession();
        }
    };

    if (isPlaying && audioRef.current && !audioRef.current.paused) {
        fadeOutAudio(doTransition);
    } else {
        doTransition();
    }
  };

  const handleAnswerSubmit = async (answer) => {
    if (!sessionId || !currentQuiz || isSubmitting) return; // Zapobiega wielokrotnemu kliknięciu
    
    const question = currentQuiz.questions[currentQuestionIndex];
    if (!question) return;
    
    setIsSubmitting(true); // Blokujemy kolejne wysłania
    setIsPlaying(false);
    audioRef.current?.pause();

    const timeTaken = (question.time_limit || 30) - timeLeft;

    try {
        const res = await fetch(`/api/sessions/${sessionId}/attempts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_id: question.id,
                answer_text: answer,
                time_taken_seconds: timeTaken
            })
        });

        if (res.ok) {
            const data = await res.json();
            setTotalTimeTaken(prev => prev + timeTaken);
             if (data.is_correct) {
                 if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
                 setSessionStreak(prev => {
                     const nextStreak = prev + 1;
                     setMaxStreak(currentMax => Math.max(currentMax, nextStreak));
                     return nextStreak;
                 });
                 setSessionPoints(prev => prev + data.points_awarded);
                 setFastestCorrectTime(prev => (prev === null ? timeTaken : Math.min(prev, timeTaken)));
                  setFeedback({ 
                      type: 'success', 
                      text: 'DOBRZE!', 
                      points: data.points_awarded,
                      correctTitle: question?.song?.title,
                      correctArtist: question?.song?.artist,
                      timeTaken
                  });

                 fadeInAudio();

                 if (nextQuestionTimeoutRef.current) {
                     clearTimeout(nextQuestionTimeoutRef.current);
                 }

                 const nextIndex = currentQuestionIndex + 1;
                 if (nextIndex < currentQuiz.questions.length) {
                     nextQuestionTimeoutRef.current = setTimeout(() => {
                         fadeOutAudio(() => {
                             setFeedback(null);
                             setCurrentQuestionIndex(nextIndex);
                             setupQuestion(currentQuiz.questions[nextIndex]);
                         });
                         nextQuestionTimeoutRef.current = null;
                     }, 4000);
                 } else {
                     nextQuestionTimeoutRef.current = setTimeout(() => {
                         fadeOutAudio(() => {
                             setFeedback(null);
                             finishSession();
                         });
                         nextQuestionTimeoutRef.current = null;
                     }, 4000);
                 }
             } else {
                 if (navigator.vibrate) navigator.vibrate(200);
                 setSessionStreak(0);
                  setFeedback({ 
                      type: 'error', 
                      text: 'ŹLE!',
                      points: 0,
                      correctTitle: question?.song?.title,
                      correctArtist: question?.song?.artist,
                      timeTaken
                  });

                 fadeInAudio();
             }
        } else {
            setIsSubmitting(false); // Odblokowujemy w razie błędu serwera
        }
    } catch(err) {
        console.error(err);
        setIsSubmitting(false); // Odblokowujemy w razie błędu połączenia
    }
  };

  const finishSession = async () => {
      try {
          const response = await fetch(`/api/sessions/${sessionId}/finish/`, { method: 'POST' });
          if (response.ok) {
              const data = await response.json();
              setSessionSummary(data); 
          }
      } catch (err) {
          console.error(err);
      } finally {
          setIsSubmitting(false);
      }
  };


  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (feedback) {
          e.preventDefault();
          proceedToNextStep();
        }
      } else if (e.key === ' ') {
        if (currentQuiz && sessionId && !sessionSummary && !feedback) {
          const activeEl = document.activeElement;
          const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
          if (!isInputFocused) {
            e.preventDefault();
            togglePlay();
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [feedback, currentQuestionIndex, currentQuiz, sessionId, isPlaying, inputValue, sessionSummary]);

  // Suggestions from the database query (spoiler-free: searching the whole database, not revealing quiz contents)
  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue) return [];
    return dbSuggestions;
  }, [dbSuggestions, inputValue]);

  const question = currentQuiz?.questions?.[currentQuestionIndex];
  
  // Logika do pokazywania/chowania podpowiedzi
  const exactMatch = filteredSuggestions.length === 1 && filteredSuggestions[0].title.toLowerCase() === inputValue.toLowerCase();
  const showSuggestions = inputValue && !exactMatch && filteredSuggestions.length > 0;

  const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
          if (showSuggestions) {
              e.preventDefault();
              if (activeSuggestionIndex < filteredSuggestions.length - 1) {
                  setActiveSuggestionIndex(prev => prev + 1);
              }
          }
      } else if (e.key === 'ArrowUp') {
          if (showSuggestions) {
              e.preventDefault();
              if (activeSuggestionIndex > 0) {
                  setActiveSuggestionIndex(prev => prev - 1);
              }
          }
      } else if (e.key === 'Tab') {
          if (showSuggestions && activeSuggestionIndex >= 0) {
              e.preventDefault();
              setInputValue(filteredSuggestions[activeSuggestionIndex].title);
          } else if (showSuggestions && filteredSuggestions.length > 0) {
              e.preventDefault();
              setInputValue(filteredSuggestions[0].title);
          }
      } else if (e.key === 'Enter') {
          e.stopPropagation();
          if (feedback) {
              e.preventDefault();
              proceedToNextStep();
          } else if (showSuggestions && activeSuggestionIndex >= 0) {
              e.preventDefault();
              setInputValue(filteredSuggestions[activeSuggestionIndex].title);
              setActiveSuggestionIndex(-1);
          } else {
              handleAnswerSubmit(inputValue);
          }
      } else if (e.key === ' ') {
          if (inputValue.trim() === '' && !feedback) {
              e.preventDefault();
              e.stopPropagation();
              togglePlay();
          }
      }
  };

  // Style dla animacji streak'a
  const getFlameStyle = (streak) => {
      if (streak === 0) return "text-gray-600 scale-100";
      if (streak < 3) return "text-orange-400 scale-110 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]";
      if (streak < 5) return "text-orange-500 scale-125 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-pulse";
      if (streak < 8) return "text-red-500 scale-150 drop-shadow-[0_0_25px_rgba(239,68,68,1)] animate-pulse";
      return "text-red-600 scale-[1.7] drop-shadow-[0_0_40px_rgba(220,38,38,1)] animate-bounce";
  };

  // Pobieramy aktualny gatunek na bieżąco
  const currentCategoryName = question?.song?.genre?.name || currentQuiz?.genre?.name || 'Mix';

  return (
      <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">

        <audio ref={audioRef} preload="auto" onEnded={handleAudioEnded} />

        {/* Sidebar Backdrop Overlay on Mobile */}
        {isSidebarOpen && (
            <div 
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
            />
        )}

        <div className={`flex-1 flex flex-col p-4 sm:p-10 transition-all duration-500 overflow-y-auto scrollbar-thin ${isSidebarOpen ? 'lg:mr-80' : 'mr-0'}`}>

          {!isSidebarOpen && (
              <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="fixed top-4 right-4 sm:top-10 sm:right-10 z-50 p-2 sm:p-3 bg-gray-900/80 border border-gray-700 rounded-full hover:border-green-500 hover:text-green-400 transition-all hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-sm"
              >
                <Menu size={24} className="sm:w-8 sm:h-8" />
              </button>
          )}

          <div className="mb-4 sm:mb-6 text-center mt-2 sm:mt-4">
            {!currentQuiz ? (
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  JAKI TO SYGNAŁ?
                </h1>
            ) : (
                <h1 className="text-2xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-2 sm:mb-4 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  JAKI TO SYGNAŁ?
                </h1>
            )}

            {(currentQuiz && !sessionSummary) && (
                <div className="flex flex-row justify-center gap-3 sm:gap-14 items-center text-xs sm:text-xl text-gray-400 uppercase tracking-widest mt-2 sm:mt-8 bg-gray-900/40 sm:bg-transparent py-2 sm:py-0 rounded-2xl border border-white/5 sm:border-none mx-auto max-w-fit px-4 sm:px-0">
                  <div className="flex items-center gap-1.5 sm:gap-4 relative">
                    <div className={`transition-all duration-300 ${getFlameStyle(sessionStreak)}`}>
                        <Flame fill="currentColor" size={24} className="w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <span className="hidden sm:inline">streak:</span>
                    <span className="text-white font-bold text-lg sm:text-3xl">{sessionStreak}</span>
                  </div>
                  <div className="px-3 py-1.5 sm:px-6 sm:py-2 border sm:border-2 border-gray-700 bg-gray-900/50 rounded-2xl shadow-lg break-words text-center max-w-[140px] xs:max-w-[180px] sm:max-w-xs md:max-w-md">
                    <span className="hidden sm:inline">quiz: </span><span className="text-green-500 font-black">{currentQuiz?.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <Trophy className="text-yellow-500 w-4 h-4 sm:w-7 sm:h-7" fill="currentColor" size={24} />
                    <span className="hidden sm:inline">punkty:</span>
                    <span className="text-yellow-400 font-black text-xl sm:text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">{sessionPoints}</span>
                  </div>
                </div>
            )}
          </div>

          {!currentQuiz ? (
             <HomeView 
                apiDebug={apiDebug}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                quizzes={quizzes}
                isLoading={isLoadingQuizzes}
                startSession={handleSelectQuizForPreview}
                genres={genres}
             />
          ) : (
              <GameSessionView 
                 currentQuiz={currentQuiz}
                 currentQuestionIndex={currentQuestionIndex}
                 timeLeft={timeLeft}
                 isPlaying={isPlaying}
                 togglePlay={togglePlay}
                 audioDebug={audioDebug}
                 feedback={feedback}
                 inputValue={inputValue}
                 setInputValue={setInputValue}
                 handleKeyDown={handleKeyDown}
                 isSubmitting={isSubmitting}
                 handleAnswerSubmit={handleAnswerSubmit}
                 showSuggestions={showSuggestions}
                 filteredSuggestions={filteredSuggestions}
                 activeSuggestionIndex={activeSuggestionIndex}
                 setActiveSuggestionIndex={setActiveSuggestionIndex}
                 onQuit={handleQuitSession}
                 proceedToNextStep={proceedToNextStep}
                 volume={volume}
                 setVolume={setVolume}
                 sessionStreak={sessionStreak}
              />
          )}

          {sessionSummary && (
             <SummaryView 
                sessionSummary={sessionSummary} 
                currentQuiz={currentQuiz} 
                isLoggedIn={isLoggedIn}
                maxStreak={maxStreak}
                fastestCorrectTime={fastestCorrectTime}
                totalTimeTaken={totalTimeTaken}
                onLoginClick={() => setActiveModal('login')}
                onRegisterClick={() => setActiveModal('register')}
                onFinish={() => {
                    setSessionSummary(null);
                    setCurrentQuiz(null);
                }} 
             />
          )}
        </div>

        <Sidebar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            setActiveModal={setActiveModal}
        />

        <AuthModal
            activeModal={activeModal}
            setActiveModal={setActiveModal}
            guestSessionId={sessionId}
        />

        {/* Intentional Quiz Entry Preview Popup - Bottom Sheet on Mobile */}
        {selectedQuizForPreview && (() => {
          const quiz = selectedQuizForPreview;
          const getFullCoverUrl = (url) => {
            if (!url) return '';
            const idx = url.indexOf('/media/');
            return idx !== -1 ? url.substring(idx) : url;
          };
          const coverUrl = getFullCoverUrl(quiz.cover_image);
          const placeholderGrad = getPlaceholderGradient(quiz.title);
          const stats = quiz.stats || { total_plays: 0, average_score_percent: 0.0, average_time_seconds: 0.0, dynamic_difficulty: quiz.difficulty };
          
          const totalSongsInGenres = genres.reduce((acc, g) => acc + (g.songs_count || 0), 0);
          const maxQuestions = quiz.isRandomQuizPlaceholder
            ? (selectedRandomGenreIds.length > 0
                ? selectedRandomGenreIds.reduce((sum, id) => {
                    const g = genres.find(genre => genre.id.toString() === id.toString());
                    return sum + (g?.songs_count || 0);
                  }, 0)
                : totalSongsInGenres)
            : (quiz.questions?.length || quiz.questions_count || 20);

          const presets = [...QUESTION_PRESETS.filter(n => n <= maxQuestions)];
          if (maxQuestions > 0 && !presets.includes(maxQuestions) && maxQuestions <= 30) {
            presets.push(maxQuestions);
            presets.sort((a, b) => a - b);
          }

          return (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4">
              <div 
                className="bg-gray-950 border border-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-4xl sm:mx-auto overflow-hidden shadow-2xl relative flex flex-col md:flex-row text-left max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button 
                  onClick={() => setSelectedQuizForPreview(null)}
                  className="absolute top-4 right-4 bg-black/40 hover:bg-white/10 text-gray-400 hover:text-white p-2 rounded-full z-20 transition-all border border-white/5"
                >
                  <X size={20} />
                </button>

                {/* Okładka / Gradient (Left Side) */}
                <div className="w-full md:w-1/3 relative aspect-[16/9] sm:aspect-video md:aspect-auto min-h-[160px] md:min-h-full flex-shrink-0 bg-gray-900 border-b md:border-b-0 md:border-r border-white/5">
                  {coverUrl ? (
                    <img 
                      src={coverUrl} 
                      alt={quiz.title} 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${placeholderGrad} flex flex-col justify-between p-8 relative overflow-hidden`}>
                      <div className="absolute -right-6 -bottom-6 opacity-10 text-white transform rotate-12">
                        <Music size={150} />
                      </div>
                      <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-green-400 self-start">
                        {quiz.genre?.name || 'Muzyczny'}
                      </div>
                      <div className="text-2xl font-black text-white leading-tight uppercase italic">
                        {quiz.title}
                      </div>
                    </div>
                  )}
                  {/* Overlay shadow gradient to fade into text on mobile */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 md:from-transparent via-transparent to-transparent"></div>
                </div>

                {/* Info & Stats (Right Side) */}
                <div className="w-full md:w-2/3 p-4 sm:p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3 opacity-0 animate-fade-in-up">
                      <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider">
                        {quiz.genre?.name || 'Miks'}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 leading-none uppercase italic tracking-tight opacity-0 animate-fade-in-up-delay-1">
                      {quiz.title}
                    </h3>

                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-5 font-medium line-clamp-2 sm:line-clamp-none opacity-0 animate-fade-in-up-delay-2">
                      {quiz.description || "Brak dodatkowego opisu dla tego wyzwania muzycznego. Przygotuj swoje słuchawki!"}
                    </p>

                    {/* ====== USTAWIENIA GRY ====== */}
                    <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-3 sm:p-5 mb-4 sm:mb-5 flex flex-col gap-4 sm:gap-5 opacity-0 animate-slide-up-fade">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-white/5 pb-2 flex items-center gap-1.5">
                        <Settings size={14} className="text-green-500" />
                        Ustawienia gry
                      </h4>

                      {/* Gatunek muzyczny (tylko dla losowego quizu) */}
                      {quiz.isRandomQuizPlaceholder && (
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5 block flex items-center gap-1.5">
                            <Music size={12} className="text-green-400" />
                            Gatunek muzyczny
                          </label>
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto bg-gray-900/40 p-2.5 rounded-2xl border border-gray-850/60 w-full no-scrollbar">
                            <button
                              type="button"
                              onClick={() => setSelectedRandomGenreIds([])}
                              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                                selectedRandomGenreIds.length === 0
                                  ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50 hover:scale-102'
                              }`}
                            >
                              Wszystkie ({getSongsPlural(totalSongsInGenres)})
                            </button>
                            {[
                              ...genres.filter(g => g.name.toLowerCase() !== 'inne'),
                              ...genres.filter(g => g.name.toLowerCase() === 'inne')
                            ].map((g) => {
                              const isSelected = selectedRandomGenreIds.includes(g.id);
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => toggleRandomGenreId(g.id)}
                                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                                    isSelected
                                      ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105'
                                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50 hover:scale-102'
                                  }`}
                                >
                                  {g.name} ({getSongsPlural(g.songs_count || 0)})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Difficulty Selection */}
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5 block flex items-center gap-1.5">
                          <Zap size={12} className="text-yellow-400" />
                          Poziom trudności
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['EASY', 'MEDIUM', 'HARD'].map((diff) => {
                            const isSelected = chosenDifficulty === diff;
                            const colorMap = {
                              EASY: {
                                active: 'bg-green-500/20 border-green-500/60 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
                                idle: 'bg-gray-900/60 border-gray-700/50 text-gray-500 hover:border-green-500/30 hover:text-green-400/70',
                                dot: 'bg-green-400',
                                time: 'text-green-400/80'
                              },
                              MEDIUM: {
                                active: 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
                                idle: 'bg-gray-900/60 border-gray-700/50 text-gray-500 hover:border-yellow-500/30 hover:text-yellow-400/70',
                                dot: 'bg-yellow-400',
                                time: 'text-yellow-400/80'
                              },
                              HARD: {
                                active: 'bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
                                idle: 'bg-gray-900/60 border-gray-700/50 text-gray-500 hover:border-red-500/30 hover:text-red-400/70',
                                dot: 'bg-red-400',
                                time: 'text-red-400/80'
                              }
                            };
                            const colors = colorMap[diff];
                            return (
                              <button
                                key={diff}
                                onClick={() => setChosenDifficulty(diff)}
                                className={`relative flex flex-col items-center gap-0.5 sm:gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 ${
                                  isSelected ? colors.active : colors.idle
                                } ${isSelected ? 'scale-[1.03]' : 'hover:scale-[1.01]'}`}
                              >
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1">
                                    <div className={`w-3 h-3 ${colors.dot} rounded-full border-2 border-gray-950 shadow-lg animate-scale-in`}></div>
                                    <div className={`absolute inset-0 w-3 h-3 ${colors.dot} rounded-full animate-ping-small`}></div>
                                  </div>
                                )}
                                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                                  {DIFFICULTY_LABELS[diff]}
                                </span>
                                <span className={`text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 ${isSelected ? colors.time : 'text-gray-600'}`}>
                                  <Timer size={9} className="sm:w-[10px] sm:h-[10px]" />
                                  {DIFFICULTY_TIME_MAP[diff]}s
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Question Count Selection */}
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5 block flex items-center gap-1.5">
                          <Hash size={12} className="text-purple-400" />
                          Ilość piosenek
                        </label>
                        <div className="flex gap-2">
                          {presets.map((num) => {
                            const isSelected = chosenNumQuestions === num;
                            return (
                              <button
                                key={num}
                                onClick={() => setChosenNumQuestions(num)}
                                className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl border text-sm font-black transition-all duration-200 cursor-pointer active:scale-90 ${
                                  isSelected 
                                    ? 'bg-purple-500/20 border-purple-500/60 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] scale-[1.03]' 
                                    : 'bg-gray-900/60 border-gray-700/50 text-gray-500 hover:border-purple-500/30 hover:text-purple-400/70 hover:scale-[1.01]'
                                }`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1.5 font-medium">
                          Dostępnych w quizie: {maxQuestions} {maxQuestions === 1 ? 'piosenka' : maxQuestions < 5 ? 'piosenki' : 'piosenek'}
                        </p>
                      </div>
                    </div>

                    {/* Statystyki */}
                    <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-4 sm:p-5 mb-5 flex flex-col gap-4 opacity-0 animate-slide-up-fade-delay">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 border-b border-white/5 pb-2 flex items-center gap-1.5">
                        <BarChart2 size={14} className="text-green-500" />
                        Statystyki społeczności
                      </h4>
                      
                      {isLoadingQuizDetail ? (
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Rozegrane gry</span>
                             <span className="text-white text-base font-black flex items-center gap-1">
                               <div className="h-5 w-12 bg-gray-800/50 rounded animate-pulse"></div>
                             </span>
                          </div>
                          <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Statystyczny wynik</span>
                             <span className="text-white text-base font-black flex items-center gap-1">
                               <div className="h-5 w-16 bg-gray-800/50 rounded animate-pulse"></div>
                             </span>
                          </div>
                          <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Średni czas</span>
                             <span className="text-white text-base font-black flex items-center gap-1">
                               <div className="h-5 w-12 bg-gray-800/50 rounded animate-pulse"></div>
                             </span>
                          </div>
                          <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Dynamiczna trudność</span>
                             <span className="text-white text-base font-black flex items-center gap-1">
                               <div className="h-5 w-16 bg-gray-800/50 rounded animate-pulse"></div>
                             </span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Rozegrane gry</span>
                             <span className="text-white text-base font-black flex items-center gap-1">
                               <Play size={14} className="text-green-400" fill="currentColor" /> {stats.total_plays}
                             </span>
                          </div>
                          <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Statystyczny wynik</span>
                             <span className="text-white text-base font-black flex items-center gap-1">
                               <Sparkles size={14} className="text-yellow-400" /> 
                               {stats.total_plays > 0 ? `${stats.average_score_percent}%` : 'Brak danych'}
                             </span>
                          </div>
                          <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Średni czas</span>
                             <span className="text-white text-base font-black flex items-center gap-1">
                               <Clock size={14} className="text-blue-400" /> 
                               {stats.total_plays > 0 ? `${stats.average_time_seconds} s` : 'Brak danych'}
                             </span>
                          </div>
                          <div>
                             <span className="text-[10px] text-gray-500 block mb-1">Dynamiczna trudność</span>
                             <span className={`text-base font-black flex items-center gap-1 ${
                               stats.dynamic_difficulty === 'Łatwy' ? 'text-green-400' : stats.dynamic_difficulty === 'Trudny' ? 'text-red-400' : 'text-yellow-400'
                             }`}>
                               <Trophy size={14} /> {stats.dynamic_difficulty}
                             </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 sm:mt-auto">
                    <button 
                      onClick={() => {
                        startSession(quiz, chosenDifficulty, chosenNumQuestions);
                        setSelectedQuizForPreview(null);
                      }}
                      disabled={isLoadingQuizDetail || maxQuestions === 0}
                      className={`flex-grow font-black uppercase tracking-wider py-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${
                        (isLoadingQuizDetail || maxQuestions === 0)
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50' 
                          : 'bg-green-500 hover:bg-green-400 text-black animate-glow-pulse hover:scale-[1.02] active:scale-[0.95]'
                      }`}
                    >
                      {isLoadingQuizDetail ? (
                        <>
                          <div className="w-5 h-5 border-2 border-gray-600 border-t-green-500 rounded-full animate-spin"></div>
                          Wczytywanie...
                        </>
                      ) : maxQuestions === 0 ? (
                        <>
                          Brak utworów
                        </>
                      ) : (
                        <>
                          <Play fill="black" size={18} />
                          Rozpocznij grę
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setSelectedQuizForPreview(null)}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-black uppercase tracking-wider px-6 py-4 rounded-2xl border border-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Quit Quiz Confirmation Modal */}
        {showQuitConfirmation && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-center">
              <h3 className="text-2xl font-black text-red-500 mb-3 uppercase italic tracking-tight">
                Przerwać quiz?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
                Czy na pewno chcesz opuścić trwający quiz? Twój dotychczasowy postęp w tej sesji zostanie całkowicie utracony.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button 
                  onClick={confirmQuitSession}
                  className="flex-grow bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Tak, wyjdź
                </button>
                <button 
                  onClick={() => {
                    setShowQuitConfirmation(false);
                    if (wasPlayingBeforeQuitConfirm) {
                      setIsPlaying(true);
                      clearAudioFade();
                      if (audioRef.current) {
                          audioRef.current.volume = volume * volume;
                          audioRef.current.play().catch(e => console.error("Auto-resume failed:", e));
                      }
                    }
                  }}
                  className="flex-grow bg-gray-900 hover:bg-gray-800 text-white font-black uppercase tracking-wider py-3.5 rounded-xl border border-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Graj dalej
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
}

export default function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<GameView />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/friends" element={<Friends />} />
        </Routes>
      </Router>
  );
}