import React, { useState } from "react";
import axios from "axios";

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    saving: boolean;
    goToStep: (step: string) => void;
    showError: (msg: string) => void;
}

export default function DocumentsTab({
    formData,
    setFormData,
    saving,
    goToStep,
    showError,
}: Props) {
    const [documents, setDocuments] = useState<any[]>(
        formData.documents?.length
            ? formData.documents
            : [
                {
                    description: "",
                    purpose: "", // ← single string now (not array)
                    file: null,
                },
            ]
    );

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Purpose options as value/label pairs for clarity
    const purposeOptions = [
        { value: "proof_of_address", label: "Proof of Address" },
        { value: "business_registration", label: "Business Registration" },
        { value: "tax_documents", label: "Tax Documents" },
        { value: "compliance_documents", label: "Compliance Documents" },
        { value: "financial_statements", label: "Financial Statements" },
    ];

    /** ----------------------------------------------------
     * Add new document
     * ---------------------------------------------------- */
    const addDocument = () => {
        setDocuments((prev) => [
            ...prev,
            { description: "", purpose: "", file: null },
        ]);
    };

    /** ----------------------------------------------------
     * Remove document
     * ---------------------------------------------------- */
    const removeDocument = (index: number) => {
        if (documents.length === 1) {
            showError("At least one document is required.");
            return;
        }
        setDocuments((prev) => prev.filter((_, i) => i !== index));
    };

    /** ----------------------------------------------------
     * Update field
     * ---------------------------------------------------- */
    const update = (index: number, field: string, value: any) => {
        setDocuments((prev) =>
            prev.map((doc, i) => (i === index ? { ...doc, [field]: value } : doc))
        );

        const errorKey = `documents.${index}.${field}`;
        if (errors[errorKey]) {
            setErrors((prev) => ({ ...prev, [errorKey]: "" }));
        }
    };

    /** ----------------------------------------------------
     * VALIDATION
     * ---------------------------------------------------- */
    const validate = () => {
        const e: Record<string, string> = {};

        documents.forEach((doc, idx) => {
            if (!doc.description.trim())
                e[`documents.${idx}.description`] = "Description is required.";

            if (!doc.purpose)
                e[`documents.${idx}.purpose`] = "Please select a purpose.";
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Documents Upload
            </h2>

            {documents.map((doc, idx) => (
                <div
                    key={idx}
                    className="border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white">
                            Document #{idx + 1}
                        </h3>

                        {documents.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeDocument(idx)}
                                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Description *</label>
                        <input
                            type="text"
                            value={doc.description}
                            onChange={(e) => update(idx, "description", e.target.value)}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors[`documents.${idx}.description`]
                                    ? "border-red-300"
                                    : "border-gray-300"
                                }`}
                        />
                        {errors[`documents.${idx}.description`] && (
                            <p className="text-sm text-red-600">
                                {errors[`documents.${idx}.description`]}
                            </p>
                        )}
                    </div>

                    {/* Purpose Dropdown */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Purpose *</label>
                        <select
                            value={doc.purpose}
                            onChange={(e) => update(idx, "purpose", e.target.value)}
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors[`documents.${idx}.purpose`]
                                    ? "border-red-300"
                                    : "border-gray-300"
                                }`}
                        >
                            <option value="">Select Purpose</option>
                            {purposeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {errors[`documents.${idx}.purpose`] && (
                            <p className="text-sm text-red-600">
                                {errors[`documents.${idx}.purpose`]}
                            </p>
                        )}
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium">
                            Upload File (PDF, JPG, PNG)
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="mt-2 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
                            onChange={(e) => update(idx, "file", e.target.files?.[0] ?? null)}
                        />
                    </div>
                </div>
            ))}

            {/* ADD DOCUMENT BUTTON */}
            <div className="flex justify-start mb-6">
                <button
                    type="button"
                    onClick={addDocument}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                >
                    + Add Another Document
                </button>
            </div>

            {/* BUTTONS */}
            <div className="mt-10 flex justify-between">
                {/* PREVIOUS */}
                <button
                    type="button"
                    onClick={() => goToStep("regulatory")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                {/* NEXT */}
                <button
                    type="button"
                    onClick={async () => {
                        if (!validate()) return;

                        try {
                            const fd = new FormData();

                            documents.forEach((doc, idx) => {
                                fd.append(`documents[${idx}][description]`, doc.description);
                                fd.append(`documents[${idx}][purpose]`, doc.purpose); // single value
                                if (doc.file) {
                                    fd.append(`documents[${idx}][file]`, doc.file);
                                }
                            });

                            await axios.post("/api/business-customer/step/6", fd, {
                                headers: { "Content-Type": "multipart/form-data" },
                            });

                            setFormData((prev: any) => ({
                                ...prev,
                                documents: documents,
                            }));

                            goToStep("collections"); // ✅ Ensure this matches your step name!
                            // goToStep("identifying_information"); // ✅ Ensure this matches your step name!
                        } catch (err: any) {
                            console.error(err);
                            showError(
                                err.response?.data?.message || "Unable to save document uploads."
                            );
                        }
                    }}
                    disabled={saving}
                    className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${saving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                >
                    {saving ? "Saving..." : "Next"}
                </button>
            </div>
        </div>
    );
}