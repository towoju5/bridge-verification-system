import React, { useState } from 'react';
import axios from 'axios';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    setActiveTab: (tab: string) => void;
}

export default function Regulatory({ formData, setFormData, setActiveTab }: Props) {
    const [local, setLocal] = useState({
        regulated_activities_description: formData.regulated_activity?.regulated_activities_description || '',
        primary_regulatory_authority_country: formData.regulated_activity?.primary_regulatory_authority_country || '',
        primary_regulatory_authority_name: formData.regulated_activity?.primary_regulatory_authority_name || '',
        license_number: formData.regulated_activity?.license_number || '',
    });

    const next = async () => {
        await axios.post('/api/business-customer/step/5', { regulated_activity: local });
        setFormData((prev: any) => ({ ...prev, regulated_activity: local }));
        setActiveTab('documents');
    };

    return (
        <div className="bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Regulatory Information</h2>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Regulated Activities Description</label>
                    <textarea
                        rows={3}
                        value={local.regulated_activities_description}
                        onChange={(e) => setLocal({ ...local, regulated_activities_description: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Regulatory Authority Country</label>
                    <input
                        value={local.primary_regulatory_authority_country}
                        onChange={(e) => setLocal({ ...local, primary_regulatory_authority_country: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                        placeholder="3-letter code (e.g., USA)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Regulatory Authority Name</label>
                    <input
                        value={local.primary_regulatory_authority_name}
                        onChange={(e) => setLocal({ ...local, primary_regulatory_authority_name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <input
                        value={local.license_number}
                        onChange={(e) => setLocal({ ...local, license_number: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={next}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Next
                </button>
            </div>
        </div>
    );
}