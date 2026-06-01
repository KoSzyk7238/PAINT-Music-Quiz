import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';

export default function NotFoundPage() {
    return (
        <AppLayout title="Nie znaleziono" showBack={false}>
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
                <p className="text-8xl font-black text-green-500/20 italic mb-4">404</p>
                <h1 className="text-3xl font-black uppercase italic mb-4">Strona nie istnieje</h1>
                <p className="text-gray-400 text-sm max-w-md mb-8">
                    Adres, którego szukasz, nie pasuje do żadnej trasy w aplikacji.
                </p>
                <Link
                    to="/"
                    className="px-8 py-4 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-green-400 transition-colors"
                >
                    Wróć do quizów
                </Link>
            </div>
        </AppLayout>
    );
}
