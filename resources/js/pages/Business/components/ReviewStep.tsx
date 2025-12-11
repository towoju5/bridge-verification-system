import React, { useState } from "react";
import axios from "axios";

interface Props {
    formData: any;
    saving: boolean;
    goToStep: (step: string) => void;
    showError: (msg: string) => void;
}

export default function ReviewStep({ formData, saving, goToStep, showError }: Props) {
    const [submitting, setSubmitting] = useState(false);

    /** ---------------------------------------------------
     * Final Submit → triggers server processing
     * --------------------------------------------------- */
    const submitFinal = async () => {
        setSubmitting(true);

        try {
            const res = await axios.post("/api/business-customer/submit-final");
            alert("KYC successfully submitted!");
        } catch (err: any) {
            console.error(err);
            showError(err.response?.data?.message || "Final submission failed.");
        }

        setSubmitting(false);
    };

    const docTypeLabels: Record<string, string> = {
        business_registration: "Business Registration (HK BR Copy + Certificate of Incorporate + AOA)",
        operating_address_proof: "Operating Address Proof (Bank Statement / Utility Bill / Tenancy Agreement – last 3 months)",
        residential_address_proof: "Residential Address Proof (Directors/Shareholders)",
        shareholding_structure: "Business Shareholding Structure (Latest NAR1)",
        articles_of_association: "Articles of Association",
        identity_proof: "Identity Proof (Applicant / UBO / Directors > 25%)",
        latest_invoices: "Latest Invoices",
        bank_statement: "Bank Statement",
        source_of_funds: "Source of Funds (Optional)",
        licensing: "Licensing (Optional)",
        aml_policy: "AML Policy (Optional)",
    };

    const resolvedExtraDocs =
        formData?.business_data?.extra_documents ??
        formData?.extra_documents ??
        [];

    // Helper to safely extract file name for display
    const getFileName = (fileOrMeta: any): string => {
        if (fileOrMeta instanceof File) {
            return fileOrMeta.name;
        }
        return fileOrMeta?.file_name || fileOrMeta?.file_path || '—';
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                Review Your Information
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-8">
                Please review all your provided information carefully before submitting.
            </p>

            {/* ------------------ BUSINESS INFO ------------------ */}
            <Section title="Business Information" onEdit={() => goToStep("business-info")}>
                <Row label="Legal Name" value={formData.business_legal_name} />
                <Row label="Trade Name" value={formData.business_trade_name} />
                <Row label="Email" value={formData.email} />
                <Row label="Phone" value={`${formData.phone_calling_code || ""} ${formData.phone_number || ""}`} />
                <Row label="Business Type" value={formData.business_type} />
                <Row label="Registration Number" value={formData.registration_number} />
                <Row label="Incorporation Date" value={formData.incorporation_date} />
                <Row label="Industry" value={formData.business_industry} />
                <Row label="Website" value={formData.primary_website} />
            </Section>

            {/* ------------------ ADDRESSES ------------------ */}
            <Section title="Registered Address" onEdit={() => goToStep("addresses")}>
                <AddressBlock data={formData.registered_address} />
            </Section>

            <Section title="Physical Address" onEdit={() => goToStep("addresses")}>
                <AddressBlock data={formData.physical_address} />
            </Section>

            {/* ------------------ ASSOCIATED PERSONS ------------------ */}
            <Section title="Associated Persons" onEdit={() => goToStep("persons")}>
                {formData.associated_persons?.map((p: any, idx: number) => (
                    <div key={idx} className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Person #{idx + 1}
                        </h4>
                        <Row label="Name" value={`${p.first_name} ${p.last_name}`} />
                        <Row label="Email" value={p.email} />
                        <Row label="Nationality" value={p.nationality} />
                        <Row label="Ownership %" value={p.ownership_percentage} />
                        <AddressBlock data={p.residential_address} />
                    </div>
                ))}
            </Section>

            {/* ------------------ FINANCIAL INFO ------------------ */}
            <Section title="Financial Information" onEdit={() => goToStep("financial")}>
                <Row label="Account Purpose" value={formData.account_purpose} />
                {formData.account_purpose === "Other" && (
                    <Row label="Other Purpose" value={formData.account_purpose_other} />
                )}
                <Row label="Source of Funds" value={formData.source_of_funds} />
                <Row label="High Risk Activities" value={formData.high_risk_activities?.join(", ")} />
                <Row label="Annual Revenue" value={formData.estimated_annual_revenue_usd} />
                <Row label="Monthly Payments" value={formData.expected_monthly_payments_usd} />
            </Section>

            {/* ------------------ REGULATORY ------------------ */}
            <Section title="Regulatory Information" onEdit={() => goToStep("regulatory")}>
                <Row
                    label="Description of Regulated Activities"
                    value={formData.regulated_activities_description}
                />
                <Row
                    label="Authority Country"
                    value={formData.primary_regulatory_authority_country}
                />
                <Row
                    label="Authority Name"
                    value={formData.primary_regulatory_authority_name}
                />
                <Row label="License Number" value={formData.license_number} />
            </Section>

            {/* ------------------ DOCUMENTS ------------------ */}
            <Section title="Uploaded Documents" onEdit={() => goToStep("documents")}>
                {formData.documents?.map((d: any, idx: number) => (
                    <div key={idx} className="mb-4 p-3 border rounded">
                        <Row label="Description" value={d.description} />
                        <Row label="Purposes" value={d.purposes?.join(", ")} />
                        <Row label="File" value={getFileName(d)} />
                    </div>
                ))}
            </Section>

            {/* ------------------ IDENTIFYING INFO ------------------ */}
            <Section title="Identifying Information" onEdit={() => goToStep("identifying-info")}>
                {formData.identifying_information?.map((id: any, idx: number) => (
                    <div key={idx} className="mb-4 p-3 border rounded">
                        <Row label="Type" value={id.type} />
                        <Row label="Issuing Country" value={id.issuing_country} />
                        <Row label="Number" value={id.number} />
                        <Row label="Expiration" value={id.expiration} />
                        <Row label="Description" value={id.description} />
                    </div>
                ))}
            </Section>

            {/* ------------------ EXTRA DOCUMENTS ------------------ */}
            <Section title="Extra Documents" onEdit={() => goToStep("extra-documents")}>
                {resolvedExtraDocs.length > 0 ? (
                    resolvedExtraDocs.map((d: any, idx: number) => (
                        <div key={idx} className="mb-4 p-3 border rounded">
                            <Row
                                label="Document Type"
                                value={docTypeLabels[d.type] || d.type}
                            />
                            <Row
                                label="Description"
                                value={d.description}
                            />
                            <Row
                                label="File"
                                value={getFileName(d)}
                            />
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 dark:text-gray-300 text-sm">
                        No extra documents submitted.
                    </p>
                )}
            </Section>

            {/* SUBMIT BUTTON */}
            <div className="mt-10 flex justify-end">
                <button
                    onClick={submitFinal}
                    disabled={saving || submitting}
                    className={`px-6 py-3 rounded-md text-white text-lg font-medium shadow 
                    ${saving || submitting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                >
                    {submitting ? "Submitting..." : "Submit KYB"}
                </button>
            </div>
        </div>
    );
}

/* ============================================================
 * SHARED COMPONENTS
 * ============================================================ */

function Section({
    title,
    onEdit,
    children,
}: {
    title: string;
    onEdit?: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Edit
                    </button>
                )}
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: any }) {
    if (value === undefined || value === null || value === "") return null;

    return (
        <div className="flex justify-between text-sm py-1 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-300">{label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
        </div>
    );
}

function AddressBlock({ data }: any) {
    if (!data) return null;

    return (
        <div className="p-3 border border-gray-200 dark:border-gray-700 rounded mt-2">
            <Row label="Street 1" value={data.street_line_1} />
            <Row label="Street 2" value={data.street_line_2} />
            <Row label="City" value={data.city} />
            <Row label="Subdivision" value={data.subdivision} />
            <Row label="Postal Code" value={data.postal_code} />
            <Row label="Country" value={data.country} />
        </div>
    );
}