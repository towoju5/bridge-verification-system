
import React, { useState } from "react";
import axios from "axios";

export default function PayoutsTab({ formData, setFormData, saving, goToStep, showError }) {
    const empty = {
        payout_primary_purpose: "",
        beneficiary_geographies: [],
        beneficiary_industries: [],
        beneficiary_types: "",
        top_5_beneficiaries: [""],
        primary_payout_method: "",
        payout_currencies: [],
        current_payout_provider: "",
        reason_for_switching_payout: ""
    };

    const [local, setLocal] = useState(formData.payouts || empty);
    const [errors, setErrors] = useState({});

    const update = (k, v) => setLocal(s => ({ ...s, [k]: v }));

    const addBeneficiary = () => update("top_5_beneficiaries", [...local.top_5_beneficiaries, ""]);
    const removeBeneficiary = idx => update("top_5_beneficiaries", local.top_5_beneficiaries.filter((_, i) => i !== idx));
    const updateBeneficiary = (idx, v) => update("top_5_beneficiaries", local.top_5_beneficiaries.map((s, i) => i === idx ? v : s));

    const validate = () => {
        const e = {};
        if (!local.payout_primary_purpose) e.payout_primary_purpose = "Required";
        if (!local.beneficiary_types) e.beneficiary_types = "Required";
        if (!local.primary_payout_method) e.primary_payout_method = "Required";
        if (!local.payout_currencies.length) e.payout_currencies = "Select at least one currency";
        if (!local.beneficiary_geographies.length) e.beneficiary_geographies = "Select at least one geography";
        if (!local.top_5_beneficiaries.length) e.top_5_beneficiaries = "At least one beneficiary required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const save = async () => {
        if (!validate()) return;
        try {
            await axios.post("/api/business-customer/step/payouts", local);
            setFormData(s => ({ ...s, payouts: local }));
            goToStep("regulatory");
        } catch (err) {
            console.error(err);
            showError(err.response?.data?.message || "Unable to save payouts data");
        }
    };

    const industries = ["E-commerce", "Wholesale", "Retail", "Logistics", "Manufacturing", "Consulting"];
    const currencies = ["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "AED", "HKD"];
    const geographies = ["US", "UK", "NG", "KE", "ZA", "AE", "HK", "CA"];

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Payouts Information</h2>

            {/* Primary Purpose */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Primary Purpose *</label>
                <input
                    value={local.payout_primary_purpose}
                    onChange={e => update("payout_primary_purpose", e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white"
                />
                {errors.payout_primary_purpose && <p className="text-red-500 text-sm">{errors.payout_primary_purpose}</p>}
            </div>

            {/* Geographies */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Beneficiary Geographies *</label>
                <select
                    multiple
                    value={local.beneficiary_geographies}
                    onChange={e => update("beneficiary_geographies", [...e.target.selectedOptions].map(o => o.value))}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white"
                >
                    {geographies.map(g => <option key={g}>{g}</option>)}
                </select>
                {errors.beneficiary_geographies && <p className="text-red-500 text-sm">{errors.beneficiary_geographies}</p>}
            </div>

            {/* Industries */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Beneficiary Industries</label>
                <select
                    multiple
                    value={local.beneficiary_industries}
                    onChange={e => update("beneficiary_industries", [...e.target.selectedOptions].map(o => o.value))}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white"
                >
                    {industries.map(ind => <option key={ind}>{ind}</option>)}
                </select>
            </div>

            {/* Beneficiary Type */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Beneficiary Type *</label>
                <select
                    value={local.beneficiary_types}
                    onChange={e => update("beneficiary_types", e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white"
                >
                    <option value="">Select type</option>
                    <option value="individuals">Individuals</option>
                    <option value="business">Business</option>
                </select>
                {errors.beneficiary_types && <p className="text-red-500 text-sm">{errors.beneficiary_types}</p>}
            </div>

            {/* Top Beneficiaries */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Top 5 Beneficiaries *</label>

                {local.top_5_beneficiaries.map((b, i) => (
                    <div key={i} className="flex items-center mb-2">
                        <input
                            value={b}
                            onChange={e => updateBeneficiary(i, e.target.value)}
                            className="flex-1 border rounded p-2 dark:bg-gray-700 dark:text-white"
                        />
                        {local.top_5_beneficiaries.length > 1 &&
                            <button
                                className="ml-2 bg-red-600 text-white px-2 rounded"
                                onClick={() => removeBeneficiary(i)}
                            >X</button>}
                    </div>
                ))}
                <button className="bg-indigo-600 text-white px-3 py-1 rounded" onClick={addBeneficiary}>+ Add Beneficiary</button>
                {errors.top_5_beneficiaries && <p className="text-red-500 text-sm">{errors.top_5_beneficiaries}</p>}
            </div>

            {/* Payout Method */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Primary Payout Method *</label>
                <select
                    value={local.primary_payout_method}
                    onChange={e => update("primary_payout_method", e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white"
                >
                    <option value="">Select method</option>
                    <option value="ach">Local ACH</option>
                    <option value="swift">SWIFT</option>
                </select>
                {errors.primary_payout_method && <p className="text-red-500 text-sm">{errors.primary_payout_method}</p>}
            </div>

            {/* Payout Currencies */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Currencies Required *</label>
                <select
                    multiple
                    value={local.payout_currencies}
                    onChange={e => update("payout_currencies", [...e.target.selectedOptions].map(o => o.value))}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text-white"
                >
                    {currencies.map(c => <option key={c}>{c}</option>)}
                </select>
                {errors.payout_currencies && <p className="text-red-500 text-sm">{errors.payout_currencies}</p>}
            </div>

            {/* Current Provider */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Current Payout Provider</label>
                <input
                    value={local.current_payout_provider}
                    onChange={e => update("current_payout_provider", e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text:white"
                />
            </div>

            {/* Reason for Switching */}
            <div className="mb-4">
                <label className="block text-sm mb-1">Reason for Switching</label>
                <textarea
                    value={local.reason_for_switching_payout}
                    onChange={e => update("reason_for_switching_payout", e.target.value)}
                    className="w-full border rounded p-2 dark:bg-gray-700 dark:text:white"
                />
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-6">
                <button onClick={() => goToStep("collections")} className="px-6 py-2 bg-gray-300 rounded">Previous</button>
                <button onClick={save} className="px-6 py-2 bg-indigo-600 text-white rounded">Next</button>
            </div>
        </div>
    );
}
