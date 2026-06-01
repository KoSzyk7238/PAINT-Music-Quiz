import React from 'react';
import AppLayout from '../components/AppLayout';

export default function PrivacyPage() {
    return (
        <AppLayout title="Polityka prywatności">
            <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-gray-300 text-sm leading-relaxed space-y-6">
                <h1 className="text-3xl sm:text-4xl font-black uppercase italic text-white text-center mb-8">
                    Polityka prywatności
                </h1>

                <p>
                    Niniejsza polityka opisuje, w jaki sposób aplikacja <strong className="text-white">Jaki to sygnał?</strong>{' '}
                    przetwarza dane w ramach projektu edukacyjnego PAINT Music Quiz.
                </p>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">1. Administrator danych</h2>
                    <p>
                        Administratorem danych w środowisku produkcyjnym jest podmiot udostępniający aplikację
                        (np. uczelnia lub zespół projektowy). W wersji deweloperskiej dane są przechowywane lokalnie
                        w kontenerach Docker na Twoim komputerze.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">2. Jakie dane zbieramy</h2>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                        <li>Nazwa użytkownika i hasło (hasło w formie zahashowanej po stronie serwera).</li>
                        <li>Opcjonalnie: wyświetlana nazwa, awatar, statystyki gier, wyniki sesji quizowych.</li>
                        <li>Identyfikator sesji gościa (przed logowaniem) w celu powiązania wyniku z kontem.</li>
                        <li>Techniczne logi serwera (np. adres IP w logach HTTP) — zależnie od konfiguracji hostingu.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">3. Cele przetwarzania</h2>
                    <p>
                        Dane służą do utrzymania konta, prowadzenia rankingu, statystyk oraz poprawnego działania quizu.
                        Nie sprzedajemy danych osobom trzecim.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">4. Apple / iTunes</h2>
                    <p>
                        Przy odtwarzaniu fragmentów utworów przeglądarka może łączyć się z serwerami Apple w celu
                        pobrania podglądu audio. Szczegóły znajdują się w dokumentacji Apple dotyczącej iTunes API
                        i polityki prywatności Apple.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">5. Twoje prawa</h2>
                    <p>
                        Możesz zmienić dane profilu w ustawieniach konta lub usunąć konto (opcja w profilu).
                        W razie pytań skontaktuj się z administratorem wdrożenia aplikacji.
                    </p>
                </section>

                <p className="text-gray-500 text-xs pt-4 border-t border-white/5">
                    Ostatnia aktualizacja: maj 2026 · Wersja demonstracyjna projektu PAINT.
                </p>
            </article>
        </AppLayout>
    );
}
