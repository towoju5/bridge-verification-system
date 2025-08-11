// resources/js/components/BusinessCustomerForm/tabs/RegulatoryTab.tsx
import React from 'react';
import { FormInput } from '../shared/FormInput';

export interface RegulatorySlice {
  regulated_activity: {
    regulated_activities_description: string;
    primary_regulatory_authority_country: string;
    primary_regulatory_authority_name: string;
    license_number: string;
  };
}

interface Props {
  data: RegulatorySlice;
  onChange: (field: keyof RegulatorySlice, value: any) => void;
  errors: Record<string, string>;
}

export const RegulatoryTab: React.FC<Props> = ({ data, onChange, errors }) => {
  const setRegulated = (
    key: keyof RegulatorySlice['regulated_activity'],
    value: string,
  ) => {
    onChange('regulated_activity', {
      ...data.regulated_activity,
      [key]: value,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700">
          Regulated Activities Description
        </label>
        <textarea
          rows={3}
          value={data.regulated_activity.regulated_activities_description}
          onChange={(e) => setRegulated('regulated_activities_description', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <FormInput
        label="Primary Regulatory Authority Country (3-letter)"
        value={data.regulated_activity.primary_regulatory_authority_country}
        onChange={(e) => setRegulated('primary_regulatory_authority_country', e.target.value)}
        placeholder="e.g. USA"
      />

      <FormInput
        label="Primary Regulatory Authority Name"
        value={data.regulated_activity.primary_regulatory_authority_name}
        onChange={(e) => setRegulated('primary_regulatory_authority_name', e.target.value)}
      />

      <FormInput
        label="License Number"
        value={data.regulated_activity.license_number}
        onChange={(e) => setRegulated('license_number', e.target.value)}
      />

      {errors.regulated_activity && (
        <div className="sm:col-span-2 mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">{errors.regulated_activity}</p>
        </div>
      )}
    </div>
  );
};