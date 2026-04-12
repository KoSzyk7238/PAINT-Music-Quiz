import React, { useState } from 'react';
import { Play } from 'lucide-react';

function App() {
  const [inputValue, setInputValue] = useState('');

  // Przykładowe podpowiedzi do wyszukiwarki
  const suggestions = [
    "Tytuł pierwszy - Wykonawca",
    "Tytuł drugi - Wykonawca",
    "Tytuł trzeci - Wykonawca",
    "Tytuł czwarty - Wykonawca"
  ];

  return (
      <div className="flex h-screen bg-black text-white font-sans overflow-hidden">

        {/* LEWA STRONA - GŁÓWNA SEKCJA GRY */}
        <div className="flex-1 flex flex-col p-10 relative">

          {/* Nagłówek i Statystyki */}
          <div className="mb-16 text-center">
            <h1 className="text-7xl font-light tracking-widest mb-8">N A M E</h1>
            <div className="flex justify-around items-center text-xl mb-4 text-gray-300">
              <span>streak: <span className="text-white font-bold">3</span></span>
              <span>category: <span className="text-white font-bold">Pop lat 80.</span></span>
            </div>
            <div className="text-5xl font-bold mt-8">
              <span className="text-gray-400 mr-4">++++</span> 1250 Points
            </div>
          </div>

          {/* Sekcja Odtwarzacza */}
          <div className="flex items-center gap-6 mb-16 px-10">
            <button className="bg-green-500 rounded-full p-4 hover:bg-green-400 transition-colors shrink-0">
              <Play fill="white" size={48} />
            </button>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between text-green-500 font-mono mb-2 text-lg">
                <span>0:00</span>
                <span>0:13</span>
                <span>0:30</span>
              </div>
              {/* Pasek postępu */}
              <div className="w-full h-8 border-2 border-gray-400 rounded-sm relative">
                {/* Tutaj w przyszłości podepniesz stan (np. width: '43%') */}
                <div className="absolute top-0 left-0 h-full w-[43%] overflow-hidden">
                  {/* Imitacja "fali" dźwiękowej / paska ze szkicu */}
                  <div className="w-full h-full border-b-4 border-green-500 rounded-br-lg"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sekcja Inputu Użytkownika */}
          <div className="w-full max-w-2xl mx-auto flex flex-col">
            <input
                type="text"
                placeholder="user input..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="bg-transparent border-2 border-gray-400 text-white p-4 text-xl outline-none focus:border-green-500"
            />
            {/* Przewijana lista podpowiedzi */}
            <div className="border-2 border-t-0 border-gray-400 max-h-48 overflow-y-auto scrollbar-thin">
              {suggestions.map((title, index) => (
                  <div
                      key={index}
                      className="p-3 border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    {title}
                  </div>
              ))}
            </div>
          </div>
        </div>

        {/* PRAWA STRONA - PASEK BOCZNY */}
        <div className="w-64 border-l border-white flex flex-col">
          {/* Profil */}
          <div className="p-6 border-b border-white flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gray-700 border-2 border-gray-500 overflow-hidden flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors">
              {/* Miejsce na zdjęcie (kwiatek ze szkicu) */}
              <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=flower"
                  alt="Profile"
                  className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Nawigacja */}
          <div className="flex-1 p-6 flex flex-col gap-6 text-3xl font-light">
            <a href="#stats" className="hover:text-green-500 transition-colors">Stats</a>
            <a href="#friends" className="hover:text-green-500 transition-colors">Friends</a>
          </div>

          {/* Stopka menu */}
          <div className="p-6 text-xl hover:text-gray-300 cursor-pointer">
            About us
          </div>
        </div>

      </div>
  );
}

export default App;