import React, { useState } from "react";
import axios from "axios";

interface Country {
    code: string;
    name: string;
}

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    saving: boolean;
    countries?: Country[];
    goToStep: (step: string) => void;
    showError: (msg: string) => void;
}

export default function IdentifyingInfoTab({
    formData,
    setFormData,
    saving,
    countries = [],
    goToStep,
    showError,
}: Props) {
    const [list, setList] = useState<any[]>(
        formData.identifying_information?.length
            ? formData.identifying_information
            : [
                  {
                      type: "",
                      issuing_country: "",
                      number: "",
                      expiration: "",
                      description: "",
                  },
              ]
    );

    const [errors, setErrors] = useState<Record<string, string>>({});

    /** ---------------------------------------------
     * Add entry
     * --------------------------------------------- */
    const addItem = () => {
        setList((prev) => [
            ...prev,
            {
                type: "",
                issuing_country: "",
                number: "",
                expiration: "",
                description: "",
            },
        ]);
    };

    /** ---------------------------------------------
     * Remove entry
     * --------------------------------------------- */
    const removeItem = (idx: number) => {
        if (list.length === 1) {
            showError("At least one identification record is required.");
            return;
        }
        setList((prev) => prev.filter((_, i) => i !== idx));
    };

    /** ---------------------------------------------
     * Update field
     * --------------------------------------------- */
    const update = (idx: number, field: string, value: any) => {
        setList((prev) =>
            prev.map((item, index) =>
                index === idx ? { ...item, [field]: value } : item
            )
        );

        if (errors[`list.${idx}.${field}`]) {
            setErrors((prev) => ({
                ...prev,
                [`list.${idx}.${field}`]: "",
            }));
        }
    };

    /** ---------------------------------------------
     * Validation
     * --------------------------------------------- */
    const validate = () => {
        const e: Record<string, string> = {};

        list.forEach((item, idx) => {
            if (!item.type.trim())
                e[`list.${idx}.type`] = "Type is required.";

            if (!item.issuing_country.trim())
                e[`list.${idx}.issuing_country`] = "Issuing country is required.";

            if (!item.number.trim())
                e[`list.${idx}.number`] = "Identification number is required.";

            if (!item.expiration.trim())
                e[`list.${idx}.expiration`] = "Expiration date is required.";
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Identifying Information
            </h2>

            {list.map((item, idx) => (
                <div
                    key={idx}
                    className="border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white">
                            ID #{idx + 1}
                        </h3>

                        {list.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium">Type *</label>
                            <input
                                value={item.type}
                                onChange={(e) =>
                                    update(idx, "type", e.target.value)
                                }
                                placeholder="e.g., Passport"
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${
                                    errors[`list.${idx}.type`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors[`list.${idx}.type`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`list.${idx}.type`]}
                                </p>
                            )}
                        </div>

                        {/* Issuing Country */}
                        <div>
                            <label className="block text-sm font-medium">
                                Issuing Country *
                            </label>

                            {countries.length ? (
                                <select
                                    value={item.issuing_country}
                                    onChange={(e) =>
                                        update(
                                            idx,
                                            "issuing_country",
                                            e.target.value
                                        )
                                    }
                                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${
                                        errors[`list.${idx}.issuing_country`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                >
                                    <option value="">Select Country</option>
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    value={item.issuing_country}
                                    onChange={(e) =>
                                        update(
                                            idx,
                                            "issuing_country",
                                            e.target.value
                                        )
                                    }
                                    placeholder="US"
                                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${
                                        errors[`list.${idx}.issuing_country`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                />
                            )}

                            {errors[`list.${idx}.issuing_country`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`list.${idx}.issuing_country`]}
                                </p>
                            )}
                        </div>

                        {/* Number */}
                        <div>
                            <label className="block text-sm font-medium">
                                Identification Number *
                            </label>
                            <input
                                value={item.number}
                                onChange={(e) =>
                                    update(idx, "number", e.target.value)
                                }
                                placeholder="Enter ID number"
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${
                                    errors[`list.${idx}.number`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors[`list.${idx}.number`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`list.${idx}.number`]}
                                </p>
                            )}
                        </div>

                        {/* Expiration */}
                        <div>
                            <label className="block text-sm font-medium">
                                Expiration Date *
                            </label>
                            <input
                                type="date"
                                value={item.expiration}
                                onChange={(e) =>
                                    update(idx, "expiration", e.target.value)
                                }
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${
                                    errors[`list.${idx}.expiration`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors[`list.${idx}.expiration`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`list.${idx}.expiration`]}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium">Description</label>
                            <textarea
                                rows={2}
                                value={item.description}
                                onChange={(e) =>
                                    update(idx, "description", e.target.value)
                                }
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                            />
                        </div>
                    </div>
                </div>
            ))}
            {/* ADD ANOTHER ID BUTTON */}
            <div className="flex justify-start mb-6">
                <button
                    type="button"
                    onClick={addItem}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                >
                    + Add Another Identification
                </button>
            </div>

            {/* BUTTONS */}
            <div className="mt-10 flex justify-between">
                {/* PREVIOUS */}
                <button
                    onClick={() => goToStep("documents")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300
                    text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                {/* NEXT */}
                <button
                    onClick={async () => {
                        if (!validate()) return;

                        try {
                            const payload = {
                                identifying_information: list,
                            };

                            await axios.post(
                                "/api/business-customer/step/7",
                                payload
                            );

                            setFormData((prev: any) => ({
                                ...prev,
                                identifying_information: list,
                            }));

                            goToStep("extra-documents");
                        } catch (err: any) {
                            console.error(err);
                            showError(
                                err.response?.data?.message ||
                                    "Unable to save identifying information."
                            );
                        }
                    }}
                    disabled={saving}
                    className={`inline-flex items-center px-6 py-2 border border-transparent 
                    text-sm font-medium rounded-md shadow-sm text-white ${
                        saving
                            ? "bg-gray-400"
                            : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                >
                    {saving ? "Saving..." : "Next"}
                </button>
            </div>
        </div>
    );
}
