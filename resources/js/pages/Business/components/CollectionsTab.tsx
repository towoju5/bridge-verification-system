import React, { useState } from "react";
import axios from "axios";
import AnimatedMulti from "../shared/AnimatedMulti";

interface Option {
    value: string;
    label: string;
}

export default function CollectionsTab({
    formData,
    setFormData,
    saving,
    goToStep,
    showError,
}) {
    const empty = {
        sender_industries: [] as string[],
        sender_types: "",
        top_5_senders: [""],
        incoming_from_fintech_wallets: false,
        incoming_fintech_wallet_details: "",
        collection_currencies: [] as string[],
        current_collection_provider: "",
        reason_for_switching_collection: "",
        expected_monthly_disbursement_usd: "",
        avg_transaction_amount_collection: "",
        max_transaction_amount_collection: "",
    };

    const [local, setLocal] = useState(formData.collections || empty);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const update = (k: string, v: any) =>
        setLocal((s) => ({ ...s, [k]: v }));

    const addSender = () =>
        update("top_5_senders", [...local.top_5_senders, ""]);

    const removeSender = (idx: number) =>
        update(
            "top_5_senders",
            local.top_5_senders.filter((_, i) => i !== idx)
        );

    const updateSender = (idx: number, v: string) =>
        update(
            "top_5_senders",
            local.top_5_senders.map((s, i) => (i === idx ? v : s))
        );

    const validate = () => {
        const e: Record<string, string> = {};

        if (!local.sender_industries.length)
            e.sender_industries = "Select at least one industry";

        if (!local.sender_types)
            e.sender_types = "Required";

        if (!local.top_5_senders.filter(Boolean).length)
            e.top_5_senders = "At least one sender required";

        if (!local.collection_currencies.length)
            e.collection_currencies = "Select at least one currency";

        if (!local.expected_monthly_disbursement_usd)
            e.expected_monthly_disbursement_usd = "Required";

        if (!local.avg_transaction_amount_collection)
            e.avg_transaction_amount_collection = "Required";

        if (!local.max_transaction_amount_collection)
            e.max_transaction_amount_collection = "Required";

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const save = async () => {
        if (!validate()) return;

        try {
            await axios.post("/api/business-customer/step/collections", local);
            setFormData((s) => ({ ...s, collections: local }));
            goToStep("payouts");
        } catch (err: any) {
            console.error(err);
            showError(
                err.response?.data?.message ||
                "Unable to save collections data"
            );
        }
    };

    const industries: Option[] = [
        { value: "E-commerce", label: "E-commerce" },
        { value: "Wholesale", label: "Wholesale" },
        { value: "Retail", label: "Retail" },
        { value: "Logistics", label: "Logistics" },
        { value: "Manufacturing", label: "Manufacturing" },
        { value: "Consulting", label: "Consulting" },
        { value: "Others", label: "Others"}
    ];

    const currencies: Option[] = [
        { value: "USD", label: "USD" },
        { value: "EUR", label: "EUR" },
        { value: "GBP", label: "GBP" },
        { value: "NGN", label: "NGN" },
        { value: "KES", label: "KES" },
        { value: "ZAR", label: "ZAR" },
        { value: "AED", label: "AED" },
        { value: "HKD", label: "HKD" },
    ];

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-semibold mb-6">
                Collections Information
            </h2>

            {/* Sender Industries */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Sender Industries *
                </label>
                <AnimatedMulti
                    selectOptions={industries}
                    value={industries.filter((o) =>
                        local.sender_industries.includes(o.value)
                    )}
                    onChange={(values: Option[]) =>
                        update(
                            "sender_industries",
                            values.map((v) => v.value)
                        )
                    }
                />
                {errors.sender_industries && (
                    <p className="text-red-500 text-sm">
                        {errors.sender_industries}
                    </p>
                )}
            </div>

            {/* Sender Type */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Sender Type *
                </label>
                <select
                    value={local.sender_types}
                    onChange={(e) =>
                        update("sender_types", e.target.value)
                    }
                    className="w-full border rounded p-2"
                >
                    <option value="">Select type</option>
                    <option value="individuals">Individuals</option>
                    <option value="business">Business</option>
                </select>
                {errors.sender_types && (
                    <p className="text-red-500 text-sm">
                        {errors.sender_types}
                    </p>
                )}
            </div>

            {/* Top Senders */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Top 5 Senders *
                </label>
                {local.top_5_senders.map((s, i) => (
                    <div key={i} className="flex mb-2">
                        <input
                            value={s}
                            onChange={(e) =>
                                updateSender(i, e.target.value)
                            }
                            className="flex-1 border rounded p-2"
                        />
                        {local.top_5_senders.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeSender(i)}
                                className="ml-2 bg-red-600 text-white px-2 rounded"
                            >
                                X
                            </button>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addSender}
                    className="bg-indigo-600 text-white px-3 py-1 rounded"
                >
                    + Add Sender
                </button>
                {errors.top_5_senders && (
                    <p className="text-red-500 text-sm">
                        {errors.top_5_senders}
                    </p>
                )}
            </div>

            {/* Collection Currencies */}
            <div className="mb-4">
                <label className="block text-sm mb-1">
                    Currencies Required *
                </label>
                <AnimatedMulti
                    selectOptions={currencies}
                    value={currencies.filter((o) =>
                        local.collection_currencies.includes(o.value)
                    )}
                    onChange={(values: Option[]) =>
                        update(
                            "collection_currencies",
                            values.map((v) => v.value)
                        )
                    }
                />
                {errors.collection_currencies && (
                    <p className="text-red-500 text-sm">
                        {errors.collection_currencies}
                    </p>
                )}
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <input
                    type="number"
                    placeholder="Expected Monthly Disbursement *"
                    value={local.expected_monthly_disbursement_usd}
                    onChange={(e) =>
                        update(
                            "expected_monthly_disbursement_usd",
                            e.target.value
                        )
                    }
                    className="border rounded p-2"
                />

                <input
                    type="number"
                    placeholder="Avg Transaction Amount *"
                    value={local.avg_transaction_amount_collection}
                    onChange={(e) =>
                        update(
                            "avg_transaction_amount_collection",
                            e.target.value
                        )
                    }
                    className="border rounded p-2"
                />

                <input
                    type="number"
                    placeholder="Max Transaction Amount *"
                    value={local.max_transaction_amount_collection}
                    onChange={(e) =>
                        update(
                            "max_transaction_amount_collection",
                            e.target.value
                        )
                    }
                    className="border rounded p-2"
                />
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-6">
                <button
                    onClick={() => goToStep("financial")}
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
