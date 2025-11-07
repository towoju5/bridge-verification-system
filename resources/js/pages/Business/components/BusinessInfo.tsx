// businessInfo.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    setActiveTab: (tab: string) => void;
    businessTypes: string[];
    industryCodes: { code: string; description: string }[];
}

export default function BusinessInfo({
    formData,
    setFormData,
    setActiveTab,
    businessTypes,
    industryCodes,
}: Props) {
    const [local, setLocal] = useState({
        business_legal_name: formData.business_legal_name || '',
        business_trade_name: formData.business_trade_name || '',
        business_description: formData.business_description || '',
        email: formData.email || '',
        business_type: formData.business_type || '',
        primary_website: formData.primary_website || '',
        is_dao: formData.is_dao || false,
        business_industry: formData.business_industry || '',
        registration_number: formData.registration_number || '',
        incorporation_date: formData.incorporation_date || '',
        tax_id: formData.tax_id || '',
        statement_descriptor: formData.statement_descriptor || '',
        phone_calling_code: formData.phone_calling_code || '+234', // default for Nigeria
        phone_number: formData.phone_number || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!local.business_legal_name.trim()) e.business_legal_name = 'Required';
        if (!local.business_trade_name.trim()) e.business_trade_name = 'Required';
        if (!local.business_description.trim()) e.business_description = 'Required';
        if (!local.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(local.email))
            e.email = 'Valid email required';
        if (!local.business_type) e.business_type = 'Required';
        if (!local.registration_number.trim()) e.registration_number = 'Required';
        if (!local.incorporation_date) e.incorporation_date = 'Required';
        if (!local.tax_id.trim()) e.tax_id = 'Required';
        if (!local.phone_number.trim()) e.phone_number = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = async () => {
        if (!validate()) return;
        await axios.post('/api/business-customer/step/1', local);
        setFormData((prev: any) => ({ ...prev, ...local }));
        setActiveTab('addresses');
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Business Information</h2>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Business Legal Name *</label>
                    <input
                        value={local.business_legal_name}
                        onChange={(e) => setLocal({ ...local, business_legal_name: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_legal_name ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.business_legal_name && <p className="text-sm text-red-600">{errors.business_legal_name}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Business Trade Name (DBA) *</label>
                    <input
                        value={local.business_trade_name}
                        onChange={(e) => setLocal({ ...local, business_trade_name: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_trade_name ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.business_trade_name && <p className="text-sm text-red-600">{errors.business_trade_name}</p>}
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Business Description *</label>
                    <textarea
                        rows={3}
                        value={local.business_description}
                        onChange={(e) => setLocal({ ...local, business_description: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_description ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.business_description && <p className="text-sm text-red-600">{errors.business_description}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Business Email *</label>
                    <input
                        type="email"
                        value={local.email}
                        onChange={(e) => setLocal({ ...local, email: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Website</label>
                    <input
                        type="url"
                        value={local.primary_website}
                        onChange={(e) => setLocal({ ...local, primary_website: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Business Type *</label>
                    <select
                        value={local.business_type}
                        onChange={(e) => setLocal({ ...local, business_type: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_type ? 'border-red-300' : 'border-gray-300'}`}
                    >
                        <option value="">Select business type</option>
                        {businessTypes.map((t) => (
                            <option key={t} value={t}>
                                {t.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </option>
                        ))}
                    </select>
                    {errors.business_type && <p className="text-sm text-red-600">{errors.business_type}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Registration Number *</label>
                    <input
                        value={local.registration_number}
                        onChange={(e) => setLocal({ ...local, registration_number: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.registration_number ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.registration_number && <p className="text-sm text-red-600">{errors.registration_number}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Incorporation Date *</label>
                    <input
                        type="date"
                        value={local.incorporation_date}
                        onChange={(e) => setLocal({ ...local, incorporation_date: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.incorporation_date ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.incorporation_date && <p className="text-sm text-red-600">{errors.incorporation_date}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tax ID (e.g., IRD) *</label>
                    <input
                        value={local.tax_id}
                        onChange={(e) => setLocal({ ...local, tax_id: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.tax_id ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    {errors.tax_id && <p className="text-sm text-red-600">{errors.tax_id}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Statement Descriptor</label>
                    <input
                        value={local.statement_descriptor}
                        onChange={(e) => setLocal({ ...local, statement_descriptor: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                        placeholder="e.g., TECHSOLUTIONS"
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Business Phone *</label>
                    <div className="flex space-x-2">
                        <input
                            value={local.phone_calling_code}
                            onChange={(e) => setLocal({ ...local, phone_calling_code: e.target.value })}
                            className="w-24 border border-gray-300 rounded-md shadow-sm py-2 px-3"
                            placeholder="+234"
                        />
                        <input
                            value={local.phone_number}
                            onChange={(e) => setLocal({ ...local, phone_number: e.target.value })}
                            className={`flex-1 border rounded-md shadow-sm py-2 px-3 ${errors.phone_number ? 'border-red-300' : 'border-gray-300'}`}
                            placeholder="8039395114"
                        />
                    </div>
                    {errors.phone_number && <p className="text-sm text-red-600">{errors.phone_number}</p>}
                </div>
                <div className="sm:col-span-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={local.is_dao}
                            onChange={(e) => setLocal({ ...local, is_dao: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 block text-sm text-gray-700">This business is a DAO</span>
                    </label>
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Business Industry *</label>
                    <select
                        value={local.business_industry}
                        onChange={(e) => setLocal({ ...local, business_industry: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_industry ? 'border-red-300' : 'border-gray-300'}`}
                    >
                        {industryCodes.map((i) => (
                            <option key={i.code} value={i.code}>
                                {i.description}
                            </option>
                        ))}
                    </select>
                    {errors.business_industry && <p className="text-sm text-red-600">{errors.business_industry}</p>}
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