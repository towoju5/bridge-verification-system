// BusinessCustomerForm.tsx
import React, { useState } from 'react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';

interface BusinessCustomerFormProps {
    onSubmit: (data: any) => void;
    isLoading?: boolean;
    countries: { code: string; name: string }[];
}

export default function BusinessCustomerForm({ onSubmit, countries }: BusinessCustomerFormProps) {
    /* ----------  STATE  ---------- */
    const [formData, setFormData] = useState<any>({
        type: 'business',
        business_legal_name: '',
        business_trade_name: '',
        business_description: '',
        email: '',
        business_type: '',
        primary_website: '',
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
        associated_persons: [] as any[],
        business_industry: '',
        account_purpose: '',
        account_purpose_other: '',
        source_of_funds: '',
        high_risk_activities: ['none_of_the_above'],
        high_risk_activities_explanation: '',
        estimated_annual_revenue_usd: '',
        expected_monthly_payments_usd: 0,
        conducts_money_services: false,
        conducts_money_services_description: '',
        compliance_screening_explanation: '',
        regulated_activity: {
            regulated_activities_description: '',
            primary_regulatory_authority_country: '',
            primary_regulatory_authority_name: '',
            license_number: '',
        },
        documents: [] as any[],
        identifying_information: [] as any[],
        is_dao: false,
        signed_agreement_id: '',
    });

    const [activeTab, setActiveTab] = useState('business-info');
    const [completed, setCompleted] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    /* ----------  HELPERS  ---------- */
    const businessTypes = ['cooperative', 'corporation', 'llc', 'other', 'partnership', 'sole_prop', 'trust'];
    const industryCodes = [
        { code: '541511', description: 'Custom Computer Programming Services' },
        { code: '541512', description: 'Computer Systems Design Services' },
        { code: '541519', description: 'Other Computer Related Services' },
    ];
    const accountPurposes = ['receive_payments_for_goods_and_services', 'charitable_donations', 'payroll', 'other'];
    const estimatedRevenueOptions = [
        'under_10000', '10000_to_99999', '100000_to_499999', '500000_to_999999',
        '1000000_to_4999999', '5000000_to_9999999', '10000000_to_24999999',
        '25000000_to_49999999', '50000000_to_99999999', '100000000_plus'
    ];
    const documentPurposes = [
        { value: 'business_formation', label: 'Business formation' },
        { value: 'ownership_information', label: 'Ownership information' },
        { value: 'proof_of_address', label: 'Proof of address' },
        { value: 'other', label: 'Other' },
    ];
    const idTypes = ['passport', 'drivers_license', 'national_id', 'other'];

    const steps = [
        { id: 'business-info', label: 'Business Information' },
        { id: 'addresses', label: 'Addresses' },
        { id: 'persons', label: 'Associated Persons' },
        { id: 'financial', label: 'Financial Information' },
        { id: 'regulatory', label: 'Regulatory' },
        { id: 'documents', label: 'Documents' },
        { id: 'identifying_information', label: Identity Information' },
    ];

    const handleStepComplete = (step: string) => {
        setCompleted(prev => ({ ...prev, [step]: true }));
    };

    const postStep = async (stepNum: number, payload: any) => {
        await axios.post(`/api/business-customer/step/${stepNum}`, payload);
    };

    /* ----------  VALIDATION  ---------- */
    const validate = (tab: string) => {
        const e: Record<string, string> = {};
        if (tab === 'business-info') {
            if (!formData.business_legal_name.trim()) e.business_legal_name = 'Required';
            if (!formData.business_trade_name.trim()) e.business_trade_name = 'Required';
            if (!formData.business_description.trim()) e.business_description = 'Required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Valid email required';
            if (!formData.business_type) e.business_type = 'Required';
            if (!formData.business_industry) e.business_industry = 'Required';
        }
        if (tab === 'addresses') {
            ['registered_address', 'physical_address'].forEach(addr => {
                if (!formData[addr].street_line_1.trim()) e[`${addr}.street_line_1`] = 'Required';
                if (!formData[addr].city.trim()) e[`${addr}.city`] = 'Required';
                if (!formData[addr].country.trim()) e[`${addr}.country`] = 'Required';
            });
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ----------  NAVBAR  ---------- */
    const NavBar = () => (
        <nav className="flex space-x-8 border-b">
            {steps.map((step, idx) => {
                const isCurrent = step.id === activeTab;
                const isDisabled = idx > 0 && !completed[steps[idx - 1].id];
                return (
                    <button
                        key={step.id}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setActiveTab(step.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${isCurrent ? 'border-indigo-500 text-indigo-600' : isDisabled ? 'border-transparent text-gray-300 cursor-not-allowed' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        {step.label}
                    </button>
                );
            })}
        </nav>
    );

    /* ----------  STEP COMPONENTS  ---------- */
    const BusinessInfo = () => {
        const next = async () => {
            if (!validate('business-info')) return;
            await postStep(1, formData);
            setFormData({ ...formData });
            handleStepComplete('business-info');
            setActiveTab('addresses');
        };
        return (
            <form onSubmit={e => { e.preventDefault(); next(); }} className="bg-white shadow sm:rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Business Information</h2>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Business Legal Name *</label>
                        <input value={formData.business_legal_name} onChange={e => setFormData({ ...formData, business_legal_name: e.target.value })} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_legal_name ? 'border-red-300' : 'border-gray-300'}`} />
                        {errors.business_legal_name && <p className="text-sm text-red-600">{errors.business_legal_name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Business Trade Name *</label>
                        <input value={formData.business_trade_name} onChange={e => setFormData({ ...formData, business_trade_name: e.target.value })} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_trade_name ? 'border-red-300' : 'border-gray-300'}`} />
                        {errors.business_trade_name && <p className="text-sm text-red-600">{errors.business_trade_name}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Business Description *</label>
                        <textarea rows={3} value={formData.business_description} onChange={e => setFormData({ ...formData, business_description: e.target.value })} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_description ? 'border-red-300' : 'border-gray-300'}`} />
                        {errors.business_description && <p className="text-sm text-red-600">{errors.business_description}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Business Email *</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.email ? 'border-red-300' : 'border-gray-300'}`} />
                        {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Business Type *</label>
                        <select value={formData.business_type} onChange={e => setFormData({ ...formData, business_type: e.target.value })} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_type ? 'border-red-300' : 'border-gray-300'}`}>
                            <option value="">Select business type</option>
                            {businessTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                        </select>
                        {errors.business_type && <p className="text-sm text-red-600">{errors.business_type}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Business Industry *</label>
                        <select value={formData.business_industry} onChange={e => setFormData({ ...formData, business_industry: e.target.value })} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.business_industry ? 'border-red-300' : 'border-gray-300'}`}>
                            {industryCodes.map(i => <option key={i.code} value={i.code}>{i.description}</option>)}
                        </select>
                        {errors.business_industry && <p className="text-sm text-red-600">{errors.business_industry}</p>}
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Next</button>
                </div>
            </form>
        );
    };

    const Address = () => {
        const next = async () => {
            if (!validate('addresses')) return;
            await postStep(2, { registered_address: formData.registered_address, physical_address: formData.physical_address });
            handleStepComplete('addresses');
            setActiveTab('persons');
        };
        const change = (type: any, field: string, val: string) =>
            setFormData({ ...formData, [type]: { ...formData[type], [field]: val } });

        return (
            <form onSubmit={e => { e.preventDefault(); next(); }} className="bg-white shadow sm:rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Addresses</h2>
                {['registered_address', 'physical_address'].map(addr => (
                    <div key={addr} className="mb-6">
                        <h3 className="text-md font-medium text-gray-900 mb-2">{addr === 'registered_address' ? 'Registered Address' : 'Physical Address'} *</h3>
                        <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label>Street Line 1 *</label>
                                <input value={formData[addr].street_line_1} onChange={e => change(addr, 'street_line_1', e.target.value)} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors[`${addr}.street_line_1`] ? 'border-red-300' : 'border-gray-300'}`} />
                                {errors[`${addr}.street_line_1`] && <p className="text-sm text-red-600">{errors[`${addr}.street_line_1`]}</p>}
                            </div>
                            <div>
                                <label>City *</label>
                                <input value={formData[addr].city} onChange={e => change(addr, 'city', e.target.value)} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors[`${addr}.city`] ? 'border-red-300' : 'border-gray-300'}`} />
                                {errors[`${addr}.city`] && <p className="text-sm text-red-600">{errors[`${addr}.city`]}</p>}
                            </div>
                            <div>
                                <label>Country *</label>
                                <select value={formData[addr].country} onChange={e => change(addr, 'country', e.target.value)} className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors[`${addr}.country`] ? 'border-red-300' : 'border-gray-300'}`}>
                                    <option value="">Select country</option>
                                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                                {errors[`${addr}.country`] && <p className="text-sm text-red-600">{errors[`${addr}.country`]}</p>}
                            </div>
                        </div>
                    </div>
                ))}
                <div className="mt-6 flex justify-end">
                    <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Next</button>
                </div>
            </form>
        );
    };

    const AssociatedPersons = () => {
        const blank = () => ({
            first_name: '', last_name: '', birth_date: '', email: '',
            residential_address: { street_line_1: '', city: '', country: '' },
            has_ownership: false, has_control: false, is_signer: false, is_director: false,
        });
        const add = () => setFormData({ ...formData, associated_persons: [...formData.associated_persons, blank()] });
        const remove = (idx: number) => setFormData({ ...formData, associated_persons: formData.associated_persons.filter((_: any, i: number) => i !== idx) });
        const update = (idx: number, field: string, val: any) => {
            const list = [...formData.associated_persons];
            if (field.startsWith('residential_address.')) {
                const [, sub] = field.split('.');
                list[idx].residential_address[sub] = val;
            } else {
                list[idx][field] = val;
            }
            setFormData({ ...formData, associated_persons: list });
        };
        const next = async () => {
            await postStep(3, { associated_persons: formData.associated_persons });
            handleStepComplete('persons');
            setActiveTab('financial');
        };
        return (
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Associated Persons</h2>
                    <button type="button" onClick={add} className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Add Person</button>
                </div>
                {formData.associated_persons.map((p: any, idx: number) => (
                    <div key={idx} className="mb-6 p-4 border border-gray-200 rounded-md">
                        <h3 className="text-md font-medium text-gray-900 mb-2">Person {idx + 1}</h3>
                        <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                            <input placeholder="First Name" value={p.first_name} onChange={e => update(idx, 'first_name', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            <input placeholder="Last Name" value={p.last_name} onChange={e => update(idx, 'last_name', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            <input placeholder="Email" value={p.email} onChange={e => update(idx, 'email', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            <input placeholder="Street 1" value={p.residential_address.street_line_1} onChange={e => update(idx, 'residential_address.street_line_1', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            <input placeholder="City" value={p.residential_address.city} onChange={e => update(idx, 'residential_address.city', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            <input placeholder="Country" value={p.residential_address.country} onChange={e => update(idx, 'residential_address.country', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <button type="button" onClick={() => remove(idx)} className="text-red-600 hover:text-red-800 text-sm mt-2">Remove</button>
                    </div>
                ))}
                <div className="mt-6 flex justify-end">
                    <button onClick={next} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Next</button>
                </div>
            </div>
        );
    };

    const Financial = () => {
        const next = async () => {
            await postStep(4, formData);
            handleStepComplete('financial');
            setActiveTab('regulatory');
        };
        return (
            <form onSubmit={e => { e.preventDefault(); next(); }} className="bg-white shadow sm:rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Information</h2>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                        <label>Account Purpose *</label>
                        <select value={formData.account_purpose} onChange={e => setFormData({ ...formData, account_purpose: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                            <option value="">Select purpose</option>
                            {accountPurposes.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Source of Funds *</label>
                        <select value={formData.source_of_funds} onChange={e => setFormData({ ...formData, source_of_funds: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                            <option value="">Select source</option>
                            {['business_loans', 'owners_capital', 'sales_of_goods_and_services', 'other'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Estimated Annual Revenue (USD)</label>
                        <select value={formData.estimated_annual_revenue_usd} onChange={e => setFormData({ ...formData, estimated_annual_revenue_usd: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                            <option value="">Select range</option>
                            {estimatedRevenueOptions.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Next</button>
                </div>
            </form>
        );
    };

    const Regulatory = () => {
        const next = async () => {
            await postStep(5, { regulated_activity: formData.regulated_activity });
            handleStepComplete('regulatory');
            setActiveTab('documents');
        };
        return (
            <form onSubmit={e => { e.preventDefault(); next(); }} className="bg-white shadow sm:rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Regulatory Information</h2>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label>Regulated Activities Description</label>
                        <textarea rows={3} value={formData.regulated_activity.regulated_activities_description} onChange={e => setFormData({ ...formData, regulated_activity: { ...formData.regulated_activity, regulated_activities_description: e.target.value } })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label>License Number</label>
                        <input value={formData.regulated_activity.license_number} onChange={e => setFormData({ ...formData, regulated_activity: { ...formData.regulated_activity, license_number: e.target.value } })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Next</button>
                </div>
            </form>
        );
    };

    const Documents = () => {
        const add = () => setFormData({ ...formData, documents: [...formData.documents, { purposes: [], file: '', description: '' }] });
        const remove = (idx: number) => setFormData({ ...formData, documents: formData.documents.filter((_: any, i: number) => i !== idx) });
        const update = (idx: number, field: string, val: any) => {
            const list = [...formData.documents];
            list[idx][field] = val;
            setFormData({ ...formData, documents: list });
        };
        const next = async () => {
            await postStep(6, { documents: formData.documents });
            handleStepComplete('documents');
            setActiveTab('identifying_information');
        };
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Documents</h2>
                    <button onClick={add} className="px-4 py-2 bg-blue-600 text-white rounded">Add Document</button>
                </div>
                {formData.documents.map((doc: any, idx: number) => (
                    <div key={idx} className="mb-4 border p-4 rounded bg-gray-50 relative">
                        <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-red-500">Remove</button>
                        <label className="block text-sm font-medium mb-1">Purposes</label>
                        <select multiple value={doc.purposes} onChange={e => update(idx, 'purposes', Array.from(e.target.selectedOptions, o => o.value))} className="w-full border rounded p-2">
                            {documentPurposes.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        <label className="block mt-2 text-sm font-medium">File</label>
                        <input type="file" onChange={e => update(idx, 'file', e.target.files?.[0]?.name || '')} className="w-full border rounded p-2" />
                        <label className="block mt-2 text-sm font-medium">Description</label>
                        <input value={doc.description} onChange={e => update(idx, 'description', e.target.value)} className="w-full border rounded p-2" />
                    </div>
                ))}
                <div className="mt-6 flex justify-end">
                    <button onClick={next} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Next</button>
                </div>
            </div>
        );
    };

    const Identity = () => {
        const add = () => setFormData({ ...formData, identifying_information: [...formData.identifying_information, { type: '', issuing_country: '', number: '', description: '', expiration: '', image_front: '', image_back: '' }] });
        const remove = (idx: number) => setFormData({ ...formData, identifying_information: formData.identifying_information.filter((_: any, i: number) => i !== idx) });
        const change = (idx: number, field: string, val: string) => {
            const list = [...formData.identifying_information];
            list[idx][field] = val;
            setFormData({ ...formData, identifying_information: list });
        };
        const finish = async () => {
            await postStep(7, { identifying_information: formData.identifying_information });
            handleStepComplete('identifying_information');
            onSubmit(formData);
        };
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-bold mb-2">Identifying Information</h2>
                {formData.identifying_information.map((info: any, idx: number) => (
                    <div key={idx} className="mb-4 border p-4 rounded bg-gray-50 relative">
                        <button onClick={() => remove(idx)} className="absolute top-2 right-2 text-red-500">Remove</button>
                        <label>ID Type</label>
                        <select value={info.type} onChange={e => change(idx, 'type', e.target.value)} className="w-full border rounded p-2">
                            <option value="">Select type</option>
                            {idTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                        </select>
                        <label className="block mt-2">Issuing Country</label>
                        <input value={info.issuing_country} onChange={e => change(idx, 'issuing_country', e.target.value)} className="w-full border rounded p-2" />
                        <label className="block mt-2">Number</label>
                        <input value={info.number} onChange={e => change(idx, 'number', e.target.value)} className="w-full border rounded p-2" />
                        <label className="block mt-2">Expiration</label>
                        <input type="date" value={info.expiration} onChange={e => change(idx, 'expiration', e.target.value)} className="w-full border rounded p-2" />
                    </div>
                ))}
                <button onClick={add} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded">Add ID</button>
                <div className="mt-6 flex justify-end">
                    <button onClick={finish} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">Finish & Submit</button>
                </div>
            </div>
        );
    };

    /* ----------  RENDER  ---------- */
    return (
        <AppLayout title="Business Account Registration">
            <Head title="Business Account Registration" />
            <div className="max-w-6xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-6">Business Customer Creation</h1>
                <NavBar />
                <div className="mt-6">
                    {activeTab === 'business-info' && <BusinessInfo />}
                    {activeTab === 'addresses' && <Address />}
                    {activeTab === 'persons' && <AssociatedPersons />}
                    {activeTab === 'financial' && <Financial />}
                    {activeTab === 'regulatory' && <Regulatory />}
                    {activeTab === 'documents' && <Documents />}
                    {activeTab === 'identifying_information' && <Identity />}
                </div>
            </div>
        </AppLayout>
    );
}