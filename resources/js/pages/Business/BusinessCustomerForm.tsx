// BusinessCustomerForm.tsx
import React, { useState } from 'react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';

/* ----------  import existing step components  ---------- */
import BusinessInfo from './components/BusinessInfo';
import Address from './components/Address';
import AssociatedPersons from './components/AssociatedPersons';
import FinancialInformation from './components/FinancialInformation';
import Regulatory from './components/Regulatory';
import DocumentsTab from './components/DocumentsTab';
import IdentifyingInfoTab from './components/IdentifyingInfoTab';
import ReviewStep from './components/ReviewStep';

/* ----------  types  ---------- */
interface Country { code: string; name: string }

interface Props {
    onSubmit: (data: any) => void;
    countries?: Country[];
}

/* ----------  constants  ---------- */
const businessTypes = ['cooperative', 'corporation', 'llc', 'partnership', 'sole_prop', 'trust', 'other'];
const industryCodes = [
    { code: '541511', description: 'Custom Computer Programming Services' },
    { code: '541512', description: 'Computer Systems Design Services' },
    { code: '541519', description: 'Other Computer Related Services' },
];
const accountPurposes = ['receive_payments_for_goods_and_services', 'charitable_donations', 'payroll', 'other'];
const estimatedRevenueOptions = ['under_10000', '10000_to_99999', '100000_to_499999', '500000_to_999999', '1000000_to_4999999', '5000000_to_9999999', '10000000_plus'];
const documentPurposes = [
    { value: 'business_formation', label: 'Business formation' },
    { value: 'ownership_information', label: 'Ownership information' },
    { value: 'proof_of_address', label: 'Proof of address' },
    { value: 'other', label: 'Other' },
];
const idTypes = ['passport', 'drivers_license', 'national_id', 'other'];

const steps = [
    { id: 'business-info', label: 'Business Information', component: BusinessInfo },
    { id: 'addresses', label: 'Addresses', component: Address },
    { id: 'persons', label: 'Associated Persons', component: AssociatedPersons },
    { id: 'financial', label: 'Financial Information', component: FinancialInformation },
    { id: 'regulatory', label: 'Regulatory', component: Regulatory },
    { id: 'documents', label: 'Documents', component: DocumentsTab },
    { id: 'identifying_information', label: 'Identity Information', component: IdentifyingInfoTab },
    { id: 'review', label: 'Review', component: ReviewStep },
];

/* ----------  main form  ---------- */
export default function BusinessCustomerForm({ onSubmit, countries = [] }: Props) {
    const [formData, setFormData] = useState<any>({
        type: 'business',
        business_legal_name: '',
        business_trade_name: '',
        business_description: '',
        email: '',
        business_type: '',
        primary_website: '',
        registered_address: {},
        physical_address: {},
        associated_persons: [],
        business_industry: '',
        account_purpose: '',
        source_of_funds: '',
        high_risk_activities: ['none_of_the_above'],
        regulated_activity: {},
        documents: [],
        identifying_information: [],
        is_dao: false,
    });

    const [activeTab, setActiveTab] = useState('business-info');
    const [completed, setCompleted] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);

    /* ----------  helpers  ---------- */
    const handleStepComplete = (stepId: string) => setCompleted(prev => ({ ...prev, [stepId]: true }));
    const postStep = async (stepNum: number, payload: any) => {
        setSaving(true);
        await axios.post(`/api/business-customer/step/${stepNum}`, payload);
        setSaving(false);
    };

    const next = async (stepNum: number, nextTab: string) => {
        await postStep(stepNum, formData);
        handleStepComplete(activeTab);
        setActiveTab(nextTab);
    };

    /* ----------  nav bar  ---------- */
    const NavBar = () => (
        <nav className="flex space-x-8 border-b">
            {steps.map((step, idx) => {
                const isCurrent = step.id === activeTab;
                const isDisabled = idx > 0 && !completed[steps[idx - 1].id];
                return (
                    <button
                        key={step.id}
                        type="button"
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

    /* ----------  render  ---------- */
    const CurrentStep = steps.find(s => s.id === activeTab)?.component;
    if (!CurrentStep) return null;

    const props = {
        formData,
        setFormData,
        setActiveTab,          // ✅ required by step components
        countries: countries || [], // ✅ never undefined
        businessTypes,
        industryCodes,
        accountPurposes,
        estimatedRevenueOptions,
        documentPurposes,
        idTypes,
    };
    

    return (
        <AppLayout title="Business Account Registration">
            <Head title="Business Account Registration" />
            <div className="max-w-6xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-6">Business Customer Creation</h1>

                <NavBar />

                <form
                    onSubmit={(e) => e.preventDefault()}
                    className="mt-6 space-y-6"
                >
                    <CurrentStep {...props} />

                    <div className="flex justify-end">
                        
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}