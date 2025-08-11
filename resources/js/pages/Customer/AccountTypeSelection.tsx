// resources/js/Pages/Customer/AccountTypeSelection.tsx
import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout'; // Adjust path if needed

export default function AccountTypeSelection() {
    const handleSelect = (type: 'individual' | 'business') => {
        if (type === 'individual') {
            // Redirect to the individual verification form
            window.location.href = route('customer.verify.start');
        } else if (type === 'business') {
            // For now, show an alert or redirect to a placeholder
            // alert('Business verification is not available yet.');
            window.location.href = route('business.verify.start');
        }
    };

    return (
        <AppLayout title="Select Account Type">
            <Head title="Select Account Type" />

            <div className="h-full justify-center max-w-md mx-auto mt-10 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Select Account Type</h2>
                <div className="space-y-4">
                    <button
                        onClick={() => handleSelect('individual')}
                        className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 cursor-pointer border border-blue-200 rounded-lg shadow transition duration-150 ease-in-out"
                    >
                        <span className="text-lg font-medium text-blue-700">Individual</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>

                    <button
                        onClick={() => handleSelect('business')}
                        // disabled // Disable for now
                        // className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg shadow opacity-50 cursor-not-allowed"
                        className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 cursor-pointer border border-blue-200 rounded-lg shadow transition duration-150 ease-in-out"
                    >
                        <span className="text-lg font-medium text-blue-800">Business</span> {/* Gray text for disabled */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </button>
                </div>
                <p className="mt-6 text-center text-sm text-gray-500">
                    Choose 'Individual' to verify your personal account. Business verification is coming soon.
                </p>
            </div>
        </AppLayout>
    );
}
