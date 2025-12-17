import React, { useState } from "react";
import axios from "axios";
import AnimatedMulti from "../shared/AnimatedMulti";

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    saving: boolean;
    goToStep: (step: string) => void;
    showError: (msg: string) => void;
}

interface Option {
    value: string;
    label: string;
}

export default function ExtraBusinessInfo({
    formData,
    setFormData,
    saving,
    goToStep,
    showError,
}: Props) {
    const [data, setData] = useState({
        meeting_mode: formData.meeting_mode || "",
        industry_vertical: formData.industry_vertical || "",
        business_description: formData.business_description || "",
        obo_usage: formData.obo_usage || "",
        monthly_volume_usd: formData.monthly_volume_usd || "",
        avg_transaction_usd: formData.avg_transaction_usd || "",
        max_transaction_usd: formData.max_transaction_usd || "",
        primary_account_purpose: formData.primary_account_purpose || "",
        sender_geographies: formData.sender_geographies || [],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const update = (key: string, value: any) => {
        setData((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: "" }));
        }
    };

    const geographies: Option[] = [
        { value: "Africa", label: "Africa" },
        { value: "Europe", label: "Europe" },
        { value: "North America", label: "North America" },
        { value: "Asia", label: "Asia" },
        { value: "South America", label: "South America" },
    ];

    /* -----------------------------------------
     * VALIDATION (ALL REQUIRED)
     * --------------------------------------- */
    const validate = () => {
        const e: Record<string, string> = {};

        if (!data.meeting_mode.trim())
            e.meeting_mode = "Please specify how you communicate with the merchant";

        if (!data.industry_vertical.trim())
            e.industry_vertical = "Merchant industry vertical is required";

        if (!data.business_description || data.business_description.length < 140)
            e.business_description = "Minimum of 140 characters required";

        if (!data.obo_usage)
            e.obo_usage = "This field is required";

        if (!data.monthly_volume_usd)
            e.monthly_volume_usd = "Required";

        if (!data.avg_transaction_usd)
            e.avg_transaction_usd = "Required";

        if (!data.max_transaction_usd)
            e.max_transaction_usd = "Required";

        if (!data.primary_account_purpose.trim())
            e.primary_account_purpose = "Required";

        if (!data.sender_geographies.length)
            e.sender_geographies = "Select at least one geography";

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Business & Transaction Information
            </h2>

            {/* Meeting Mode */}
            <div className="mb-4">
                <label className="block text-sm font-medium">
                    Mode of meeting / communication with the merchant *
                </label>
                <input
                    type="text"
                    placeholder="e.g. WhatsApp, Skype, Google Meet, Physical meeting"
                    value={data.meeting_mode}
                    onChange={(e) => update("meeting_mode", e.target.value)}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                        errors.meeting_mode ? "border-red-300" : "border-gray-300"
                    }`}
                />
                {errors.meeting_mode && (
                    <p className="text-sm text-red-600">{errors.meeting_mode}</p>
                )}
            </div>

            {/* Industry Vertical */}
            <div className="mb-4">
                <label className="block text-sm font-medium">
                    Merchant Industry Vertical *
                </label>
                <input
                    type="text"
                    value={data.industry_vertical}
                    onChange={(e) => update("industry_vertical", e.target.value)}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                        errors.industry_vertical ? "border-red-300" : "border-gray-300"
                    }`}
                />
                {errors.industry_vertical && (
                    <p className="text-sm text-red-600">
                        {errors.industry_vertical}
                    </p>
                )}
            </div>

            {/* Business Description */}
            <div className="mb-4">
                <label className="block text-sm font-medium">
                    Business Description (minimum 140 characters) *
                </label>
                <textarea
                    rows={5}
                    value={data.business_description}
                    onChange={(e) =>
                        update("business_description", e.target.value)
                    }
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                        errors.business_description
                            ? "border-red-300"
                            : "border-gray-300"
                    }`}
                />
                <p className="text-xs text-gray-500">
                    {data.business_description.length} / 140 characters
                </p>
                {errors.business_description && (
                    <p className="text-sm text-red-600">
                        {errors.business_description}
                    </p>
                )}
            </div>

            {/* OBO */}
            <div className="mb-4">
                <label className="block text-sm font-medium">
                    Pay-ins / Payouts on behalf of (OBO) others? *
                </label>
                <select
                    value={data.obo_usage}
                    onChange={(e) => update("obo_usage", e.target.value)}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                        errors.obo_usage ? "border-red-300" : "border-gray-300"
                    }`}
                >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                </select>
                {errors.obo_usage && (
                    <p className="text-sm text-red-600">{errors.obo_usage}</p>
                )}
            </div>

            {/* Amounts */}
            {[
                ["monthly_volume_usd", "Expected monthly collection volumes (USD) *"],
                ["avg_transaction_usd", "Average transaction amount (USD) *"],
                ["max_transaction_usd", "Maximum transaction amount (USD) *"],
            ].map(([key, label]) => (
                <div className="mb-4" key={key}>
                    <label className="block text-sm font-medium">{label}</label>
                    <input
                        type="number"
                        min="0"
                        value={(data as any)[key]}
                        onChange={(e) => update(key, e.target.value)}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                            errors[key] ? "border-red-300" : "border-gray-300"
                        }`}
                    />
                    {errors[key] && (
                        <p className="text-sm text-red-600">
                            {(errors as any)[key]}
                        </p>
                    )}
                </div>
            ))}

            {/* Primary Purpose */}
            <div className="mb-4">
                <label className="block text-sm font-medium">
                    Primary purpose for using account *
                </label>
                <input
                    type="text"
                    value={data.primary_account_purpose}
                    onChange={(e) =>
                        update("primary_account_purpose", e.target.value)
                    }
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                        errors.primary_account_purpose
                            ? "border-red-300"
                            : "border-gray-300"
                    }`}
                />
                {errors.primary_account_purpose && (
                    <p className="text-sm text-red-600">
                        {errors.primary_account_purpose}
                    </p>
                )}
            </div>

            {/* Sender Geographies (FIXED AnimatedMulti) */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Sender Geographies *
                </label>

                <AnimatedMulti
                    selectOptions={geographies}
                    value={geographies.filter((o) =>
                        data.sender_geographies.includes(o.value)
                    )}
                    onChange={(values: Option[]) =>
                        update(
                            "sender_geographies",
                            values.map((v) => v.value)
                        )
                    }
                />

                {errors.sender_geographies && (
                    <p className="text-red-500 text-sm">
                        {errors.sender_geographies}
                    </p>
                )}
            </div>

            {/* Buttons */}
            <div className="mt-10 flex justify-between">
                <button
                    type="button"
                    onClick={() => goToStep("previous")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                        if (!validate()) return;

                        try {
                            await axios.post(
                                "/api/business-customer/step/business",
                                data
                            );

                            setFormData((prev: any) => ({
                                ...prev,
                                ...data,
                            }));

                            goToStep("collections");
                        } catch (err: any) {
                            console.error(err);
                            showError(
                                err.response?.data?.message ||
                                    "Unable to save business information."
                            );
                        }
                    }}
                    className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
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
