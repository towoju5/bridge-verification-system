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
import CollectionsTab from "./components/CollectionsTab";
import PayoutsTab from "./components/PayoutsTab";

export default function BusinessCustomerForm() {
    const [activeTab, setActiveTab] = useState("business-info");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<any>({});

    // Loaded shared lookup data
    const [countries, setCountries] = useState([]);
    const [documentPurposes, setDocumentPurposes] = useState([]);
    const [occupations, setOccupations] = useState([]);
    const [accountPurposes, setAccountPurposes] = useState([]);
    const [sourceOfFunds, setSourceOfFunds] = useState([]);
    const [idTypes, setIdTypes] = useState([]);

    // Additional documents list
    const [extraDocumentTypes, setExtraDocumentTypes] = useState([]);

    const [completed, setCompleted] = useState<Record<string, boolean>>({});

    /** ---------------------------------------------------------
     * Load ALL shared dropdown data from backend APIs
     * --------------------------------------------------------- */
    useEffect(() => {
        const load = async () => {
            try {
                const [
                    countriesRes,
                    occupationsRes,
                    accountPurposesRes,
                    sourceOfFundsRes,
                    // purposesRes,
                    // idTypesRes
                ] = await Promise.all([
                    axios.get("/api/data/countries"),
                    axios.get("/api/data/occupations"),
                    axios.get("/api/data/account-purposes"),
                    axios.get("/api/data/source-of-funds"),
                    // axios.get("/api/data/business/document-purposes"),
                    // axios.get("/api/data/id-types/global")
                ]);

                // console.log(accountPurposes);


                setCountries(countriesRes.data);
                setOccupations(occupationsRes.data);
                setAccountPurposes(accountPurposesRes.data);
                setSourceOfFunds(sourceOfFundsRes.data);
                // setDocumentPurposes(purposesRes.data);
                // setIdTypes(idTypesRes.data);

                // Example extra doc types; still customizable
                setExtraDocumentTypes([
                    { value: "business_registration", label: "Business Registration (HK BR Copy + Certificate of Incorporation + AOA)", required: true },
                    { value: "operating_address_proof", label: "Operating Address Proof (can be Bank statement or Utility Bill or Tenancy Agreement dated in recent 3 months)", required: true },
                    { value: "residential_address_proof", label: "Residential Address Proof of director and shareholders (can be Bank statement or Utility Bill or Tenancy Agreement dated in recent 3 months)", required: true },
                    { value: "shareholding_structure", label: "Business Shareholding Structure (latest NAR1)", required: true },
                    { value: "articles_of_association", label: "Articles of Association", required: true },
                    { value: "identity_proof", label: "Identity proof of the applicant (please submit for all UBOs/Directors with more than 25% share)", required: true },
                    { value: "latest_invoices", label: "One set of latest invoices showing the major product", required: true },
                    { value: "bank_statement", label: "Bank statement", required: true },
                    { value: "source_of_funds", label: "Source of Funds", required: false },
                    { value: "licensing", label: "Licensing", required: false },
                    { value: "aml_policy", label: "AML Policy", required: false }
                ]);
            } catch (err) {
                console.error("Startup load failed", err);
            }
        };

        load();
    }, []);

    /** ---------------------------------------------------------
     * Handle error messages
     * --------------------------------------------------------- */
    const showError = (msg: string) => {
        setError(msg);
        setTimeout(() => setError(null), 5000);
    };

    /** ---------------------------------------------------------
     * Step navigation
     * --------------------------------------------------------- */
    const goToStep = (step: string) => {
        setCompleted(prev => ({ ...prev, [activeTab]: true }));
        setActiveTab(step);

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    /** ---------------------------------------------------------
     * Final full submit
     * --------------------------------------------------------- */
    const finalize = async () => {
        try {
            setSaving(true);
            setError(null);

            const res = await axios.post("/api/business-customer/submit-all", formData);

            alert("Business KYC submitted successfully!");
        } catch (err: any) {
            console.error(err);
            showError(err.response?.data?.message || "Submission error.");
        } finally {
            setSaving(false);
        }
    };

    /** ---------------------------------------------------------
     * Render active step
     * --------------------------------------------------------- */
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
                        goToStep={goToStep}
                        showError={showError}
                        countries={countries}
                    />
                );

            case "persons":
                return (
                    <AssociatedPersons
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        countries={countries}
                        // occupations={occupations}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "financial":
                // console.log("available countries are", sourceOfFunds, accountPurposes)
                return (
                    <FinancialInformation
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        goToStep={goToStep}
                        showError={showError}
                        sourceOfFunds={sourceOfFunds}
                        accountPurposes={accountPurposes}
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
                        // documentPurposes={documentPurposes}
                        saving={saving}
                        goToStep={goToStep}
                        showError={showError}
                    />
                );

            case "collections":
                return (
                    <CollectionsTab
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        goToStep={goToStep}
                        showError={showError}
                    />
                )

            case "payouts":
                return (
                    <PayoutsTab
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        goToStep={goToStep}
                        showError={showError}
                    />
                )


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
                return <ReviewStep formData={formData} saving={saving} finalize={finalize} />;

            default:
                return <p>Invalid step</p>;
        }
    };

    return (
        <AppLayout title="Business KYC Application">
            <div className="w-full mx-auto py-10 px-4">
                <div className="flex justify-center items-center">
                    <NavBar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        completed={completed}
                    />
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
