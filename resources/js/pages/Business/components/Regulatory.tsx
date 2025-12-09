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

export default function Regulatory({
    formData,
    setFormData,
    saving,
    countries = [],
    goToStep,
    showError,
}: Props) {
    const [local, setLocal] = useState({
        regulated_activities_description:
            formData.regulated_activities_description || "",
        primary_regulatory_authority_country:
            formData.primary_regulatory_authority_country || "",
        primary_regulatory_authority_name:
            formData.primary_regulatory_authority_name || "",
        license_number: formData.license_number || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    /** ----------------------------------------------
     * Generic update helper
     * ----------------------------------------------*/
    const update = (field: string, value: any) => {
        setLocal((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    /** ----------------------------------------------
     * Validation
     * ----------------------------------------------*/
    const validate = () => {
        const e: Record<string, string> = {};

        // No required fields except for if one of them is filled
        // We'll apply minimal validation

        if (
            local.regulated_activities_description.trim() &&
            !local.primary_regulatory_authority_country
        ) {
            e.primary_regulatory_authority_country =
                "Country is required when regulated activity is described.";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /** ----------------------------------------------
     * Submit step 5
     * ----------------------------------------------*/
    const save = async () => {
        if (!validate()) return;

        try {
            await axios.post("/api/business-customer/step/5", local);

            setFormData((prev: any) => ({ ...prev, ...local }));

            goToStep("documents");
        } catch (err: any) {
            console.error(err);
            showError(
                err.response?.data?.message ||
                    "Unable to save regulatory information."
            );
        }
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
                Regulatory Information
            </h2>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                {/* Regulated Activities Description */}
                <div className="sm:col-span-2">
                    <label className="text-sm font-medium">
                        Regulated Activities Description
                    </label>
                    <textarea
                        rows={3}
                        value={local.regulated_activities_description}
                        onChange={(e) =>
                            update(
                                "regulated_activities_description",
                                e.target.value
                            )
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>

                {/* Regulatory Authority Country */}
                <div>
                    <label className="text-sm font-medium">
                        Authority Country
                    </label>

                    {countries.length ? (
                        <select
                            value={local.primary_regulatory_authority_country}
                            onChange={(e) =>
                                update(
                                    "primary_regulatory_authority_country",
                                    e.target.value
                                )
                            }
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${
                                errors.primary_regulatory_authority_country
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
                            value={
                                local.primary_regulatory_authority_country
                            }
                            onChange={(e) =>
                                update(
                                    "primary_regulatory_authority_country",
                                    e.target.value
                                )
                            }
                            placeholder="US"
                            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${
                                errors.primary_regulatory_authority_country
                                    ? "border-red-300"
                                    : "border-gray-300"
                            }`}
                        />
                    )}

                    {errors.primary_regulatory_authority_country && (
                        <p className="text-red-600 text-sm">
                            {errors.primary_regulatory_authority_country}
                        </p>
                    )}
                </div>

                {/* Authority Name */}
                <div>
                    <label className="text-sm font-medium">Authority Name</label>
                    <input
                        value={local.primary_regulatory_authority_name}
                        onChange={(e) =>
                            update(
                                "primary_regulatory_authority_name",
                                e.target.value
                            )
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>

                {/* License Number */}
                <div>
                    <label className="text-sm font-medium">License Number</label>
                    <input
                        value={local.license_number}
                        onChange={(e) =>
                            update("license_number", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>
            </div>

            {/* BUTTONS */}
            <div className="mt-10 flex justify-between">
                {/* PREVIOUS */}
                <button
                    onClick={() => goToStep("financial")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 
                    text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                {/* NEXT */}
                <button
                    onClick={save}
                    disabled={saving}
                    className={`inline-flex items-center px-6 py-2 border border-transparent 
                    text-sm font-medium rounded-md shadow-sm text-white 
                    ${saving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
                >
                    {saving ? "Saving..." : "Next"}
                </button>
            </div>
        </div>
    );
}
