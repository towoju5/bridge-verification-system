import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';

// --- TypeScript Interfaces ---
interface Occupation {
    occupation: string;
    code: string;
}

interface Country {
    code: string;
    name: string;
}

interface StepProps {
    data: any;
    addArrayItem?: (field: string) => void;
    removeArrayItem?: (field: string, index: number) => void;
    onArrayChange?: (field: string, value: any[]) => void;
    setFormData?: React.Dispatch<React.SetStateAction<any>>;
}

interface IdentificationType {
    type: string;
    description: string;
}

interface InitialData {
    occupations: Occupation[];
    accountPurposes: string[];
    sourceOfFunds: string[];
    countries: Country[];
    identificationTypesByCountry: Record<string, IdentificationType[]>;
}

interface UploadedDocument {
    id?: number;
    type: string;
    file: File | null;
    fileName: string;
    url?: string | null;
}

interface CustomerData {
    id: number;
    uuid: string;
    type: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    last_name_native: string | null;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    birth_date: string | null;
    signed_agreement_id: string;
    residential_address: {
        street_line_1?: string | null;
        street_line_2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
        proof_of_address_file?: File | null;
        proof_of_address_url?: string | null;
    } | null;
    transliterated_residential_address: any | null;
    employment_status: string | null;
    most_recent_occupation_code: string | null;
    expected_monthly_payments_usd: string | null;
    source_of_funds: string | null;
    account_purpose: string | null;
    account_purpose_other: string | null;
    acting_as_intermediary: boolean | null;
    endorsements: string[] | null;
    identifying_information: {
        type: string;
        issuing_country: string;
        number?: string | null;
        description?: string | null;
        image_front?: string | null;
        image_back?: string | null;
        expiration_date?: string | null;
        image_front_file?: File | null;
        image_back_file?: File | null;
    }[] | null;
    bridge_customer_id: string | null;
    status: string;
    bridge_response: any | null;
    created_at: string;
    updated_at: string;
    uploaded_documents: {
        file?: File | null;
        type: string;
    }[] | null;
}

// Select options
const monthlyOptions = [
    { value: '0_4999', label: '$0 – $4,999' },
    { value: '5000_9999', label: '$5,000 – $9,999' },
    { value: '10000_49999', label: '$10,000 – $49,999' },
    { value: '50000_plus', label: '$50,000+' }
];

const employmentStatusOptions = [
    { value: 'employed', label: 'Employed' },
    { value: 'homemaker', label: 'Homemaker' },
    { value: 'retired', label: 'Retired' },
    { value: 'self_employed', label: 'Self Employed' },
    { value: 'student', label: 'Student' },
    { value: 'unemployed', label: 'Unemployed' },
];

const documentTypes = [
    { value: "aml_audit", label: "AML Audit" },
    { value: "aml_comfort_letter", label: "AML Comfort Letter" },
    { value: "aml_policy", label: "AML Policy" },
    { value: "business_formation", label: "Business Formation" },
    { value: "court_order", label: "Court Order" },
    { value: "directors_registry", label: "Directors Register" },
    { value: "e_signature_certificate", label: "eSignature Certificate" },
    { value: "evidence_of_good_standing", label: "Evidence of Good Standing" },
    { value: "flow_of_funds", label: "Flow of Funds" },
    { value: "marketing_materials", label: "Marketing Materials" },
    { value: "ownership_information", label: "Ownership Information" },
    { value: "ownership_chart", label: "Ownership Chart" },
    { value: "power_of_attorney", label: "Power of Attorney" },
    { value: "proof_of_account_purpose", label: "Proof of Account Purpose" },
    { value: "proof_of_address", label: "Proof of Address" },
    { value: "proof_of_bank_account_ownership", label: "Proof of Bank Account Ownership" },
    { value: "proof_of_entity_name_change", label: "Proof of Entity Name Change" },
    { value: "proof_of_funds", label: "Proof of Funds" },
    { value: "proof_of_individual_name_change", label: "Proof of Individual Name Change" },
    { value: "proof_of_nature_of_business", label: "Proof of Nature of Business" },
    { value: "proof_of_relationship", label: "Proof of Relationship" },
    { value: "proof_of_signatory_authority", label: "Proof of Signatory Authority" },
    { value: "proof_of_source_of_funds", label: "Proof of Source of Funds" },
    { value: "proof_of_source_of_wealth", label: "Proof of Source of Wealth" },
    { value: "proof_of_tax_identification", label: "Proof of Tax Identification Number" },
    { value: "registered_exemption", label: "Proof of Registered Exemption" },
    { value: "regulatory_license_registration", label: "Proof of Regulatory License Registration" },
    { value: "shareholder_register", label: "Shareholder Register" },
    { value: "tax_returns", label: "Tax Returns" },
    { value: "other", label: "Other" },
];

