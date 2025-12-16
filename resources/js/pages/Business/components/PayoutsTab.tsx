import React, { useState } from "react";
import axios from "axios";
import AnimatedMulti, { SelectOption } from "../shared/AnimatedMulti";

export default function PayoutsTab({
    formData,
    setFormData,
    saving,
    goToStep,
    showError,
}) {
    const empty = {
        payout_primary_purpose: "",
        beneficiary_geographies: [] as string[],
        beneficiary_industries: [] as string[],
        beneficiary_types: "",
        top_5_beneficiaries: [""],
        primary_payout_method: "",
        payout_currencies: [] as string[],
        current_payout_provider: "",
        reason_for_switching_payout: "",
    };

    const [local, setLocal] = useState(formData.payouts || empty);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const update = (k: string, v: any) =>
        setLocal((s) => ({ ...s, [k]: v }));

    const addBeneficiary = () =>
        update("top_5_beneficiaries", [...local.top_5_beneficiaries, ""]);

    const removeBeneficiary = (idx: number) =>
        update(
            "top_5_beneficiaries",
            local.top_5_beneficiaries.filter((_, i) => i !== idx)
        );

    const updateBeneficiary = (idx: number, v: string) =>
        update(
            "top_5_beneficiaries",
            local.top_5_beneficiaries.map((b, i) =>
                i === idx ? v : b
            )
        );

    const validate = () => {
        const e: Record<string, string> = {};

        if (!local.payout_primary_purpose)
            e.payout_primary_purpose = "Required";

        if (!local.beneficiary_types)
            e.beneficiary_types = "Required";

        if (!local.primary_payout_method)
            e.primary_payout_method = "Required";

        if (!local.payout_currencies.length)
            e.payout_currencies = "Select at least one currency";

        if (!local.beneficiary_geographies.length)
            e.beneficiary_geographies = "Select at least one geography";

        if (!local.top_5_beneficiaries.filter(Boolean).length)
            e.top_5_beneficiaries = "At least one beneficiary required";

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const save = async () => {
        if (!validate()) return;

        try {
            await axios.post(
                "/api/business-customer/step/payouts",
                local
            );
            setFormData((s) => ({ ...s, payouts: local }));
            goToStep("extra_documents");
        } catch (err: any) {
            console.error(err);
            showError(
                err.response?.data?.message ||
                "Unable to save payouts data"
            );
        }
    };

    /* ===== Options ===== */

    const industries: SelectOption[] = [
        { value: "E-commerce", label: "E-commerce" },
        { value: "Wholesale", label: "Wholesale" },
        { value: "Retail", label: "Retail" },
        { value: "Logistics", label: "Logistics" },
        { value: "Manufacturing", label: "Manufacturing" },
        { value: "Consulting", label: "Consulting" },
    ];

    const currencies: SelectOption[] = [
        { value: "USD", label: "USD" },
        { value: "EUR", label: "EUR" },
        { value: "GBP", label: "GBP" },
        { value: "NGN", label: "NGN" },
        { value: "KES", label: "KES" },
        { value: "ZAR", label: "ZAR" },
        { value: "AED", label: "AED" },
        { value: "HKD", label: "HKD" },
    ];

    const geographies: SelectOption[] = [
        { value: "US", label: "United States" },
        { value: "UK", label: "United Kingdom" },
        { value: "NG", label: "Nigeria" },
        { value: "KE", label: "Kenya" },
        { value: "ZA", label: "South Africa" },
        { value: "AE", label: "UAE" },
        { value: "HK", label: "Hong Kong" },
        { value: "CA", label: "Canada" },
    ];

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-semibold mb-6">
                Payouts Information
            </h2>

            {/* Primary Purpose */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Primary Purpose *
                </label>
                <input
                    value={local.payout_primary_purpose}
                    onChange={(e) =>
                        update(
                            "payout_primary_purpose",
                            e.target.value
                        )
                    }
                    className="w-full border rounded p-2"
                />
                {errors.payout_primary_purpose && (
                    <p className="text-red-500 text-sm">
                        {errors.payout_primary_purpose}
                    </p>
                )}
            </div>

            {/* Beneficiary Geographies */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Beneficiary Geographies *
                </label>
                <AnimatedMulti
                    selectOptions={geographies}
                    value={geographies.filter((o) =>
                        local.beneficiary_geographies.includes(
                            o.value
                        )
                    )}
                    onChange={(values) =>
                        update(
                            "beneficiary_geographies",
                            values.map((v) => v.value)
                        )
                    }
                />
                {errors.beneficiary_geographies && (
                    <p className="text-red-500 text-sm">
                        {errors.beneficiary_geographies}
                    </p>
                )}
            </div>

            {/* Beneficiary Industries */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Beneficiary Industries
                </label>
                <AnimatedMulti
                    selectOptions={industries}
                    value={industries.filter((o) =>
                        local.beneficiary_industries.includes(
                            o.value
                        )
                    )}
                    onChange={(values) =>
                        update(
                            "beneficiary_industries",
                            values.map((v) => v.value)
                        )
                    }
                />
            </div>

            {/* Beneficiary Type */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Beneficiary Type *
                </label>
                <select
                    value={local.beneficiary_types}
                    onChange={(e) =>
                        update(
                            "beneficiary_types",
                            e.target.value
                        )
                    }
                    className="w-full border rounded p-2"
                >
                    <option value="">Select type</option>
                    <option value="individuals">Individuals</option>
                    <option value="business">Business</option>
                </select>
                {errors.beneficiary_types && (
                    <p className="text-red-500 text-sm">
                        {errors.beneficiary_types}
                    </p>
                )}
            </div>

            {/* Top Beneficiaries */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Top 5 Beneficiaries *
                </label>

                {local.top_5_beneficiaries.map((b, i) => (
                    <div key={i} className="flex mb-2">
                        <input
                            value={b}
                            onChange={(e) =>
                                updateBeneficiary(
                                    i,
                                    e.target.value
                                )
                            }
                            className="flex-1 border rounded p-2"
                        />
                        {local.top_5_beneficiaries.length >
                            1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        removeBeneficiary(i)
                                    }
                                    className="ml-2 bg-red-600 text-white px-2 rounded"
                                >
                                    X
                                </button>
                            )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addBeneficiary}
                    className="bg-indigo-600 text-white px-3 py-1 rounded"
                >
                    + Add Beneficiary
                </button>
                {errors.top_5_beneficiaries && (
                    <p className="text-red-500 text-sm">
                        {errors.top_5_beneficiaries}
                    </p>
                )}
            </div>

            {/* Payout Method */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Primary Payout Method *
                </label>
                <select
                    value={local.primary_payout_method}
                    onChange={(e) =>
                        update(
                            "primary_payout_method",
                            e.target.value
                        )
                    }
                    className="w-full border rounded p-2"
                >
                    <option value="">Select method</option>
                    <option value="ach">Local ACH</option>
                    <option value="swift">SWIFT</option>
                </select>
                {errors.primary_payout_method && (
                    <p className="text-red-500 text-sm">
                        {errors.primary_payout_method}
                    </p>
                )}
            </div>

            {/* Payout Currencies */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Currencies Required *
                </label>
                <AnimatedMulti
                    selectOptions={currencies}
                    value={currencies.filter((o) =>
                        local.payout_currencies.includes(
                            o.value
                        )
                    )}
                    onChange={(values) =>
                        update(
                            "payout_currencies",
                            values.map((v) => v.value)
                        )
                    }
                />
                {errors.payout_currencies && (
                    <p className="text-red-500 text-sm">
                        {errors.payout_currencies}
                    </p>
                )}
            </div>

            {/* Current Provider */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Current Payout Provider
                </label>
                <input
                    value={local.current_payout_provider}
                    onChange={(e) =>
                        update(
                            "current_payout_provider",
                            e.target.value
                        )
                    }
                    className="w-full border rounded p-2"
                />
            </div>

            {/* Reason for Switching */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Reason for Switching
                </label>
                <textarea
                    value={local.reason_for_switching_payout}
                    onChange={(e) =>
                        update(
                            "reason_for_switching_payout",
                            e.target.value
                        )
                    }
                    className="w-full border rounded p-2"
                />
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-6">
                <button
                    onClick={() => goToStep("collections")}
                    className="px-6 py-2 bg-gray-300 rounded"
                >
                    Previous
                </button>
                <button
                    onClick={save}
                    disabled={saving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
