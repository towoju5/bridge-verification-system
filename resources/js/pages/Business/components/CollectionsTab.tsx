import React, { useState } from "react";
import axios from "axios";

export default function CollectionsTab({ formData, setFormData, saving, goToStep, showError }) {
    const empty = {
        sender_industries: [],
        sender_types: "",
        top_5_senders: [""],
        incoming_from_fintech_wallets: false,
        incoming_fintech_wallet_details: "",
        collection_currencies: [],
        current_collection_provider: "",
        reason_for_switching_collection: "",
        expected_monthly_disbursement_usd: "",
        avg_transaction_amount_collection: "",
        max_transaction_amount_collection: ""
    };

    const [local, setLocal] = useState(formData.collections || empty);
    const [errors, setErrors] = useState({});

    const update = (k, v) => setLocal(s => ({ ...s, [k]: v }));

    const addSender = () => update("top_5_senders", [...local.top_5_senders, ""]);
    const removeSender = idx => update("top_5_senders", local.top_5_senders.filter((_, i) => i !== idx));
    const updateSender = (idx, v) => update("top_5_senders", local.top_5_senders.map((s, i) => i === idx ? v : s));

    const validate = () => {
        const e = {};
        if (!local.sender_types) e.sender_types = "Required";
        if (!local.top_5_senders.length) e.top_5_senders = "At least one sender required";
        if (!local.collection_currencies.length) e.collection_currencies = "Select at least one currency";
        if (!local.expected_monthly_disbursement_usd) e.expected_monthly_disbursement_usd = "Required";
        if (!local.avg_transaction_amount_collection) e.avg_transaction_amount_collection = "Required";
        if (!local.max_transaction_amount_collection) e.max_transaction_amount_collection = "Required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const save = async () => {
        if (!validate()) return;

        try {
            await axios.post("/api/business-customer/step/collections", local);
            setFormData(s => ({ ...s, collections: local }));
            goToStep("payouts");
        } catch (err) {
            console.error(err);
            showError(err.response?.data?.message || "Unable to save collections data");
        }
    };

    const industries = ["E-commerce", "Wholesale", "Retail", "Logistics", "Manufacturing", "Consulting"];
    const currencies = ["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "AED", "HKD"];

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Collections Information</h2>

            {/* Sender Industries */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Sender Industries</label>
                <select multiple value={local.sender_industries} onChange={e => update("sender_industries", [...e.target.selectedOptions].map(o => o.value))}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white">
                    {industries.map(x => <option key={x}>{x}</option>)}
                </select>
            </div>

            {/* Sender Type */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Sender Type *</label>
                <select value={local.sender_types} onChange={e => update("sender_types", e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white">
                    <option value="">Select type</option>
                    <option value="individuals">Individuals</option>
                    <option value="business">Business</option>
                </select>
                {errors.sender_types && <p className="text-red-500 text-sm">{errors.sender_types}</p>}
            </div>

            {/* Top 5 Senders */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Top 5 Senders *</label>
                {local.top_5_senders.map((s, i) => (
                    <div key={i} className="flex items-center mb-2">
                        <input value={s} onChange={e => updateSender(i, e.target.value)}
                            className="flex-1 border rounded p-2 dark:bg-gray-700 dark:text-white" />
                        {local.top_5_senders.length > 1 &&
                            <button className="ml-2 bg-red-600 text-white px-2 rounded" onClick={() => removeSender(i)}>X</button>}
                    </div>
                ))}
                <button className="bg-indigo-600 text-white px-3 py-1 rounded" onClick={addSender}>+ Add Sender</button>
                {errors.top_5_senders && <p className="text-red-500 text-sm">{errors.top_5_senders}</p>}
            </div>

            {/* Fintech Wallets */}
            <div className="mb-4">
                <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={local.incoming_from_fintech_wallets}
                        onChange={e => update("incoming_from_fintech_wallets", e.target.checked)} />
                    <span>Expect incoming payins from fintech wallets?</span>
                </label>

                {local.incoming_from_fintech_wallets &&
                    <textarea value={local.incoming_fintech_wallet_details}
                        onChange={e => update("incoming_fintech_wallet_details", e.target.value)}
                        className="w-full border rounded p-2 mt-2 dark:bg-gray-700 dark:text-white"
                        placeholder="Provide details..."
                    />}
            </div>

            {/* Collection Currencies */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Currencies Required *</label>
                <select multiple value={local.collection_currencies} onChange={e => update("collection_currencies", [...e.target.selectedOptions].map(o => o.value))}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white">
                    {currencies.map(c => <option key={c}>{c}</option>)}
                </select>
                {errors.collection_currencies && <p className="text-red-500 text-sm">{errors.collection_currencies}</p>}
            </div>

            {/* Provider */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Current Collection Provider</label>
                <input value={local.current_collection_provider} onChange={e => update("current_collection_provider", e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" />
            </div>

            {/* Reason for switching */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Reason for Switching</label>
                <textarea value={local.reason_for_switching_collection}
                    onChange={e => update("reason_for_switching_collection", e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" />
            </div>

            {/* Expected monthly disbursement */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <input type="number" placeholder="Expected Monthly Disbursement *" value={local.expected_monthly_disbursement_usd}
                    onChange={e => update("expected_monthly_disbursement_usd", e.target.value)}
                    className="border rounded p-2 dark:bg-gray-700 dark:text-white" />

                <input type="number" placeholder="Avg Transaction Amount *" value={local.avg_transaction_amount_collection}
                    onChange={e => update("avg_transaction_amount_collection", e.target.value)}
                    className="border rounded p-2 dark:bg-gray-700 dark:text-white" />

                <input type="number" placeholder="Max Transaction Amount *" value={local.max_transaction_amount_collection}
                    onChange={e => update("max_transaction_amount_collection", e.target.value)}
                    className="border rounded p-2 dark:bg-gray-700 dark:text-white" />
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-6">
                <button onClick={() => goToStep("financial")} className="px-6 py-2 bg-gray-300 rounded">Previous</button>
                <button onClick={save} className="px-6 py-2 bg-indigo-600 text-white rounded">Next</button>
            </div>
        </div>
    );
}
