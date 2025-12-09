// resources/js/components/BusinessCustomerForm/tabs/BusinessInfoTab.tsx
import React from 'react';
import { FormInput } from '../shared/FormInput';
import { FormSelect } from '../shared/FormSelect';
import { industryCodes, businessTypes } from '../constants/staticData';

export interface BusinessInfoSlice {
    business_legal_name: string;
    business_trade_name: string;
    business_description: string;
    email: string;
    business_type: string;
    primary_website: string;
    is_dao: boolean;
    business_industry: string[];
}

interface Props {
    data: BusinessInfoSlice;
    onChange: (field: keyof BusinessInfoSlice, value: any) => void;
    errors: Record<string, string>;
}

export const BusinessInfoTab: React.FC<Props> = ({ data, onChange, errors }) => (
    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <FormInput
            label="Business Legal Name *"
            value={data.business_legal_name}
            onChange={(e) => onChange('business_legal_name', e.target.value)}
            error={errors.business_legal_name}
        />

        <FormInput
            label="Business Trade Name (DBA) *"
            value={data.business_trade_name}
            onChange={(e) => onChange('business_trade_name', e.target.value)}
            error={errors.business_trade_name}
        />

        <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-white">
                Business Description *
            </label>
            <textarea
                rows={3}
                value={data.business_description}
                onChange={(e) => onChange('business_description', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.business_description ? 'border-red-300' : 'border-gray-300'
                    }`}
            />
            {errors.business_description && (
                <p className="mt-1 text-sm text-red-600">{errors.business_description}</p>
            )}
        </div>

        <FormInput
            label="Business Email *"
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            error={errors.email}
        />

        <FormInput
            label="Primary Website"
            type="url"
            value={data.primary_website}
            onChange={(e) => onChange('primary_website', e.target.value)}
        />

        <FormSelect
            label="Business Type *"
            value={data.business_type}
            onChange={(e) => onChange('business_type', e.target.value)}
            options={businessTypes.map((t) => ({
                value: t,
                label: t.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            }))}
            error={errors.business_type}
        />

        <div className="sm:col-span-2">
            <label className="flex items-center">
                <input
                    type="checkbox"
                    checked={data.is_dao}
                    onChange={(e) => onChange('is_dao', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 block text-sm text-gray-700">
                    This business is a DAO (Decentralized Autonomous Organization)
                </span>
            </label>
        </div>

        <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-white">
                Business Industry *
            </label>
            <select
                value={data.business_industry}
                onChange={(e) =>
                    onChange(
                        'business_industry',
                        Array.from(e.target.selectedOptions, (o) => o.value),
                    )
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
                {industryCodes.map((ind) => (
                    <option key={ind.code} value={ind.code}>
                        {ind.description}
                    </option>
                ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">Select one or more industry codes</p>
        </div>
    </div>
);