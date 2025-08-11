// resources/js/Layouts/AppLayout.tsx
import React, { PropsWithChildren } from 'react';

interface AppLayoutProps extends PropsWithChildren {
    title?: string;
    // Add other props like auth, errors, etc. if needed
}

export default function AppLayout({ title, children }: AppLayoutProps) {
    return (
        <div className="min-w-8xl min-h-screen bg-gray-100 flex">
            {title && (
                <head>
                    <title>{title}</title>
                </head>
            )}
            <div className="mx-auto sm:px-6 lg:px-8">
                <div className="flex-1 overflow-hidden sm:rounded-lg">
                    <div className="p-6 text-gray-900">{children}</div>
                </div>
            </div>
        </div>
    );
}
