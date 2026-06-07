import React from 'react';
import AppLayout from '../components/AppLayout';

export default function TermsPage() {
    return (
        <AppLayout title="Regulamin">
            <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-gray-300 text-sm leading-relaxed space-y-6">
                <h1 className="text-3xl sm:text-4xl font-black uppercase italic text-white text-center mb-8">
                    Regulamin korzystania
                </h1>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">1. Postanowienia ogólne</h2>
                    <p>
                        Korzystając z aplikacji quizowej <strong className="text-white">Jaki to sygnał?</strong>, akceptujesz
                        poniższe zasady. Aplikacja ma charakter rozrywkowy i edukacyjny (projekt PAINT).
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">2. Konto użytkownika</h2>
                    <p>
                        Rejestracja wymaga podania nazwy użytkownika i hasła. Jesteś odpowiedzialny za bezpieczeństwo
                        swojego hasła. Zabronione jest tworzenie kont w celu manipulacji rankingiem lub nadużyć API.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">3. Treści muzyczne</h2>
                    <p>
                        Fragmenty audio i metadane utworów pochodzą z API Apple (iTunes). Użytkownik nie nabywa praw
                        do pełnych nagrań — jedynie do odsłuchu podglądów w ramach mechaniki quizu. Kopiowanie lub
                        redystrybucja plików audio poza aplikacją jest niedozwolona.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">4. Zasady gry</h2>
                    <p>
                        Wyniki i rankingi są generowane automatycznie na podstawie odpowiedzi w sesji. Administrator
                        może usuwać konta lub resetować dane w środowisku testowym bez wcześniejszego powiadomienia.
                    </p>
                </section>

                <section>
                    <h2 className="text-white font-bold uppercase tracking-wide mb-2">5. Ograniczenie odpowiedzialności</h2>
                    <p>
                        Aplikacja jest udostępniana „tak jak jest”. Zespół projektowy nie gwarantuje nieprzerwanej
                        dostępności serwisu ani kompletności bazy utworów.
                    </p>
                </section>

                <p className="text-gray-500 text-xs pt-4 border-t border-white/5">
                    W sprawach regulaminu skontaktuj się z administratorem wdrożenia. Maj 2026.
                </p>
            </article>
        </AppLayout>
    );
}