interface Props {
    initialData: InitialData;
    currentStep: number;
    maxSteps: number;
    customerData: CustomerData;
    submissionId: number;
}

interface StepProps {
    data: CustomerData;
    onDataChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onNestedChange?: (parentName: string, fieldName: string, value: string | boolean) => void;
    onArrayChange?: (arrayName: string, index: number, fieldName: string, value: string) => void;
    addArrayItem?: (arrayName: string) => void;
    removeArrayItem?: (arrayName: string, index: number) => void;
    countries?: Country[];
    idTypesByCountry?: Record<string, IdentificationType[]>;
    occupations?: Occupation[];
    accountPurposes?: string[];
    sourceOfFunds?: string[];
}

export default function Verify({ initialData, currentStep, maxSteps, customerData, submissionId }: Props) {
    const [step, setStep] = useState(currentStep);
    const [formData, setFormData] = useState<CustomerData>(customerData);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });

    useEffect(() => {
        setFormData(customerData);
    }, [customerData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({
            ...prev,
            [name]: val
        }));
    };

    const handleNestedChange = (parentName: string, fieldName: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [parentName]: {
                ...prev[parentName as keyof CustomerData],
                [fieldName]: value
            }
        }));
    };

    const handleArrayChange = (arrayName: string, index: number, fieldName: string, value: string) => {
        setFormData(prev => {
            const newArray = [...(prev[arrayName as keyof CustomerData] as any[] || [])];
            newArray[index] = { ...newArray[index], [fieldName]: value };
            return {
                ...prev,
                [arrayName]: newArray
            };
        });
    };


    const addArrayItem = (arrayName: string) => {
        setFormData(prev => ({
            ...prev,
            [arrayName]: [...(prev[arrayName as keyof CustomerData] as any[] || []), {}]
        }));
    };

    const removeArrayItem = (arrayName: string, index: number) => {
        setFormData(prev => {
            const newArray = [...(prev[arrayName as keyof CustomerData] as any[] || [])];
            newArray.splice(index, 1);
            return {
                ...prev,
                [arrayName]: newArray
            };
        });
    };

    const saveStep = async (nextStep?: number) => {
        setSaving(true);
        setSaveStatus({ message: '', type: '' });

        const formDataToSend = new FormData();

        // const appendData = (obj: any, parentKey = '') => {
        //     if (obj === null || obj === undefined) return;
        //     if (typeof obj === 'object' && !(obj instanceof File)) {
        //         Object.keys(obj).forEach(key => {
        //             const val = obj[key];
        //             if (val instanceof File) {
        //                 formDataToSend.append(`${parentKey}${key}`, val);
        //             } else if (typeof val === 'object') {
        //                 appendData(val, `${parentKey}${key}.`);
        //             } else {
        //                 formDataToSend.append(`${parentKey}${key}`, String(val));
        //             }
        //         });
        //     } else {
        //         formDataToSend.append(parentKey, obj);
        //     }
        // };
        const appendData = (obj: any, parentKey = '') => {
            if (obj === null || obj === undefined) return;

            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    // use bracket syntax for arrays
                    appendData(item, `${parentKey}[${index}]`);
                });
            } else if (typeof obj === 'object' && !(obj instanceof File)) {
                Object.entries(obj).forEach(([key, val]) => {
                    appendData(val, parentKey ? `${parentKey}[${key}]` : key);
                });
            } else {
                formDataToSend.append(parentKey, obj);
            }
        };


        appendData(formData);

        try {
            const response = await axios.post(route('customer.verify.step.save', { step }), formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                setSaveStatus({ message: response.data.message, type: 'success' });
                if (response.data.redirect_url) {
                    window.location.href = response.data.redirect_url;
                }
                if (response.data.customer_data) {
                    setFormData(response.data.customer_data);
                }
                if (nextStep) {
                    router.visit(route('customer.verify.step', { step: nextStep }));
                }
            } else {
                setSaveStatus({ message: response.data.debug || 'Failed to save.', type: 'error' });
            }
        } catch (error: any) {
            console.error('Save error:', error);
            const errorMsg = error.response?.data?.debug || 'An error occurred while saving.';
            setSaveStatus({ message: errorMsg, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleNext = async () => {
        await saveStep(step + 1);
    };

    const handlePrevious = () => {
        if (step > 1) {
            router.visit(route('customer.verify.step', { step: step - 1 }));
        }
    };

    const goToStep = async (targetStep: number) => {
        if (targetStep < step) {
            router.visit(route('customer.verify.step', { step: targetStep }));
        } else if (targetStep > step) {
            await saveStep();
            router.visit(route('customer.verify.step', { step: targetStep }));
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1: return <PersonalInfoStep data={formData} onDataChange={handleInputChange} countries={initialData.countries} />;
            case 2: return <AddressStep data={formData} onDataChange={handleInputChange} onNestedChange={handleNestedChange} countries={initialData.countries} />;
            case 3: return <IdentificationStep data={formData} onDataChange={handleInputChange} onArrayChange={handleArrayChange} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} countries={initialData.countries} idTypesByCountry={initialData.identificationTypesByCountry} />;
            case 4: return <EmploymentFinancesStep data={formData} onDataChange={handleInputChange} occupations={initialData.occupations} accountPurposes={initialData.accountPurposes} sourceOfFunds={initialData.sourceOfFunds} />;
            case 5: return <DocumentsUploadStep data={formData} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} onArrayChange={handleArrayChange} />;
            case 6: return <ReviewStep data={formData} initialData={initialData} />;
            default: return <div>Invalid step</div>;
        }
    };

    return (
        <AppLayout title={`Customer Verification - Step ${step}`}>
            <Head title={`Customer Verification - Step ${step}`} />
            <div className="bg-gray-100 dark:bg-gray-800 flex items-center justify-center py-10">
                <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">
                        Customer Verification
                    </h2>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between mb-2">
                            {[...Array(maxSteps)].map((_, i) => {
                                const stepNumber = i + 1;
                                const isCompleted = stepNumber < step;
                                const isCurrent = stepNumber === step;
                                return (
                                    <div key={stepNumber} className="flex flex-col items-center flex-1">
                                        <button
                                            onClick={() => goToStep(stepNumber)}
                                            disabled={stepNumber > step}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium focus:outline-none ${isCompleted
                                                    ? 'bg-green-500 text-white'
                                                    : isCurrent
                                                        ? 'bg-blue-600 text-white border-2 border-blue-600'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600'
                                                } ${stepNumber > step ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                        >
                                            {stepNumber}
                                        </button>
                                        <span
                                            className={`mt-2 hidden lg:block text-xs ${isCurrent
                                                    ? 'font-semibold text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-500 dark:text-gray-400'
                                                }`}
                                        >
                                            {stepNumber === 1 && 'Personal'}
                                            {stepNumber === 2 && 'Address'}
                                            {stepNumber === 3 && 'ID'}
                                            {stepNumber === 4 && 'Employment'}
                                            {stepNumber === 5 && 'Documents'}
                                            {stepNumber === 6 && 'Review'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${(step / maxSteps) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {saveStatus.message && (
                        <div
                            className={`mb-4 p-3 rounded ${saveStatus.type === 'success'
                                    ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200'
                                    : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                                }`}
                        >
                            {saveStatus.message}
                        </div>
                    )}

                    <form>{renderStep()}</form>

                    <div className="flex items-center justify-between mt-8">
                        <button
                            type="button"
                            onClick={handlePrevious}
                            disabled={step === 1 || saving}
                            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm ${step === 1 || saving
                                    ? 'text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                    : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                }`}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={step === maxSteps ? () => saveStep() : handleNext}
                            disabled={saving}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {saving ? 'Saving...' : step === maxSteps ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>

        </AppLayout>
    );
}

// --- Step Components ---

const PersonalInfoStep: React.FC<StepProps> = ({ data, onDataChange, countries }) => (
    <div>
        <h3 className="text-xl font-semibold mb-4">Step 1: Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-white">First Name</label>
                <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={data.first_name || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="middle_name" className="block text-sm font-medium text-gray-700 dark:text-white">Middle Name</label>
                <input
                    type="text"
                    id="middle_name"
                    name="middle_name"
                    value={data.middle_name || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-white">Last Name</label>
                <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={data.last_name || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="last_name_native" className="block text-sm font-medium text-gray-700 dark:text-white">Last Name (Native)</label>
                <input
                    type="text"
                    id="last_name_native"
                    name="last_name_native"
                    value={data.last_name_native || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Required if Last Name contains non-Latin characters.</p>
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white">Email Address</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={data.email || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-white">Phone Number</label>
                <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={data.phone || ''}
                    onChange={onDataChange}
                    placeholder="+12223334444"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 dark:text-white">Date of Birth</label>
                <input
                    type="date"
                    id="birth_date"
                    name="birth_date"
                    value={data.birth_date || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 dark:text-white">Nationality</label>
                <select
                    id="nationality"
                    name="nationality"
                    value={data.nationality || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Select Nationality</option>
                    {countries?.map(country => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                </select>
            </div>
        </div>
    </div>
);

const AddressStep: React.FC<StepProps> = ({ data, onDataChange, onNestedChange, countries = [] }) => {
    const address = data.residential_address || {};
    const handleAddressChange = (field: string, value: string | File | null) => {
        if (onNestedChange) onNestedChange('residential_address', field, value);
    };

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Step 2: Residential Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label htmlFor="street_line_1" className="block text-sm font-medium text-gray-700 dark:text-white">Street Line 1</label>
                    <input
                        type="text"
                        id="street_line_1"
                        value={address.street_line_1 || ''}
                        onChange={(e) => handleAddressChange('street_line_1', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="street_line_2" className="block text-sm font-medium text-gray-700 dark:text-white">Street Line 2</label>
                    <input
                        type="text"
                        id="street_line_2"
                        value={address.street_line_2 || ''}
                        onChange={(e) => handleAddressChange('street_line_2', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-white">City</label>
                    <input
                        type="text"
                        id="city"
                        value={address.city || ''}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-white">State/Province</label>
                    <input
                        type="text"
                        id="state"
                        value={address.state || ''}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 dark:text-white">Postal Code</label>
                    <input
                        type="text"
                        id="postal_code"
                        value={address.postal_code || ''}
                        onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-white">Country</label>
                    <select
                        id="country"
                        value={address.country || ''}
                        onChange={(e) => handleAddressChange('country', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">Select a country</option>
                        {countries.map(country => (
                            <option key={country.code} value={country.code}>{country.name}</option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="proof_of_address" className="block text-sm font-medium text-gray-700 dark:text-white">Proof of Address</label>
                    <input
                        type="file"
                        accept=".pdf,.jpeg,.jpg,.png,.heic,.tif"
                        onChange={(e) => handleAddressChange('proof_of_address_file', e.target.files?.[0] || null)}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {address.proof_of_address_url && !address.proof_of_address_file && (
                        <a href={address.proof_of_address_url} target="_blank" className="text-blue-600 text-sm mt-1 block">View current proof</a>
                    )}
                    {address.proof_of_address_file && (
                        <p className="text-sm text-green-600 mt-1">✓ {address.proof_of_address_file.name} selected</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const IdentificationStep: React.FC<StepProps> = ({ data, onArrayChange, addArrayItem, removeArrayItem, countries = [], idTypesByCountry = {} }) => {
    const docs = data.identifying_information || [];

    const handleDocChange = (index: number, field: string, value: string | File | null) => {
        if (onArrayChange) onArrayChange('identifying_information', index, field, value as string);
    };

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Step 3: Identification Documents</h3>
            {docs.map((doc, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-medium">Document {index + 1}</h4>
                        <button
                            type="button"
                            onClick={() => removeArrayItem && removeArrayItem('identifying_information', index)}
                            className="text-red-600 hover:text-red-800"
                        >
                            Remove
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white">Issuing Country</label>
                            <select
                                value={doc?.issuing_country || ''}
                                onChange={(e) => handleDocChange(index, 'issuing_country', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="">Select country</option>
                                {countries.map(country => (
                                    <option key={country.code} value={country.code}>{country.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white">Document Type</label>
                            <select
                                value={doc?.type || ''}
                                onChange={(e) => handleDocChange(index, 'type', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="">Select type</option>
                                {(idTypesByCountry[doc?.issuing_country?.toUpperCase() || ''] || idTypesByCountry['USA'] || []).map(type => (
                                    <option key={type.type} value={type.type}>{type.description}</option>
                                ))}
                                {!idTypesByCountry[doc?.issuing_country?.toUpperCase() || ''] && !idTypesByCountry['USA'] && (
                                    <option value="other">Other</option>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white">Document Number</label>
                            <input
                                type="text"
                                value={doc?.number || ''}
                                onChange={(e) => handleDocChange(index, 'number', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        {(doc?.type === 'other' || !doc?.type) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-white">Description</label>
                                <input
                                    type="text"
                                    value={doc?.description || ''}
                                    onChange={(e) => handleDocChange(index, 'description', e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white">Expiration Date</label>
                            <input
                                type="date"
                                value={doc?.expiration_date || ''}
                                onChange={(e) => handleDocChange(index, 'expiration_date', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white">Front of Document</label>
                            <input
                                type="file"
                                accept=".pdf,.jpeg,.jpg,.png,.heic,.tif"
                                onChange={(e) => handleDocChange(index, 'image_front_file', e.target.files?.[0] || null)}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {doc.image_front && !doc.image_front_file && (
                                <a href={doc.image_front} target="_blank" className="text-blue-600 text-sm mt-1 block">View front</a>
                            )}
                            {doc.image_front_file && (
                                <p className="text-sm text-green-600 mt-1">✓ {doc.image_front_file.name} selected</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white">Back of Document</label>
                            <input
                                type="file"
                                accept=".pdf,.jpeg,.jpg,.png,.heic,.tif"
                                onChange={(e) => handleDocChange(index, 'image_back_file', e.target.files?.[0] || null)}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {doc.image_back && !doc.image_back_file && (
                                <a href={doc.image_back} target="_blank" className="text-blue-600 text-sm mt-1 block">View back</a>
                            )}
                            {doc.image_back_file && (
                                <p className="text-sm text-green-600 mt-1">✓ {doc.image_back_file.name} selected</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={() => addArrayItem && addArrayItem('identifying_information')}
                className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                + Add Document
            </button>
        </div>
    );
};

const EmploymentFinancesStep: React.FC<StepProps> = ({ data, onDataChange, occupations = [], accountPurposes = [], sourceOfFunds = [] }) => (
    <div>
        <h3 className="text-xl font-semibold mb-4">Step 4: Employment & Finances</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="employment_status" className="block text-sm font-medium text-gray-700 dark:text-white">Employment Status</label>
                <select
                    id="employment_status"
                    name="employment_status"
                    value={data.employment_status || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Select status</option>
                    {employmentStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="most_recent_occupation_code" className="block text-sm font-medium text-gray-700 dark:text-white">Most Recent Occupation</label>
                <select
                    id="most_recent_occupation_code"
                    name="most_recent_occupation_code"
                    value={data.most_recent_occupation_code || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Select an occupation</option>
                    {occupations.map(occ => (
                        <option key={occ.code} value={occ.code}>{occ.occupation}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="expected_monthly_payments_usd" className="block text-sm font-medium text-gray-700 dark:text-white">
                    Expected Monthly Payments (USD)
                </label>
                <select
                    id="expected_monthly_payments_usd"
                    name="expected_monthly_payments_usd"
                    value={data.expected_monthly_payments_usd || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Select range</option>
                    {monthlyOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="source_of_funds" className="block text-sm font-medium text-gray-700 dark:text-white">Source of Funds</label>
                <select
                    id="source_of_funds"
                    name="source_of_funds"
                    value={data.source_of_funds || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Select source</option>
                    {sourceOfFunds.map(source => (
                        <option key={source} value={source}>{source.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="account_purpose" className="block text-sm font-medium text-gray-700 dark:text-white">Account Purpose</label>
                <select
                    id="account_purpose"
                    name="account_purpose"
                    value={data.account_purpose || ''}
                    onChange={onDataChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                    <option value="">Select purpose</option>
                    {accountPurposes.map(purpose => (
                        <option key={purpose} value={purpose}>{purpose.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>
            {data.account_purpose === 'other' && (
                <div>
                    <label htmlFor="account_purpose_other" className="block text-sm font-medium text-gray-700 dark:text-white">Account Purpose (Other)</label>
                    <input
                        type="text"
                        id="account_purpose_other"
                        name="account_purpose_other"
                        value={data.account_purpose_other || ''}
                        onChange={onDataChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            )}
            <div className="flex items-center pt-4">
                <input
                    id="acting_as_intermediary"
                    name="acting_as_intermediary"
                    type="checkbox"
                    checked={!!data.acting_as_intermediary}
                    onChange={(e) => onDataChange({ ...e, target: { ...e.target, name: 'acting_as_intermediary', type: 'checkbox' } })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="acting_as_intermediary" className="ml-2 block text-sm text-gray-900">
                    Acting as intermediary?
                </label>
            </div>
        </div>
    </div>
);

const DocumentsUploadStep: React.FC<StepProps> = ({ data, addArrayItem, removeArrayItem, onArrayChange }) => {
    const docs = data.uploaded_documents || [];

    const handleDocChange = (index: number, field: string, value: string | File) => {
        if (onArrayChange) {
            onArrayChange('uploaded_documents', index, field, value);
        }
    };
    
    

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">Step 5: Additional Document Uploads</h3>
            <p className="text-sm text-gray-600 mb-4">
                Upload any supporting documents required for verification.
            </p>
            {docs.map((doc, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-medium">Document {index + 1}</h4>
                        <button
                            type="button"
                            onClick={() => removeArrayItem && removeArrayItem('uploaded_documents', index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                        >
                            Remove
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white">Document Type</label>
                            <select
                                value={doc.type || ''}
                                onChange={(e) => handleDocChange(index, 'type', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="">Select type</option>
                                {documentTypes.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white">Upload File</label>
                            <input
                                type="file"
                                accept=".pdf,.jpeg,.jpg,.png,.heic,.tif"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file) handleDocChange(index, 'file', file);
                                }}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {doc.url && !doc.file && (
                                <a href={doc.url} target="_blank" className="text-blue-600 text-xs block mt-1">View uploaded file</a>
                            )}
                            {doc.file && (
                                <p className="text-sm text-green-600 mt-1">✓ {doc.file.name}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={() => addArrayItem && addArrayItem('uploaded_documents')}
                className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                + Add Document
            </button>
        </div>
    );
};

const ReviewStep: React.FC<{ data: CustomerData; initialData: InitialData }> = ({ data, initialData }) => {
    const getOccupationLabel = (code: string | null) => {
        if (!code) return 'Not specified';
        const occ = initialData.occupations.find(o => o.code === code);
        return occ ? occ.occupation : code;
    };

    const getAddressString = (address: any) => {
        if (!address) return 'Not provided';
        return [address.street_line_1, address.street_line_2, address.city, address.state, address.postal_code, address.country]
            .filter(Boolean).join(', ') || 'Not provided';
    };

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Step 6: Review Information</h3>

            {/* Personal Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md shadow-xl">
            <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Personal Information</h4>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Name:</span> {data.first_name} {data.middle_name} {data.last_name}</p>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Email:</span> {data.email || 'Not provided'}</p>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Phone:</span> {data.phone || 'Not provided'}</p>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Date of Birth:</span> {data.birth_date || 'Not provided'}</p>
            </div>

            {/* Address */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md shadow-xl mt-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Address</h4>
            <p className="text-gray-900 dark:text-gray-100">{getAddressString(data.residential_address)}</p>
            {data.residential_address?.proof_of_address_url && (
                <a href={data.residential_address.proof_of_address_url} target="_blank" className="text-blue-600 dark:text-blue-400 text-sm mt-1 block">View Proof of Address</a>
            )}
            </div>

            {/* Identification */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md shadow-xl mt-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Identification</h4>
            {data.identifying_information && data.identifying_information.length > 0 ? (
                data.identifying_information.map((doc, index) => (
                <div key={index} className="mb-2 text-gray-900 dark:text-gray-100">
                    <p><span className="font-semibold">Type:</span> {doc.type}</p>
                    <p><span className="font-semibold">Country:</span> {doc.issuing_country}</p>
                    <p><span className="font-semibold">Number:</span> {doc.number || 'N/A'}</p>
                    {doc.image_front && !doc.image_front_file && (
                    <a href={doc.image_front} target="_blank" className="text-blue-600 dark:text-blue-400 text-sm">View Front</a>
                    )}
                    {doc.image_back && !doc.image_back_file && (
                    <a href={doc.image_back} target="_blank" className="text-blue-600 dark:text-blue-400 text-sm ml-4">View Back</a>
                    )}
                </div>
                ))
            ) : (
                <p className="text-gray-900 dark:text-gray-100">No documents provided.</p>
            )}
            </div>

            {/* Employment & Finances */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md shadow-xl mt-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Employment & Finances</h4>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Employment Status:</span> {data.employment_status || 'Not provided'}</p>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Occupation:</span> {getOccupationLabel(data.most_recent_occupation_code)}</p>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Expected Payments:</span> {data.expected_monthly_payments_usd || 'Not provided'} USD</p>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Source of Funds:</span> {data.source_of_funds || 'Not provided'}</p>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Account Purpose:</span> {data.account_purpose}{data.account_purpose === 'other' ? ` (${data.account_purpose_other})` : ''}</p>
            <p className="text-gray-900 dark:text-gray-100"><span className="font-semibold">Intermediary:</span> {data.acting_as_intermediary ? 'Yes' : 'No'}</p>
            </div>

            {/* Additional Documents */}
            {data.uploaded_documents && data.uploaded_documents.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md shadow-xl mt-4">
                <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Additional Documents</h4>
                {data.uploaded_documents.map((doc, index) => (
                <div key={index} className="mb-2 text-gray-900 dark:text-gray-100">
                    <p><span className="font-semibold">{documentTypes.find(t => t.value === doc.type)?.label || doc.type}:</span> {doc.fileName || 'Uploaded'}</p>
                    {doc.url && <a href={doc.url} target="_blank" className="text-blue-600 dark:text-blue-400 text-sm">View</a>}
                </div>
                ))}
            </div>
            )}

            {/* Final Notice */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md">
            <p className="text-blue-700 dark:text-blue-300">
                Please review all information carefully. Once you click "Finish", the data will be finalized.
            </p>
            </div>
        </div>
        );

};