import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer({ compact = false }) {
    const { isLoggedIn } = useAuth();
    const year = new Date().getFullYear();

    return (
        <footer
            className={`w-full border-t border-white/5 bg-gray-950/80 text-gray-500 ${compact ? 'py-6 mt-8' : 'py-10 mt-auto'}`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
                <nav
                    className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-widest"
                    aria-label="Stopka — nawigacja"
                >
                    <Link to="/" className="hover:text-green-400 transition-colors">
                        Quizy
                    </Link>
                    <Link to="/stats" className="hover:text-green-400 transition-colors">
                        Statystyki
                    </Link>
                    <Link to="/friends" className="hover:text-green-400 transition-colors">
                        Ranking
                    </Link>
                    {isLoggedIn && (
                        <Link to="/profile" className="hover:text-green-400 transition-colors">
                            Profil
                        </Link>
                    )}
                    <Link to="/o-aplikacji" className="hover:text-green-400 transition-colors">
                        O aplikacji
                    </Link>
                    <Link to="/regulamin" className="hover:text-green-400 transition-colors">
                        Regulamin
                    </Link>
                    <Link to="/polityka-prywatnosci" className="hover:text-green-400 transition-colors">
                        Prywatność
                    </Link>
                </nav>

                <p className="text-center text-[11px] leading-relaxed max-w-2xl mx-auto text-gray-600">
                    Podglądy audio pochodzą z{' '}
                    <a
                        href="https://www.apple.com/itunes/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-green-400 underline underline-offset-2"
                    >
                        Apple iTunes / Apple Music API
                    </a>
                    . To 30-sekundowe fragmenty — nie pełne utwory. Apple nie jest sponsorem ani partnerem tej aplikacji.
                </p>

                <p className="text-center text-[10px] uppercase tracking-widest text-gray-600">
                    PAINT Music Quiz · Jaki to sygnał? · © {year}
                </p>
            </div>
        </footer>
    );
}
