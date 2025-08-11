import React from 'react';

interface Props {
	activeTab: string;
	setActiveTab: (tab: string) => void;
	completed: Record<string, boolean>; // step name → true/false
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
			{steps.map((step, idx) => {
				const isCurrent = step.id === activeTab;
				const isDisabled =
					idx > 0 && !completed[steps[idx - 1].id]; // disable if previous step not done

				return (
					<button
						key={step.id}
						type="button"
						disabled={isDisabled}
						onClick={() => !isDisabled && setActiveTab(step.id)}
						className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${isCurrent
								? 'border-indigo-500 text-indigo-600'
								: isDisabled
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