// NavBar.tsx
import React from 'react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  completed: Record<string, boolean>; // e.g., { 'addresses': true, 'persons': true, ... }
}

const steps = [
  { id: 'business-info', label: 'Business Information' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'persons', label: 'Associated Persons' },
  { id: 'financial', label: 'Financial Information' },
  { id: 'regulatory', label: 'Regulatory' },
  { id: 'documents', label: 'Documents' },
  { id: 'identifying_information', label: 'Identity Information' },
];

export default function NavBar({ activeTab, setActiveTab, completed = {} }: Props) {
  return (
    <nav className="flex space-x-8 border-b">
      {steps.map((step) => {
        const isCurrent = step.id === activeTab;
        // Allow click if:
        // - It's the first tab (always accessible), OR
        // - It's been completed
        const isClickable = step.id === 'business-info' || completed[step.id] || isCurrent;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && setActiveTab(step.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${isCurrent
                ? 'border-indigo-500 text-indigo-600'
                : !isClickable
                ? 'border-transparent text-gray-300 cursor-not-allowed'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {step.label}
          </button>
        );
      })}
    </nav>
  );
}