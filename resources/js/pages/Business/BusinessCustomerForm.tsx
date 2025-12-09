import React, { useState, useEffect } from "react";
import axios from "axios";
import BusinessInfo from "./components/BusinessInfo";
import Address from "./components/Address";
import AssociatedPersons from "./components/AssociatedPersons";
import FinancialInformation from "./components/FinancialInformation";
import Regulatory from "./components/Regulatory";
import DocumentsTab from "./components/DocumentsTab";
import IdentifyingInfoTab from "./components/IdentifyingInfoTab";
import ExtraDocumentsTab from "./components/ExtraDocumentsTab";
import ReviewStep from "./components/ReviewStep";
import NavBar from "./components/NavBar";
import AppLayout from "@/Layouts/AppLayout";

// import NavBar from "./NavBar";
// import BusinessInfo from "./BusinessInfo";
// import Address from "./Address";
// import AssociatedPersons from "./AssociatedPersons";
// import FinancialInformation from "./FinancialInformation";
// import Regulatory from "./Regulatory";
// import DocumentsTab from "./DocumentsTab";
// import IdentifyingInfoTab from "./IdentifyingInfoTab";
// import ExtraDocumentsTab from "./ExtraDocumentsTab";
// import ReviewStep from "./ReviewStep";

export default function BusinessCustomerForm() {
    const [activeTab, setActiveTab] = useState("business-info");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<any>({});
    const [countries, setCountries] = useState([]);
    const [idTypes, setIdTypes] = useState([]);
    const [documentPurposes, setDocumentPurposes] = useState([]);
    const [extraDocumentTypes, setExtraDocumentTypes] = useState([]);

    const [completed, setCompleted] = useState<Record<string, boolean>>({});

    /** ---------------------------------------------------
     * Load initial shared dropdown data
     * ---------------------------------------------------*/
    useEffect(() => {
        const load = async () => {
            try {
                const [c, dp] = await Promise.all([
                    axios.get("/api/countries"),
                    axios.get("/api/business/document-purposes")
                ]);

                setCountries(c.data);
                setDocumentPurposes(dp.data);

                // Example: extra document types (editable)
                setExtraDocumentTypes([
                    { value: "business_registration", label: "Business Registration", required: true },
                    { value: "operating_address_proof", label: "Operating Address Proof", required: false },
                    { value: "tax_statement", label: "Tax Statement", required: false }
                ]);

                setIdTypes([
                    "passport",
                    "drivers_license",
                    "national_id",
                    "residence_permit",
                    "other"
                ]);
            } catch (err) {
                console.error("Startup load failed", err);
            }
        };

        load();
    }, []);

    /** ---------------------------------------------------
     * Handle error display (child to parent)
     * ---------------------------------------------------*/
    const showError = (msg: string) => {
        setError(msg);
        setTimeout(() => setError(null), 5000);
    };

    /** ---------------------------------------------------
     * Step auto-advance helper
     * ---------------------------------------------------*/
    const goToStep = (step: string) => {
        setCompleted(prev => ({ ...prev, [activeTab]: true }));
        setActiveTab(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    /** ---------------------------------------------------
     * Final wizard submission (API full-submit)
     * ---------------------------------------------------*/
    const finalize = async () => {
        try {
            setSaving(true);
            setError(null);

            const res = await axios.post("/api/business-customer/submit-all", formData);
            console.log("Final submit:", res.data);

            alert("Business KYC submitted successfully!");
        } catch (err: any) {
            console.error(err);
            showError(err.response?.data?.message || "Submission error.");
        } finally {
            setSaving(false);
        }
    };

    /** ---------------------------------------------------
     * Render active step
     * ---------------------------------------------------*/
    const renderStep = () => {
        switch (activeTab) {
            case "business-info":
                return (
                    <BusinessInfo
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "addresses":
                return (
                    <Address
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        countries={countries}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "persons":
                return (
                    <AssociatedPersons
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        countries={countries}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "financial":
                return (
                    <FinancialInformation
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "regulatory":
                return (
                    <Regulatory
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        countries={countries}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "documents":
                return (
                    <DocumentsTab
                        formData={formData}
                        setFormData={setFormData}
                        documentPurposes={documentPurposes}
                        saving={saving}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "identifying_information":
                return (
                    <IdentifyingInfoTab
                        formData={formData}
                        setFormData={setFormData}
                        idTypes={idTypes}
                        countries={countries}
                        saving={saving}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "extra_documents":
                return (
                    <ExtraDocumentsTab
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        extraDocumentTypes={extraDocumentTypes}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "review":
                return <ReviewStep formData={formData} finalize={finalize} saving={saving} />;

            default:
                return <p>Invalid step</p>;
        }
    };

    return (
        <AppLayout title="Select Account Type">
            <div className="w-full mx-auto py-10 px-4">
                <div className="flex justify-center items-center">
                    <NavBar activeTab={activeTab} setActiveTab={setActiveTab} completed={completed} />
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <div className="max-w-6xl mx-auto py-3 px-2">
                    {renderStep()}
                </div>
            </div>
        </AppLayout>
    );
}
