import Stats from './components/Stats';
import Friends from './components/Friends';
import Profile from './components/Profile';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Play, Pause, Menu, Trophy, Flame } from 'lucide-react';

// Importujemy nasze nowe komponenty
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';

const SONGS_DATABASE = [
  "Thriller - Michael Jackson",
  "Take On Me - a-ha",
  "Billie Jean - Michael Jackson",
  "Sweet Child O' Mine - Guns N' Roses",
  "Under Pressure - Queen & David Bowie",
  "Careless Whisper - George Michael"
];

function GameView() {
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const [streak] = useState(3);
  const [category] = useState('Pop lat 80.');
  const [points] = useState(1250);

  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      const timeout = setTimeout(() => setIsPlaying(false), 0);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const togglePlay = () => {
    if (timeLeft === 0) setTimeLeft(30);
    setIsPlaying(!isPlaying);
  };

  const filteredSuggestions = SONGS_DATABASE.filter(song =>
      song.toLowerCase().includes(inputValue.toLowerCase())
  );

  const isTimeRunningOut = timeLeft <= 5 && timeLeft > 0;

  return (
      <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">

        <div className={`flex-1 flex flex-col p-10 transition-all duration-500 ${isSidebarOpen ? 'mr-80' : 'mr-0'}`}>

          {!isSidebarOpen && (
              <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="fixed top-10 right-10 z-50 p-3 bg-gray-900/80 border border-gray-700 rounded-full hover:border-green-500 hover:text-green-400 transition-all hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-sm"
              >
                <Menu size={32} />
              </button>
          )}

          <div className="mb-12 text-center mt-4">
            <h1 className="text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-green-300 via-green-500 to-green-700 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              JAKI TO SYGNAŁ?
            </h1>

            <div className="flex justify-center gap-12 items-center text-xl text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Flame className="text-orange-500" size={24} />
                streak: <span className="text-white font-bold">{streak}</span>
              </div>
              <div className="px-4 py-1 border border-gray-800 rounded-full">
                category: <span className="text-green-500 font-bold">{category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-500" size={24} />
                points: <span className="text-white font-bold">{points}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 mb-16 max-w-4xl mx-auto w-full bg-gray-900/40 p-8 rounded-3xl border border-white/5">
            <button
                onClick={togglePlay}
                className={`rounded-full p-6 transition-all hover:scale-105 shrink-0 ${
                    isPlaying ? 'bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-green-500 hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                }`}
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
                <span>0:30</span>
              </div>
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ease-linear ${
                        isTimeRunningOut
                            ? 'bg-red-500 shadow-[0_0_15px_rgb(239,68,68)]'
                            : 'bg-green-500 shadow-[0_0_10px_rgb(34,197,94)]'
                    }`}
                    style={{ width: `${(timeLeft / 30) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto flex flex-col relative group">
            <input
                type="text"
                placeholder="Zgaduj utwór..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={!isPlaying && timeLeft === 30}
                className="bg-gray-900/80 border-2 border-gray-700 text-white p-5 text-2xl rounded-2xl outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all z-20 disabled:opacity-50"
            />

            {inputValue && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border-2 border-gray-700 rounded-2xl max-h-60 overflow-y-auto z-20 shadow-2xl backdrop-blur-xl scrollbar-thin">
                  {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((title, index) => (
                          <div
                              key={index}
                              onClick={() => {
                                setInputValue(title);
                                setIsPlaying(false);
                              }}
                              className="p-4 border-b border-gray-800 last:border-0 hover:bg-green-500 hover:text-black cursor-pointer transition-all font-medium text-lg"
                          >
                            {title}
                          </div>
                      ))
                  ) : (
                      <div className="p-4 text-gray-500 italic text-center">Nie znamy tego sygnału...</div>
                  )}
                </div>
            )}
          </div>
        </div>

        {/* Wstrzykujemy nasze wyciągnięte komponenty i przekazujemy im stany jako "propsy" */}
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
          {/* Zmień tę linijkę poniżej: */}
          <Route path="/friends" element={<Friends />} />
        </Routes>
      </Router>
  );
}