import React from "react";

interface Props {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    completed: Record<string, boolean>;
}

const steps = [
    { id: "business-info", label: "Business Information" },
    { id: "addresses", label: "Addresses" },
    { id: "persons", label: "Associated Persons" },
    { id: "financial", label: "Financial Information" },
    { id: "regulatory", label: "Regulatory" },
    { id: "documents", label: "Documents" },
    { id: "identifying_information", label: "Identity" },
    { id: "extra_documents", label: "Additional Documents" },
    { id: "review", label: "Review" },
];

export default function NavBar({ activeTab, setActiveTab, completed }: Props) {
    return (
        <nav className="flex space-x-4 border-b pb-4 overflow-x-auto mb-6">
            {steps.map((step) => {
                const isActive = step.id === activeTab;
                const isClickable =
                    step.id === "business-info" || completed[step.id] || isActive;

                return (
                    <button
                        key={step.id}
                        type="button"
                        disabled={!isClickable}
                        onClick={() => isClickable && setActiveTab(step.id)}
                        className={`py-2 px-3 text-sm font-medium transition-colors whitespace-nowrap
                            ${isActive
                                ? "text-indigo-600 border-b-2 border-indigo-600"
                                : isClickable
                                ? "text-gray-700 hover:text-gray-900"
                                : "text-gray-300 cursor-not-allowed"
                            }
                        `}
                    >
                        {step.label}
                    </button>
                );
            })}
        </nav>
    );
}
