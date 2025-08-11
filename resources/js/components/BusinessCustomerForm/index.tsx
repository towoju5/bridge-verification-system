// resources/js/components/BusinessCustomerForm/index.tsx
import React, { useState } from 'react';
import { router } from '@inertiajs/react';

// types
import {
  FormData,
  Address,
  AssociatedPerson,
} from './types/business.types';

// tab components
import { BusinessInfoTab } from './tabs/BusinessInfoTab';
import { AddressesTab } from './tabs/AddressesTab';
import { AssociatedPersonsTab } from './tabs/AssociatedPersonsTab';
import { FinancialTab } from './tabs/FinancialTab';
import { RegulatoryTab } from './tabs/RegulatoryTab';

// initial blank state
const initialFormData: FormData = {
  type: 'business',
  business_legal_name: '',
  business_trade_name: '',
  business_description: '',
  email: '',
  business_type: '',
  primary_website: '',
  other_websites: [],
  registered_address: {
    street_line_1: '',
    street_line_2: '',
    city: '',
    subdivision: '',
    postal_code: '',
    country: '',
  },
  physical_address: {
    street_line_1: '',
    street_line_2: '',
    city: '',
    subdivision: '',
    postal_code: '',
    country: '',
  },
  signed_agreement_id: '',
  is_dao: false,
  compliance_screening_explanation: '',
  associated_persons: [],
  business_industry: [],
  ownership_threshold: 25,
  has_material_intermediary_ownership: false,
  estimated_annual_revenue_usd: '',
  expected_monthly_payments_usd: 0,
  operates_in_prohibited_countries: 'no',
  account_purpose: '',
  account_purpose_other: '',
  high_risk_activities: ['none_of_the_above'],
  high_risk_activities_explanation: '',
  source_of_funds: '',
  source_of_funds_description: '',
  conducts_money_services: false,
  conducts_money_services_using_bridge: false,
  conducts_money_services_description: '',
  regulated_activity: {
    regulated_activities_description: '',
    primary_regulatory_authority_country: '',
    primary_regulatory_authority_name: '',
    license_number: '',
  },
  identifying_information: [],
  documents: [],
};

type TabKey =
  | 'business-info'
  | 'addresses'
  | 'persons'
  | 'financial'
  | 'regulatory';

export const BusinessCustomerForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('business-info');
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------------
   * Helpers
   * ------------------------------------------------- */
  const setField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const setAddress = (
    type: 'registered_address' | 'physical_address',
    field: keyof Address,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const setPerson = (idx: number, field: string, value: any) => {
    const updated = [...formData.associated_persons];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData((prev) => ({ ...prev, associated_persons: updated }));
  };

  const addPerson = () => {
    const blank: AssociatedPerson = {
      first_name: '',
      last_name: '',
      birth_date: '',
      email: '',
      phone: '',
      residential_address: {
        street_line_1: '',
        street_line_2: '',
        city: '',
        subdivision: '',
        postal_code: '',
        country: '',
      },
      has_ownership: false,
      has_control: false,
      is_signer: false,
      is_director: false,
      title: '',
      ownership_percentage: 0,
      relationship_established_at: '',
      identifying_information: [],
      documents: [],
    };
    setFormData((prev) => ({
      ...prev,
      associated_persons: [...prev.associated_persons, blank],
    }));
  };

  const removePerson = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      associated_persons: prev.associated_persons.filter((_, i) => i !== idx),
    }));
  };

  /* -------------------------------------------------
   * Validation
   * ------------------------------------------------- */
  const validate = (): boolean => {
    const e: Record<string, string> = {};

    /* --- sample rules, keep or extend --- */
    if (!formData.business_legal_name.trim())
      e.business_legal_name = 'Required';
    if (!formData.business_trade_name.trim())
      e.business_trade_name = 'Required';
    if (!formData.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'Invalid email';

    // address
    if (!formData.registered_address.street_line_1.trim())
      e['registered_address.street_line_1'] = 'Required';
    if (!formData.physical_address.street_line_1.trim())
      e['physical_address.street_line_1'] = 'Required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* -------------------------------------------------
   * Submission
   * ------------------------------------------------- */
  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    router.post('/business-customers', formData, {
      onFinish: () => setLoading(false),
    });
  };

  /* -------------------------------------------------
   * Tab Navigation
   * ------------------------------------------------- */
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'business-info', label: 'Business Information' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'persons', label: 'Associated Persons' },
    { key: 'financial', label: 'Financial Information' },
    { key: 'regulatory', label: 'Regulatory' },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6">
      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-8">
          {tabs.map(({ key, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active Tab */}
      <div className="space-y-6">
        {activeTab === 'business-info' && (
          <BusinessInfoTab data={formData} setField={setField} errors={errors} />
        )}
        {activeTab === 'addresses' && (
          <AddressesTab
            registered={formData.registered_address}
            physical={formData.physical_address}
            setAddress={setAddress}
            errors={errors}
          />
        )}
        {activeTab === 'persons' && (
          <AssociatedPersonsTab
            persons={formData.associated_persons}
            addPerson={addPerson}
            removePerson={removePerson}
            setPerson={setPerson}
            errors={errors}
          />
        )}
        {activeTab === 'financial' && (
          <FinancialTab data={formData} setField={setField} errors={errors} />
        )}
        {activeTab === 'regulatory' && (
          <RegulatoryTab data={formData} setField={setField} errors={errors} />
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end mt-8">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Submit Business Customer'}
        </button>
      </div>
    </form>
  );
};