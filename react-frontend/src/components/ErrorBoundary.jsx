import React from 'react';
import { AlertOctagon, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service here
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-full flex items-center justify-center mb-6 border-8 border-white dark:border-[#141414] shadow-2xl">
                        <AlertOctagon className="w-12 h-12" />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
                        System Interruption Error
                    </h1>

                    <p className="text-sm border border-slate-200 dark:border-[#222] bg-white dark:bg-[#111] px-6 py-4 rounded-xl text-slate-500 font-medium max-w-lg mx-auto mb-10 leading-relaxed shadow-sm">
                        Something went wrong, but don't worry—we're on it. The application encountered an unexpected boundary failure while rendering this module.
                    </p>

                    <button
                        onClick={() => {
                            this.setState({ hasError: false });
                            window.location.href = '/dashboard';
                        }}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/30 flex items-center gap-3 transition-all transform hover:scale-105"
                    >
                        <Home className="w-4 h-4" />
                        Return to Safety
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
