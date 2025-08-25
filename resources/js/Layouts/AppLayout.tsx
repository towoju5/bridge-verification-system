// resources/js/Layouts/AppLayout.tsx
import React, { PropsWithChildren, useEffect, useState } from 'react';

interface AppLayoutProps extends PropsWithChildren {
    title?: string;
}

export default function AppLayout({ title, children }: AppLayoutProps) {
    const [darkMode, setDarkMode] = useState(false);

    // Load saved theme from localStorage
    useEffect(() => {
        if (
            localStorage.theme === 'dark' ||
            (!('theme' in localStorage) &&
                window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (darkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            setDarkMode(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            setDarkMode(true);
        }
    };

    return (
        <div className="min-w-8xl min-h-screen bg-gray-100 dark:bg-gray-800 flex flex-col">
            {title && (
                <head>
                    <title>{title}</title>
                </head>
            )}

            {/* Header with theme toggle */}
            <header className="w-full flex justify-end p-4">
                <button
                    onClick={toggleTheme}
                    className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow"
                >
                    {darkMode ? '🌙 Dark' : '☀️ Light'}
                </button>
            </header>

            <main className="mx-auto w-full sm:px-6 lg:px-8 flex-1">
                <div className="overflow-hidden sm:rounded-lg">
                    <div className="p-6 text-gray-900 dark:text-gray-100">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
