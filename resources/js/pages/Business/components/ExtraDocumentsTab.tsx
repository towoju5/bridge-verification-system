import React, { useState } from "react";
import axios from "axios";

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    saving: boolean;
    goToStep: (step: string) => void;
    showError: (msg: string) => void;
}

export default function ExtraDocumentsTab({
    formData,
    setFormData,
    saving,
    goToStep,
    showError,
}: Props) {

    /** ---------------------------------------------------------
     * DOCUMENT TYPES (key → label)
     * --------------------------------------------------------- */
    const documentTypes = [
        { key: "business_registration", label: "Business Registration (HK BR Copy + Certificate of Incorporate + AOA)" },
        { key: "operating_address_proof", label: "Operating Address Proof (Bank Statement / Utility Bill / Tenancy Agreement – last 3 months)" },
        { key: "residential_address_proof", label: "Residential Address Proof of directors/shareholders" },
        { key: "shareholding_structure", label: "Business Shareholding Structure (latest NAR1)" },
        { key: "articles_of_association", label: "Articles of Association" },
        { key: "identity_proof", label: "Identity Proof of Applicant / UBO / Directors > 25%" },
        { key: "latest_invoices", label: "Latest invoices showing major product" },
        { key: "bank_statement", label: "Bank Statement" },
        { key: "source_of_funds", label: "Source of Funds (Optional)" },
        { key: "licensing", label: "Licensing (Optional)" },
        { key: "aml_policy", label: "AML Policy (Optional)" },
    ];

    /** ---------------------------------------------------------
     * State
     * --------------------------------------------------------- */
    const [extraDocs, setExtraDocs] = useState<any[]>(
        formData.extra_documents?.length
            ? formData.extra_documents
            : [
                  {
                      type: "",
                      description: "",
                      file: null,
                  },
              ]
    );

    const [errors, setErrors] = useState<Record<string, string>>({});

    /** Add a new row */
    const addExtra = () => {
        setExtraDocs((prev) => [
            ...prev,
            { type: "", description: "", file: null },
        ]);
    };

    /** Remove row */
    const removeExtra = (idx: number) => {
        if (extraDocs.length === 1) {
            showError("At least one document must be kept.");
            return;
        }
        setExtraDocs((prev) => prev.filter((_, i) => i !== idx));
    };

    /** Update helper */
    const update = (idx: number, field: string, value: any) => {
        setExtraDocs((prev) =>
            prev.map((item, i) =>
                i === idx
                    ? { ...item, [field]: value }
                    : item
            )
        );

        if (errors[`extra.${idx}.${field}`]) {
            setErrors((prev) => ({
                ...prev,
                [`extra.${idx}.${field}`]: "",
            }));
        }
    };

    /** Drag drop handler */
    const handleDrop = (e: any, idx: number) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) update(idx, "file", file);
    };

    /** Validation */
    const validate = () => {
        const e: Record<string, string> = {};

        extraDocs.forEach((item, idx) => {
            if (!item.type)
                e[`extra.${idx}.type`] = "Document type is required.";
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /** Submit */
    const submit = async () => {
        if (!validate()) return;

        const fd = new FormData();

        extraDocs.forEach((item, idx) => {
            fd.append(`extra_documents[${idx}][type]`, item.type);
            fd.append(`extra_documents[${idx}][description]`, item.description);

            if (item.file) {
                fd.append(`extra_documents[${idx}][file]`, item.file);
            }
        });

        try {
            await axios.post("/api/business-customer/step/8", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setFormData((prev: any) => ({
                ...prev,
                extra_documents: extraDocs,
            }));

            goToStep("review");
        } catch (err: any) {
            console.error(err);
            showError(err.response?.data?.message || "Unable to save extra documents.");
        }
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Extra Documents
            </h2>

            {extraDocs.map((item, idx) => (
                <div
                    key={idx}
                    className="border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8"
                >

                    {/* HEADER */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white">
                            Extra Document #{idx + 1}
                        </h3>

                        {extraDocs.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeExtra(idx)}
                                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    {/* DOCUMENT TYPE SELECT */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Document Type *</label>

                        <select
                            value={item.type}
                            onChange={(e) => {
                                const selectedKey = e.target.value;
                                update(idx, "type", selectedKey);

                                const doc = documentTypes.find((d) => d.key === selectedKey);

                                if (doc) {
                                    // Auto-fill description and lock it
                                    update(idx, "description", doc.label);
                                }
                            }}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                errors[`extra.${idx}.type`] ? "border-red-300" : "border-gray-300"
                            }`}
                        >
                            <option value="">Select Document Type</option>
                            {documentTypes.map((d) => (
                                <option key={d.key} value={d.key}>
                                    {d.label}
                                </option>
                            ))}
                        </select>

                        {errors[`extra.${idx}.type`] && (
                            <p className="text-sm text-red-600">
                                {errors[`extra.${idx}.type`]}
                            </p>
                        )}
                    </div>

                    {/* DESCRIPTION (READ-ONLY) */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Description (auto-filled)</label>
                        <input
                            value={item.description}
                            readOnly
                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 bg-gray-200 text-gray-700 cursor-not-allowed"
                        />
                    </div>

                    {/* FILE UPLOAD - DRAG & DROP */}
                    <div>
                        <label className="block text-sm font-medium">Upload File</label>

                        <div
                            onDrop={(e) => handleDrop(e, idx)}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => document.getElementById(`file-input-${idx}`)?.click()}
                            className="mt-2 p-6 border-2 border-dashed rounded-lg text-center bg-white dark:bg-gray-800 cursor-pointer hover:border-indigo-500 transition"
                        >
                            {item.file ? (
                                <p className="text-green-600">
                                    {item.file.name} (ready to upload)
                                </p>
                            ) : (
                                <p className="text-gray-500">Drag & Drop file here or click to select</p>
                            )}

                            <input
                                type="file"
                                id={`file-input-${idx}`}
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => update(idx, "file", e.target.files?.[0] ?? null)}
                            />
                        </div>
                    </div>
                </div>
            ))}

            {/* ADD BUTTON */}
            <div className="flex justify-start mb-6">
                <button
                    type="button"
                    onClick={addExtra}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                >
                    + Add Extra Document
                </button>
            </div>

            {/* FOOTER BUTTONS */}
            <div className="mt-10 flex justify-between">
                <button
                    onClick={() => goToStep("identifying_information")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                <button
                    onClick={submit}
                    disabled={saving}
                    className={`inline-flex items-center px-6 py-2 border border-transparent 
                    text-sm font-medium rounded-md shadow-sm text-white ${
                        saving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                >
                    {saving ? "Submitting..." : "Complete & Review"}
                </button>
            </div>

        </div>
    );
}
