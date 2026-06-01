import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary:', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-6 text-center">
                    <AlertTriangle className="text-red-500 mb-6" size={48} aria-hidden />
                    <h1 className="text-2xl font-black uppercase italic mb-3">Coś poszło nie tak</h1>
                    <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
                        Wystąpił nieoczekiwany błąd aplikacji. Możesz spróbować ponownie lub wrócić na stronę główną.
                    </p>
                    {import.meta.env.DEV && this.state.error && (
                        <pre className="text-left text-xs text-red-300/80 bg-gray-900/80 p-4 rounded-xl mb-8 max-w-lg overflow-auto w-full">
                            {this.state.error.message}
                        </pre>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={this.handleRetry}
                            className="px-6 py-3 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-green-400 transition-colors"
                        >
                            Spróbuj ponownie
                        </button>
                        <Link
                            to="/"
                            className="px-6 py-3 border-2 border-gray-700 text-white font-bold uppercase tracking-wider rounded-xl hover:border-green-500 transition-colors"
                        >
                            Strona główna
                        </Link>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
