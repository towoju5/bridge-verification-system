// resources/js/components/BusinessCustomerForm/tabs/FinancialTab.tsx
import React from 'react';
import { FormInput } from '../shared/FormInput';
import { FormSelect } from '../shared/FormSelect';
import {
  accountPurposes,
  sourceOfFunds,
  highRiskActivities,
  estimatedRevenueOptions,
} from '../constants/staticData';

export interface FinancialSlice {
  account_purpose: string;
  account_purpose_other: string;
  source_of_funds: string;
  source_of_funds_description: string;
  high_risk_activities: string[];
  high_risk_activities_explanation: string;
  conducts_money_services: boolean;
  conducts_money_services_using_bridge: boolean;
  conducts_money_services_description: string;
  compliance_screening_explanation: string;
  estimated_annual_revenue_usd: string;
  expected_monthly_payments_usd: number;
  operates_in_prohibited_countries: 'yes' | 'no';
  ownership_threshold: number;
  has_material_intermediary_ownership: boolean;
}

interface Props {
  data: FinancialSlice;
  onChange: <K extends keyof FinancialSlice>(
    field: K,
    value: FinancialSlice[K],
  ) => void;
  errors: Record<string, string>;
}

export const FinancialTab: React.FC<Props> = ({ data, onChange, errors }) => {
  const handleHighRiskToggle = (activity: string) => {
    let next = [...data.high_risk_activities];
    if (activity === 'none_of_the_above') {
      next = ['none_of_the_above'];
    } else {
      next = next.filter((a) => a !== 'none_of_the_above');
      next = next.includes(activity)
        ? next.filter((a) => a !== activity)
        : [...next, activity];
      if (next.length === 0) next = ['none_of_the_above'];
    }
    onChange('high_risk_activities', next);
  };

  const revenueOptions = estimatedRevenueOptions.map((opt) => ({
    value: opt,
    label: opt
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  }));

  return (
    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
      <FormSelect
        label="Account Purpose *"
        value={data.account_purpose}
        onChange={(e) => onChange('account_purpose', e.target.value)}
        options={accountPurposes.map((p) => ({
          value: p,
          label: p.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        }))}
        error={errors.account_purpose}
      />

      {data.account_purpose === 'other' && (
        <FormInput
          label="Specify Account Purpose *"
          value={data.account_purpose_other}
          onChange={(e) => onChange('account_purpose_other', e.target.value)}
          error={errors.account_purpose_other}
        />
      )}

      <FormSelect
        label="Source of Funds *"
        value={data.source_of_funds}
        onChange={(e) => onChange('source_of_funds', e.target.value)}
        options={sourceOfFunds.map((s) => ({
          value: s,
          label: s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        }))}
        error={errors.source_of_funds}
      />

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-white">
          Source of Funds Description
        </label>
        <textarea
          rows={3}
          value={data.source_of_funds_description}
          onChange={(e) => onChange('source_of_funds_description', e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      {/* High-risk activities */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
          High-Risk Activities
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {highRiskActivities.map((act) => (
            <label key={act} className="flex items-center">
              <input
                type="checkbox"
                checked={data.high_risk_activities.includes(act)}
                onChange={() => handleHighRiskToggle(act)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 block text-sm text-gray-700">
                {act.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
        {errors.high_risk_activities && (
          <p className="mt-1 text-sm text-red-600">{errors.high_risk_activities}</p>
        )}
      </div>

      {(!data.high_risk_activities.includes('none_of_the_above') ||
        data.high_risk_activities.length > 1) && (
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-white">
            High-Risk Activities Explanation *
          </label>
          <textarea
            rows={3}
            value={data.high_risk_activities_explanation}
            onChange={(e) => onChange('high_risk_activities_explanation', e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
              errors.high_risk_activities_explanation ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.high_risk_activities_explanation && (
            <p className="mt-1 text-sm text-red-600">
              {errors.high_risk_activities_explanation}
            </p>
          )}
        </div>
      )}

      {/* Money services */}
      <div className="sm:col-span-2">
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={data.conducts_money_services}
            onChange={(e) => onChange('conducts_money_services', e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
          />
          <span className="ml-2 block text-sm font-medium text-gray-700 dark:text-white">
            This business offers money services, investment products, and/or other
            financial services
          </span>
        </label>
      </div>

      {data.conducts_money_services && (
        <>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-white">
              Description of Money Services Offered *
            </label>
            <textarea
              rows={3}
              value={data.conducts_money_services_description}
              onChange={(e) => onChange('conducts_money_services_description', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.conducts_money_services_description ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.conducts_money_services_description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.conducts_money_services_description}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-white">
              Compliance Screening Explanation *
            </label>
            <textarea
              rows={3}
              value={data.compliance_screening_explanation}
              onChange={(e) => onChange('compliance_screening_explanation', e.target.value)}
              className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                errors.compliance_screening_explanation ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.compliance_screening_explanation && (
              <p className="mt-1 text-sm text-red-600">
                {errors.compliance_screening_explanation}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={data.conducts_money_services_using_bridge}
                onChange={(e) =>
                  onChange('conducts_money_services_using_bridge', e.target.checked)
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
              />
              <span className="ml-2 block text-sm font-medium text-gray-700 dark:text-white">
                Plans to conduct money services using its Bridge account
              </span>
            </label>
          </div>
        </>
      )}

      {/* Revenue & payments */}
      <FormSelect
        label="Estimated Annual Revenue (USD)"
        value={data.estimated_annual_revenue_usd}
        onChange={(e) => onChange('estimated_annual_revenue_usd', e.target.value)}
        options={revenueOptions}
      />

      <FormInput
        label="Expected Monthly Payments (USD)"
        type="number"
        min="0"
        value={data.expected_monthly_payments_usd}
        onChange={(e) =>
          onChange('expected_monthly_payments_usd', Number(e.target.value))
        }
      />

      <FormSelect
        label="Operates in Prohibited Countries?"
        value={data.operates_in_prohibited_countries}
        onChange={(e) =>
          onChange('operates_in_prohibited_countries', e.target.value as 'yes' | 'no')
        }
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
      />

      <FormSelect
        label="Ownership Threshold"
        value={String(data.ownership_threshold)}
        onChange={(e) => onChange('ownership_threshold', Number(e.target.value))}
        options={[5, 10, 15, 20, 25].map((t) => ({
          value: String(t),
          label: `${t}%`,
        }))}
      />

      <div className="sm:col-span-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.has_material_intermediary_ownership}
            onChange={(e) =>
              onChange('has_material_intermediary_ownership', e.target.checked)
            }
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <span className="ml-2 block text-sm text-gray-700">
            Has at least one intermediate legal entity owner with 25% or more ownership
          </span>
        </label>
      </div>
    </div>
  );
};