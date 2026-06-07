import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from './Footer';
import usePageTitle from '../hooks/usePageTitle';

export default function AppLayout({
    children,
    title,
    showFooter = true,
    showBack = true,
    compactFooter = false,
    className = '',
}) {
    usePageTitle(title);

    return (
        <div className={`min-h-screen bg-black text-white font-sans flex flex-col ${className}`}>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-green-500 focus:text-black focus:font-bold focus:rounded-lg"
            >
                Przejdź do treści
            </a>

            {showBack && (
                <div className="w-full max-w-5xl mx-auto px-4 sm:px-10 pt-4 sm:pt-8">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-3 text-green-500 hover:text-green-400 hover:-translate-x-2 transition-all font-bold uppercase tracking-widest text-sm"
                    >
                        <ArrowLeft size={22} aria-hidden />
                        Powrót
                    </Link>
                </div>
            )}

            <main id="main-content" className="flex-1 flex flex-col w-full">
                {children}
            </main>

            {showFooter && <Footer compact={compactFooter} />}
        </div>
    );
}
