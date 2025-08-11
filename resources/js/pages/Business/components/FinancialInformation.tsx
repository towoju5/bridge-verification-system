import React, { useState } from 'react';
import axios from 'axios';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    setActiveTab: (tab: string) => void;
    accountPurposes: string[];
    estimatedRevenueOptions: string[];
}

export default function FinancialInformation({
    formData,
    setFormData,
    setActiveTab,
    accountPurposes,
    estimatedRevenueOptions,
}: Props) {
    const [local, setLocal] = useState({
        account_purpose: formData.account_purpose || '',
        account_purpose_other: formData.account_purpose_other || '',
        source_of_funds: formData.source_of_funds || '',
        source_of_funds_description: formData.source_of_funds_description || '',
        high_risk_activities: formData.high_risk_activities || ['none_of_the_above'],
        high_risk_activities_explanation: formData.high_risk_activities_explanation || '',
        conducts_money_services: formData.conducts_money_services || false,
        conducts_money_services_using_bridge: formData.conducts_money_services_using_bridge || false,
        conducts_money_services_description: formData.conducts_money_services_description || '',
        compliance_screening_explanation: formData.compliance_screening_explanation || '',
        estimated_annual_revenue_usd: formData.estimated_annual_revenue_usd || '',
        expected_monthly_payments_usd: formData.expected_monthly_payments_usd || 0,
        operates_in_prohibited_countries: formData.operates_in_prohibited_countries || 'no',
        ownership_threshold: formData.ownership_threshold || 25,
        has_material_intermediary_ownership: formData.has_material_intermediary_ownership || false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!local.account_purpose) e.account_purpose = 'Required';
        if (local.account_purpose === 'other' && !local.account_purpose_other.trim())
            e.account_purpose_other = 'Required';
        if (!local.source_of_funds) e.source_of_funds = 'Required';
        if (!local.high_risk_activities.includes('none_of_the_above') && !local.high_risk_activities_explanation.trim())
            e.high_risk_activities_explanation = 'Required';
        if (local.conducts_money_services && !local.conducts_money_services_description.trim())
            e.conducts_money_services_description = 'Required';
        if (local.conducts_money_services && !local.compliance_screening_explanation.trim())
            e.compliance_screening_explanation = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = async () => {
        if (!validate()) return;
        await axios.post('/api/business-customer/step/4', local);
        setFormData((prev: any) => ({ ...prev, ...local }));
        setActiveTab('regulatory');
    };

    const handleCheckbox = (activity: string) => {
        let nextActs = [...local.high_risk_activities];
        if (activity === 'none_of_the_above') nextActs = ['none_of_the_above'];
        else {
            nextActs = nextActs.filter((a) => a !== 'none_of_the_above');
            if (nextActs.includes(activity)) nextActs = nextActs.filter((a) => a !== activity);
            else nextActs.push(activity);
            if (!nextActs.length) nextActs = ['none_of_the_above'];
        }
        setLocal({ ...local, high_risk_activities: nextActs });
    };

    return (
        <div className="bg-white shadow sm:rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Financial Information</h2>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Account Purpose *</label>
                    <select
                        value={local.account_purpose}
                        onChange={(e) => setLocal({ ...local, account_purpose: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.account_purpose ? 'border-red-300' : 'border-gray-300'}`}
                    >
                        <option value="">Select purpose</option>
                        {accountPurposes.map((p) => (
                            <option key={p} value={p}>
                                {p.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </option>
                        ))}
                    </select>
                    {errors.account_purpose && <p className="text-sm text-red-600">{errors.account_purpose}</p>}
                </div>

                {local.account_purpose === 'other' && (
                    <div>
                        <label>Specify Account Purpose *</label>
                        <input
                            value={local.account_purpose_other}
                            onChange={(e) => setLocal({ ...local, account_purpose_other: e.target.value })}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.account_purpose_other ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        {errors.account_purpose_other && <p className="text-sm text-red-600">{errors.account_purpose_other}</p>}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Source of Funds *</label>
                    <select
                        value={local.source_of_funds}
                        onChange={(e) => setLocal({ ...local, source_of_funds: e.target.value })}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.source_of_funds ? 'border-red-300' : 'border-gray-300'}`}
                    >
                        <option value="">Select source</option>
                        {['business_loans', 'grants', 'inter_company_funds', 'investment_proceeds', 'legal_settlement', 'owners_capital', 'pension_retirement', 'sale_of_assets', 'sales_of_goods_and_services', 'tax_refund', 'third_party_funds', 'treasury_reserves'].map((s) => (
                            <option key={s} value={s}>
                                {s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </option>
                        ))}
                    </select>
                    {errors.source_of_funds && <p className="text-sm text-red-600">{errors.source_of_funds}</p>}
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">High Risk Activities</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[
                            'adult_entertainment',
                            'gambling',
                            'hold_client_funds',
                            'investment_services',
                            'lending_banking',
                            'marijuana_or_related_services',
                            'money_services',
                            'nicotine_tobacco_or_related_services',
                            'operate_foreign_exchange_virtual_currencies_brokerage_otc',
                            'pharmaceuticals',
                            'precious_metals_precious_stones_jewelry',
                            'safe_deposit_box_rentals',
                            'third_party_payment_processing',
                            'weapons_firearms_and_explosives',
                            'none_of_the_above',
                        ].map((act) => (
                            <label key={act} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={local.high_risk_activities.includes(act)}
                                    onChange={() => handleCheckbox(act)}
                                    disabled={act === 'none_of_the_above' && local.high_risk_activities.length > 1 && !local.high_risk_activities.includes('none_of_the_above')}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 block text-sm text-gray-700">
                                    {act.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {(!local.high_risk_activities.includes('none_of_the_above') || local.high_risk_activities.length > 1) && (
                    <div className="sm:col-span-2">
                        <label>High Risk Activities Explanation *</label>
                        <textarea
                            rows={3}
                            value={local.high_risk_activities_explanation}
                            onChange={(e) => setLocal({ ...local, high_risk_activities_explanation: e.target.value })}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.high_risk_activities_explanation ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        {errors.high_risk_activities_explanation && <p className="text-sm text-red-600">{errors.high_risk_activities_explanation}</p>}
                    </div>
                )}

                <div className="sm:col-span-2">
                    <label className="flex items-start">
                        <input
                            type="checkbox"
                            checked={local.conducts_money_services}
                            onChange={(e) => setLocal({ ...local, conducts_money_services: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                        />
                        <span className="ml-2 block text-sm font-medium text-gray-700">
                            This business offers money services, investment products, and/or other financial services
                        </span>
                    </label>
                </div>

                {local.conducts_money_services && (
                    <>
                        <div className="sm:col-span-2">
                            <label>Description of Money Services Offered *</label>
                            <textarea
                                rows={3}
                                value={local.conducts_money_services_description}
                                onChange={(e) => setLocal({ ...local, conducts_money_services_description: e.target.value })}
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.conducts_money_services_description ? 'border-red-300' : 'border-gray-300'}`}
                            />
                            {errors.conducts_money_services_description && <p className="text-sm text-red-600">{errors.conducts_money_services_description}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <label>Compliance Screening Explanation *</label>
                            <textarea
                                rows={3}
                                value={local.compliance_screening_explanation}
                                onChange={(e) => setLocal({ ...local, compliance_screening_explanation: e.target.value })}
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.compliance_screening_explanation ? 'border-red-300' : 'border-gray-300'}`}
                            />
                            {errors.compliance_screening_explanation && <p className="text-sm text-red-600">{errors.compliance_screening_explanation}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="flex items-start">
                                <input
                                    type="checkbox"
                                    checked={local.conducts_money_services_using_bridge}
                                    onChange={(e) => setLocal({ ...local, conducts_money_services_using_bridge: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                                />
                                <span className="ml-2 block text-sm font-medium text-gray-700">
                                    This business plans to conduct money services using its Bridge account
                                </span>
                            </label>
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Estimated Annual Revenue (USD)</label>
                    <select
                        value={local.estimated_annual_revenue_usd}
                        onChange={(e) => setLocal({ ...local, estimated_annual_revenue_usd: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    >
                        <option value="">Select revenue range</option>
                        {estimatedRevenueOptions.map((r) => (
                            <option key={r} value={r}>
                                {r.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Expected Monthly Payments (USD)</label>
                    <input
                        type="number"
                        min="0"
                        value={local.expected_monthly_payments_usd}
                        onChange={(e) => setLocal({ ...local, expected_monthly_payments_usd: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Operates in Prohibited Countries?</label>
                    <select
                        value={local.operates_in_prohibited_countries}
                        onChange={(e) => setLocal({ ...local, operates_in_prohibited_countries: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Ownership Threshold</label>
                    <select
                        value={local.ownership_threshold}
                        onChange={(e) => setLocal({ ...local, ownership_threshold: parseInt(e.target.value) })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    >
                        {[5, 10, 15, 20, 25].map((t) => (
                            <option key={t} value={t}>
                                {t}%
                            </option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={local.has_material_intermediary_ownership}
                            onChange={(e) => setLocal({ ...local, has_material_intermediary_ownership: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 block text-sm text-gray-700">
                            This business has at least one intermediate legal entity owner with 25% or more ownership
                        </span>
                    </label>
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