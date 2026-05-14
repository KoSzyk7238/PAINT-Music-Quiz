import Stats from './components/Stats';
import Friends from './components/Friends';
import Profile from './components/Profile';
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Play, Pause, Menu, Trophy, Flame, Search, Star, Music, ChevronRight } from 'lucide-react';

import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';

function GameView() {
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // Globalne statystyki profilu (opcjonalne, nie używane już w HUD gry)
  const [globalStreak, setGlobalStreak] = useState(0);
  const [globalPoints, setGlobalPoints] = useState(0);

  // Lokalne statystyki dla obecnej sesji quizu
  const [sessionStreak, setSessionStreak] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);

  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [songsDatabase, setSongsDatabase] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [apiDebug, setApiDebug] = useState(null);
  const [audioDebug, setAudioDebug] = useState('');

  // Filtrowanie i kategorie
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');

  const audioRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile/');
        if (res.ok) {
          const data = await res.json();
          setGlobalStreak(data.current_streak);
          setGlobalPoints(data.total_points);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const fetchQuizzes = async () => {
      try {
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
      }
    };

    const fetchSongs = async () => {
        try {
            const res = await fetch('/api/songs/');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                     setSongsDatabase(data.map(s => s.title));
                } else if (data && Array.isArray(data.results)) {
                     setSongsDatabase(data.results.map(s => s.title));
                }
            }
        } catch(err) {
            console.error(err);
        }
    }

    fetchProfile();
    fetchQuizzes();
    fetchSongs();
  }, []);

  // Reset indeksu podpowiedzi przy zmianie tekstu
  useEffect(() => {
      setActiveSuggestionIndex(-1);
  }, [inputValue]);

  const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  const startSession = async (quiz) => {
    const shuffledQuestions = shuffleArray(quiz.questions || []);
    // Pobieramy limit z bazy (lub domyślnie 10)
    const limit = quiz.num_questions_to_ask || 10;
    const limitedQuestions = shuffledQuestions.slice(0, limit);
    const quizWithShuffled = { ...quiz, questions: limitedQuestions };

    setCurrentQuiz(quizWithShuffled);
    setCurrentQuestionIndex(0);
    setSessionSummary(null);
    setAudioDebug('');
    setIsSubmitting(false);
    setSessionStreak(0); // Reset lokalnego streaka
    setSessionPoints(0); // Reset lokalnych punktów
    try {
      const res = await fetch('/api/sessions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz: quiz.id })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.id);
        setupQuestion(limitedQuestions[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper do budowania pełnego URL-a do mediów
  const getFullAudioUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http')) return url; // Zewnętrzne URL, np. Apple Music
      // Jeśli to plik wgrywany przez /media/, uderzamy prosto w Django port 8000
      return `http://localhost:8000${url}`;
  };

  const setupQuestion = (question) => {
    if (!question) return;
    setTimeLeft(question.time_limit || 30);
    setInputValue('');
    setAudioDebug('');
    setIsPlaying(false); 
    setIsSubmitting(false); // Resetujemy blokadę po załadowaniu nowego pytania
    
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
    }
  };

  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0 && !isSubmitting) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft === 0 && !isSubmitting) {
      const timeout = setTimeout(() => {
        setIsPlaying(false);
        handleAnswerSubmit(''); 
      }, 0);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, isSubmitting]);

  const togglePlay = () => {
    const question = currentQuiz?.questions?.[currentQuestionIndex];
    if (!question) return;

    if (timeLeft === 0) setTimeLeft(question.time_limit || 30);
    
    if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
    } else {
        setAudioDebug('');
        const rawSrc = question.audio_source_url || question.audio_source_file || '';
        const finalSrc = getFullAudioUrl(rawSrc);

        if (!finalSrc) {
             setAudioDebug("Błąd: Brak pliku audio/url w bazie!");
             return;
        }

        if (audioRef.current) {
            // Gwarancja przypisania URL
            if (!audioRef.current.src || !audioRef.current.src.includes(rawSrc)) {
                audioRef.current.src = finalSrc;
                audioRef.current.load();
            }

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
            if (data.is_correct) {
                setSessionStreak(prev => prev + 1);
                setSessionPoints(prev => prev + data.points_awarded);
                setFeedback({ type: 'success', text: `DOBRZE! +${data.points_awarded} PKT` });
            } else {
                setSessionStreak(0);
                setFeedback({ type: 'error', text: 'ŹLE!' });
            }

            setTimeout(() => setFeedback(null), 2500);

            const nextIndex = currentQuestionIndex + 1;
            if (nextIndex < currentQuiz.questions.length) {
                setTimeout(() => {
                    setCurrentQuestionIndex(nextIndex);
                    setupQuestion(currentQuiz.questions[nextIndex]);
                }, 2000);
            } else {
                // Po ostatnim pytaniu od razu kończymy sesję, bez wyświetlania "Quiz zakończony"
                setTimeout(() => finishSession(), 2000);
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
              // Od razu przechodzimy do podsumowania, z pominięciem setFeedback
              setSessionSummary(data); 
          }
      } catch (err) {
          console.error(err);
      } finally {
          setIsSubmitting(false);
      }
  };


  const filteredSuggestions = songsDatabase.filter(song =>
      song.toLowerCase().includes(inputValue.toLowerCase())
  );

  const isTimeRunningOut = timeLeft <= 5 && timeLeft > 0;
  
  const question = currentQuiz?.questions?.[currentQuestionIndex];
  
  const debugSrc = question ? getFullAudioUrl(question.audio_source_url || question.audio_source_file) : '';

  // Logika do pokazywania/chowania podpowiedzi
  const exactMatch = filteredSuggestions.length === 1 && filteredSuggestions[0].toLowerCase() === inputValue.toLowerCase();
  const showSuggestions = inputValue && !exactMatch && filteredSuggestions.length > 0;

  const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
          if (showSuggestions && activeSuggestionIndex < filteredSuggestions.length - 1) {
              setActiveSuggestionIndex(prev => prev + 1);
          }
      } else if (e.key === 'ArrowUp') {
          if (showSuggestions && activeSuggestionIndex > 0) {
              setActiveSuggestionIndex(prev => prev - 1);
          }
      } else if (e.key === 'Tab') {
          if (showSuggestions && activeSuggestionIndex >= 0) {
              e.preventDefault();
              setInputValue(filteredSuggestions[activeSuggestionIndex]);
          } else if (showSuggestions && filteredSuggestions.length > 0) {
              e.preventDefault();
              setInputValue(filteredSuggestions[0]);
          }
      } else if (e.key === 'Enter') {
          if (showSuggestions && activeSuggestionIndex >= 0) {
              // Użytkownik najechał strzałkami na podpowiedź i dusi Enter -> uzupełnia pole, ale NIE ZATWIERDZA jeszcze do bazy
              e.preventDefault();
              setInputValue(filteredSuggestions[activeSuggestionIndex]);
              setActiveSuggestionIndex(-1);
          } else {
              // Zwykłe zatwierdzenie wpisanej odpowiedzi
              handleAnswerSubmit(inputValue);
          }
      }
  };

  // --- Logika Ekranu Głównego ---
  const allCategories = ['Wszystkie', ...new Set(quizzes.map(q => q.genre?.name).filter(Boolean))];
  
  const filteredQuizzes = quizzes.filter(quiz => {
      const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'Wszystkie' || quiz.genre?.name === selectedCategory;
      return matchesSearch && matchesCategory;
  });

  // W prawdziwej aplikacji polecane mogłyby być sortowane wg ilości rozegrań, tu bierzemy pierwsze 3
  const recommendedQuizzes = quizzes.slice(0, 3);

  // Style dla animacji streak'a
  const getFlameStyle = (streak) => {
      if (streak === 0) return "text-gray-600 scale-100";
      if (streak < 3) return "text-orange-400 scale-110 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]";
      if (streak < 5) return "text-orange-500 scale-125 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-pulse";
      if (streak < 8) return "text-red-500 scale-150 drop-shadow-[0_0_25px_rgba(239,68,68,1)] animate-pulse";
      return "text-red-600 scale-[1.7] drop-shadow-[0_0_40px_rgba(220,38,38,1)] animate-bounce";
  };

  // Pobieramy aktualny gatunek na bieżąco z piosenki, z quizu lub ustawiamy domyślnie 'Mix'
  const currentCategoryName = question?.song?.genre?.name || currentQuiz?.genre?.name || 'Mix';

  return (
      <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">

        <audio ref={audioRef} preload="auto" />

        <div className={`flex-1 flex flex-col p-10 transition-all duration-500 overflow-y-auto scrollbar-thin ${isSidebarOpen ? 'mr-80' : 'mr-0'}`}>

          {!isSidebarOpen && (
              <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="fixed top-10 right-10 z-50 p-3 bg-gray-900/80 border border-gray-700 rounded-full hover:border-green-500 hover:text-green-400 transition-all hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-sm"
              >
                <Menu size={32} />
              </button>
          )}

          <div className="mb-6 text-center mt-4">
            <h1 className="text-8xl font-black tracking-tighter mb-4 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              JAKI TO SYGNAŁ?
            </h1>

            {/* Pokazujemy lokalne statystyki TYLKO podczas trwania quizu (nie w podsumowaniu, nie na głownej) */}
            {(currentQuiz && !sessionSummary) && (
                <div className="flex justify-center gap-14 items-center text-xl text-gray-400 uppercase tracking-widest mt-8">
                  <div className="flex items-center gap-4 relative">
                    <div className={`transition-all duration-300 ${getFlameStyle(sessionStreak)}`}>
                        <Flame fill="currentColor" size={28} />
                    </div>
                    <span>streak:</span>
                    <span className="text-white font-bold text-3xl">{sessionStreak}</span>
                  </div>
                  <div className="px-6 py-2 border-2 border-gray-700 bg-gray-900/50 rounded-full truncate max-w-xs shadow-lg">
                    gatunek: <span className="text-green-500 font-black">{currentCategoryName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Trophy className="text-yellow-500" fill="currentColor" size={28} />
                    <span>punkty:</span>
                    <span className="text-yellow-400 font-black text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">{sessionPoints}</span>
                  </div>
                </div>
            )}
          </div>

          {sessionSummary ? (
             <div className="flex flex-col items-center max-w-4xl mx-auto w-full bg-gray-900/40 p-10 rounded-3xl border border-white/5 animate-in fade-in slide-in-from-bottom-10 duration-700">
                <h2 className="text-6xl font-black mb-12 text-green-500 uppercase italic drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">Podsumowanie Quizu</h2>
                
                <div className="grid grid-cols-2 gap-8 w-full mb-12">
                    <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-8 rounded-3xl border border-yellow-500/30 flex flex-col items-center shadow-[0_0_25px_rgba(234,179,8,0.15)] transform transition-transform hover:scale-105">
                        <span className="text-gray-400 text-xl uppercase tracking-widest mb-3 font-bold">Zdobyte Punkty</span>
                        <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-lg">{sessionSummary.score}</span>
                    </div>
                    <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-8 rounded-3xl border border-green-500/30 flex flex-col items-center shadow-[0_0_25px_rgba(34,197,94,0.15)] transform transition-transform hover:scale-105">
                        <span className="text-gray-400 text-xl uppercase tracking-widest mb-3 font-bold">Poprawne Odpowiedzi</span>
                        {/* Zmiana: liczba pytań pochodzi wprost z długości tablicy pytań wylosowanej dla tego quizu */}
                        <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-green-600 drop-shadow-lg">{sessionSummary.correct_count} / {currentQuiz?.questions?.length || sessionSummary.total_questions}</span>
                    </div>
                    <div className="bg-gradient-to-b from-black/80 to-gray-900/80 p-8 rounded-3xl border border-blue-500/30 flex flex-col items-center col-span-2 shadow-[0_0_25px_rgba(59,130,246,0.15)] transform transition-transform hover:scale-105">
                        <span className="text-gray-400 text-xl uppercase tracking-widest mb-3 font-bold">Średni Czas Reakcji</span>
                        <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-600 drop-shadow-lg">{sessionSummary.average_time_seconds ? sessionSummary.average_time_seconds.toFixed(2) : 0}s</span>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        setSessionSummary(null);
                        setCurrentQuiz(null);
                        setCategory('Wybierz Quiz');
                    }}
                    className="px-12 py-6 bg-green-500 text-black font-black text-2xl uppercase tracking-tighter rounded-2xl hover:bg-green-400 transition-all shadow-[0_15px_30px_rgba(34,197,94,0.4)] hover:scale-110 active:scale-95"
                >
                    Zakończ i wróć do menu
                </button>
             </div>
          ) : !currentQuiz ? (
             <div className="flex flex-col w-full max-w-6xl mx-auto pb-20">
                {apiDebug && (
                    <div className="bg-red-900/50 border-l-4 border-red-500 p-4 mb-6 w-full text-left font-mono text-sm text-red-200">
                        <strong>Błąd komunikacji z serwerem:</strong><br />
                        {apiDebug}
                    </div>
                )}

                {/* Sekcja wyszukiwania i filtrowania */}
                <div className="flex flex-col md:flex-row gap-6 mb-12">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search className="text-gray-400" size={24} />
                        </div>
                        <input
                            type="text"
                            placeholder="Szukaj quizów po nazwie lub opisie..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-900/80 border-2 border-gray-700 text-white pl-14 pr-5 py-4 text-xl rounded-2xl outline-none focus:border-green-500 transition-all shadow-lg"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto scrollbar-none py-2 items-center">
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                                    selectedCategory === cat 
                                    ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sekcja Polecane */}
                {!searchQuery && selectedCategory === 'Wszystkie' && recommendedQuizzes.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center gap-3 mb-6">
                            <Star className="text-yellow-500" fill="currentColor" size={28} />
                            <h2 className="text-3xl font-black text-white uppercase italic">Polecane Quizy</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recommendedQuizzes.map(quiz => (
                                <div key={quiz.id} className="relative group cursor-pointer" onClick={() => startSession(quiz)}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"></div>
                                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 rounded-3xl border-2 border-gray-700 group-hover:border-green-500 transition-all transform group-hover:-translate-y-2 shadow-xl h-full flex flex-col justify-between">
                                        <div>
                                            <div className="bg-gray-950 text-green-400 text-xs font-black uppercase px-3 py-1 rounded-full inline-block mb-4">
                                                {quiz.genre?.name || 'Mix'}
                                            </div>
                                            <h3 className="text-2xl font-black text-white mb-2">{quiz.title}</h3>
                                            <p className="text-gray-400 text-sm line-clamp-3 mb-6">{quiz.description}</p>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-widest mt-auto border-t border-gray-700 pt-4">
                                            <span className="flex items-center gap-1"><Music size={14}/> {quiz.questions?.length || 0} Utworów</span>
                                            <span className={`px-2 py-1 rounded ${
                                                quiz.difficulty === 'EASY' ? 'text-green-400' : quiz.difficulty === 'HARD' ? 'text-red-400' : 'text-yellow-400'
                                            }`}>{quiz.difficulty}</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-6 right-6 bg-green-500 text-black p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 z-20 shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                                        <Play fill="black" size={20} className="ml-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sekcja Wszystkie/Filtrowane */}
                <div>
                    <h2 className="text-3xl font-black text-white uppercase italic mb-6">
                        {searchQuery ? 'Wyniki wyszukiwania' : 'Wszystkie Quizy'}
                    </h2>
                    
                    {filteredQuizzes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredQuizzes.map(quiz => (
                                <button 
                                    key={quiz.id} 
                                    onClick={() => startSession(quiz)}
                                    className="p-6 bg-black/50 border-2 border-gray-800 rounded-2xl hover:bg-gray-900 hover:border-green-500 transition-all text-left group flex flex-col h-full"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-white group-hover:text-green-400 line-clamp-2 pr-4">{quiz.title}</h3>
                                        <ChevronRight className="text-gray-600 group-hover:text-green-500 shrink-0 transition-transform group-hover:translate-x-1" size={24} />
                                    </div>
                                    <p className="text-gray-500 mt-2 text-sm line-clamp-2 mb-6 flex-1">{quiz.description || "Brak opisu"}</p>
                                    <div className="flex justify-between items-center w-full text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-900/50 p-3 rounded-xl">
                                        <span className="text-white">{quiz.genre?.name || 'Mix'}</span>
                                        <span>Pytań: {Math.min(quiz.questions?.length || 0, quiz.num_questions_to_ask || 10)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-dashed border-gray-700">
                            <span className="text-2xl font-bold text-gray-500 uppercase tracking-widest">Brak quizów spełniających kryteria</span>
                        </div>
                    )}
                </div>
             </div>
          ) : (
            <>
              {question ? (
                <div className="flex flex-col mb-16 max-w-4xl mx-auto w-full bg-gray-900/40 p-8 rounded-3xl border border-white/5 relative">
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
                                0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                                </span>
                                <span>0:{question.time_limit || 30}</span>
                            </div>
                            <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ease-linear ${
                                        isTimeRunningOut
                                            ? 'bg-red-500 shadow-[0_0_15px_rgb(239,68,68)]'
                                            : 'bg-green-500 shadow-[0_0_10px_rgb(34,197,94)]'
                                    }`}
                                    style={{ width: `${(timeLeft / (question.time_limit || 30)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Ukryte logi dla spokoju usera */}
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
                        onClick={() => {
                            setCurrentQuiz(null);
                            setCategory('Wybierz Quiz');
                        }}
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
                      {filteredSuggestions.map((title, index) => (
                          <div
                              key={index}
                              onClick={() => {
                                setInputValue(title);
                                setActiveSuggestionIndex(-1);
                              }}
                              className={`p-4 border-b border-gray-800 last:border-0 cursor-pointer transition-all font-medium text-lg ${
                                  index === activeSuggestionIndex 
                                  ? 'bg-green-500 text-black' 
                                  : 'hover:bg-green-500/50 text-white'
                              }`}
                          >
                            {title}
                          </div>
                      ))}
                    </div>
                )}
              </div>
            </>
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
        />

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