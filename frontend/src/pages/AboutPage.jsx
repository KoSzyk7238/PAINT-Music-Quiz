import React from 'react';
import AppLayout from '../components/AppLayout';
import { Music, Headphones, Database } from 'lucide-react';

export default function AboutPage() {
    return (
        <AppLayout title="O aplikacji">
            <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 prose-invert">
                <h1 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tight mb-6 bg-gradient-to-b from-green-300 to-green-600 bg-clip-text text-transparent text-center">
                    O aplikacji
                </h1>

                <p className="text-gray-300 leading-relaxed mb-8 text-center">
                    <strong className="text-white">Jaki to sygnał?</strong> to quiz muzyczny PAINT — słuchasz krótkiego
                    fragmentu utworu i zgadujesz tytuł (lub wykonawcę). Zbieraj punkty, buduj serię trafień i rywalizuj w rankingu.
                </p>

                <section className="space-y-6 mb-10">
                    <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 flex gap-4">
                        <Headphones className="text-green-500 shrink-0" size={28} aria-hidden />
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-wide text-white mb-2">Jak grać</h2>
                            <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                                <li>Wybierz quiz z listy lub utwórz losowy mix gatunków.</li>
                                <li>Ustaw trudność (czas na odpowiedź) i liczbę pytań.</li>
                                <li>Odsłuchaj fragment i wpisz tytuł — podpowiedzi pomogą przy literówkach.</li>
                                <li>Im szybciej odpowiesz poprawnie, tym więcej punktów. Seria trafień daje bonus streak.</li>
                            </ol>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 flex gap-4">
                        <Music className="text-green-500 shrink-0" size={28} aria-hidden />
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-wide text-white mb-2">Źródło audio — Apple</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Podglądy utworów pochodzą z publicznego API Apple (iTunes / Apple Music). Są to
                                <strong className="text-gray-300"> 30-sekundowe próbki</strong>, nie pełne nagrania.
                                Okładki i linki do utworów mogą pochodzić z tych samych źródeł. Nazwy „Apple”, „iTunes”
                                i „Apple Music” są znakami towarowymi Apple Inc. Ta aplikacja nie jest przez Apple
                                zatwierdzona ani sponsorowana.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 flex gap-4">
                        <Database className="text-green-500 shrink-0" size={28} aria-hidden />
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-wide text-white mb-2">Projekt PAINT</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Aplikacja powstała w ramach projektu akademickiego PAINT (Python, React, MariaDB, Docker).
                                Quizy mogą być importowane z playlist Apple Music lub generowane losowo z bazy utworów.
                            </p>
                        </div>
                    </div>
                </section>
            </article>
        </AppLayout>
    );
}
