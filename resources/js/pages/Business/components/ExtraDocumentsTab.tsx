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
    const [extraDocs, setExtraDocs] = useState<any[]>(
        formData.extra_documents?.length
            ? formData.extra_documents
            : [
                  {
                      description: "",
                      file: null,
                  },
              ]
    );

    const [errors, setErrors] = useState<Record<string, string>>({});

    /** ---------------------------------------------
     * Add new entry
     * --------------------------------------------- */
    const addExtra = () => {
        setExtraDocs((prev) => [
            ...prev,
            {
                description: "",
                file: null,
            },
        ]);
    };

    /** ---------------------------------------------
     * Remove entry
     * --------------------------------------------- */
    const removeExtra = (idx: number) => {
        if (extraDocs.length === 1) {
            showError("At least one record must be kept.");
            return;
        }
        setExtraDocs((prev) => prev.filter((_, i) => i !== idx));
    };

    /** ---------------------------------------------
     * Update field
     * --------------------------------------------- */
    const update = (idx: number, field: string, value: any) => {
        setExtraDocs((prev) =>
            prev.map((item, i) =>
                i === idx ? { ...item, [field]: value } : item
            )
        );

        if (errors[`extra.${idx}.${field}`]) {
            setErrors((prev) => ({
                ...prev,
                [`extra.${idx}.${field}`]: "",
            }));
        }
    };

    /** ---------------------------------------------
     * Validation
     * --------------------------------------------- */
    const validate = () => {
        const e: Record<string, string> = {};

        extraDocs.forEach((item, idx) => {
            if (!item.description.trim())
                e[`extra.${idx}.description`] = "Description is required.";
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /** ---------------------------------------------
     * Submit Step 8 (Final Step)
     * --------------------------------------------- */
    const submit = async () => {
        if (!validate()) return;

        const fd = new FormData();

        extraDocs.forEach((item, idx) => {
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

            // Final step → navigate to review
            goToStep("review");
        } catch (err: any) {
            console.error(err);
            showError(
                err.response?.data?.message ||
                    "Unable to save extra documents."
            );
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

                    {/* Description */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium">
                            Description *
                        </label>
                        <input
                            value={item.description}
                            onChange={(e) =>
                                update(idx, "description", e.target.value)
                            }
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${
                                errors[`extra.${idx}.description`]
                                    ? "border-red-300"
                                    : "border-gray-300"
                            }`}
                        />
                        {errors[`extra.${idx}.description`] && (
                            <p className="text-sm text-red-600">
                                {errors[`extra.${idx}.description`]}
                            </p>
                        )}
                    </div>

                    {/* File upload */}
                    <div>
                        <label className="block text-sm font-medium">
                            Upload File (optional)
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="mt-2"
                            onChange={(e) =>
                                update(
                                    idx,
                                    "file",
                                    e.target.files?.[0] ?? null
                                )
                            }
                        />
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

            {/* BUTTONS */}
            <div className="mt-10 flex justify-between">
                {/* PREVIOUS */}
                <button
                    onClick={() => goToStep("identifying-info")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 
                    text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                {/* SUBMIT */}
                <button
                    onClick={submit}
                    disabled={saving}
                    className={`inline-flex items-center px-6 py-2 border border-transparent 
                    text-sm font-medium rounded-md shadow-sm text-white ${
                        saving
                            ? "bg-gray-400"
                            : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                >
                    {saving ? "Submitting..." : "Complete & Review"}
                </button>
            </div>
        </div>
    );
}
