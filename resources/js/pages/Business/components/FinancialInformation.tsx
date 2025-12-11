import React, { useState } from "react";
import axios from "axios";

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    saving: boolean;
    goToStep: (step: string) => void;
    showError: (msg: string) => void;
}

export default function FinancialInformation({
    formData,
    setFormData,
    saving,
    goToStep,
    showError,
}: Props) {
    const [local, setLocal] = useState({
        account_purpose: formData.account_purpose || "",
        account_purpose_other: formData.account_purpose_other || "",
        source_of_funds: formData.source_of_funds || "",
        high_risk_activities: formData.high_risk_activities || [],
        high_risk_activities_explanation:
            formData.high_risk_activities_explanation || "",
        conducts_money_services: formData.conducts_money_services || false,
        conducts_money_services_description:
            formData.conducts_money_services_description || "",
        compliance_screening_explanation:
            formData.compliance_screening_explanation || "",
        estimated_annual_revenue_usd:
            formData.estimated_annual_revenue_usd || "",
        expected_monthly_payments_usd:
            formData.expected_monthly_payments_usd || "",
        operates_in_prohibited_countries:
            formData.operates_in_prohibited_countries || "",
        ownership_threshold: formData.ownership_threshold || "",
        has_material_intermediary_ownership:
            formData.has_material_intermediary_ownership || false,
    });


    const sourceOfFunds = {
        CompanyFunds: "Company Funds",
        EcommerceReseller: "Ecommerce Reseller",
        GamblingProceeds: "Gambling Proceeds",
        Gifts: "Gifts",
        GovernmentBenefits: "Government Benefits",
        Inheritance: "Inheritance",
        InvestmentsLoans: "Investments Loans",
        PensionRetirement: "Pension Retirement",
        Salary: "Salary",
        SaleOfAssetsRealEstate: "Sale Of Assets or Real Estate",
        Savings: "Savings",
        SomeoneElsesFunds: "Someone Else's Funds",
    };

    const accountPurposes = {
        'CharitableDonations': 'Charitable Donations',
        'EcommerceRetailPayments': 'Ecommerce Retail Payments',
        'InvestmentPurposes': 'Investment Purposes',
        'OperatingACompany': 'Operating a Company',
        'Other': 'Other',
        'PaymentsToFriendsOrFamilyAbroad': 'Payments To Friends Or Family Abroad',
        'personalOrLivingExpenses': 'personal Or Living Expenses',
        'ProtectWealth': 'Protect Wealth',
        'PurchaseGoodsAndServices': 'Purchase Goods and Services',
        'ReceivePaymentForFreelancing': 'Receive Payment for Freelancing',
        'ReceiveSalary': 'Receive Salary',
    }

    // console.log(accountPurposes);


    const [errors, setErrors] = useState<Record<string, string>>({});

    /** -------------------------------------------
     * Helpers
     * ------------------------------------------- */
    const update = (field: string, value: any) => {
        setLocal((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const toggleHighRisk = (value: string) => {
        const exists = local.high_risk_activities.includes(value);
        const list = exists
            ? local.high_risk_activities.filter((v: string) => v !== value)
            : [...local.high_risk_activities, value];

        update("high_risk_activities", list);
    };

    /** -------------------------------------------
     * Validation
     * ------------------------------------------- */
    const validate = () => {
        const e: Record<string, string> = {};

        if (!local.account_purpose)
            e.account_purpose = "Account purpose is required.";

        if (local.account_purpose === "Other" && !local.account_purpose_other)
            e.account_purpose_other = "Specify other account purpose.";

        if (!local.source_of_funds)
            e.source_of_funds = "Source of funds is required.";

        if (
            local.high_risk_activities.length > 0 &&
            !local.high_risk_activities_explanation.trim()
        )
            e.high_risk_activities_explanation =
                "Explain high-risk activities.";

        if (local.conducts_money_services) {
            if (!local.conducts_money_services_description.trim())
                e.conducts_money_services_description =
                    "Describe money service activities.";

            if (!local.compliance_screening_explanation.trim())
                e.compliance_screening_explanation =
                    "Provide compliance screening explanation.";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /** -------------------------------------------
     * Submit step
     * ------------------------------------------- */
    const save = async () => {
        if (!validate()) return;

        try {
            await axios.post("/api/business-customer/step/4", local);

            setFormData((prev: any) => ({ ...prev, ...local }));
            goToStep("regulatory");
        } catch (err: any) {
            console.error(err);
            showError(
                err.response?.data?.message ||
                "Unable to save financial information."
            );
        }
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
                Financial Information
            </h2>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                {/* Account Purpose */}
                <div className="sm:col-span-2">
                    <label className="text-sm font-medium">Account Purpose *</label>
                    <select
                        value={local.account_purpose}
                        onChange={(e) =>
                            update("account_purpose", e.target.value)
                        }
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors.account_purpose ? "border-red-300" : "border-gray-300"
                            }`}
                    >
                        <option value="">Select</option>
                        {Object.entries(accountPurposes).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>

                    {local.account_purpose === "Other" && (
                        <input
                            placeholder="Specify Purpose"
                            value={local.account_purpose_other}
                            onChange={(e) =>
                                update("account_purpose_other", e.target.value)
                            }
                            className={`mt-2 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.account_purpose_other
                                ? "border-red-300"
                                : "border-gray-300"
                                }`}
                        />
                    )}

                    {errors.account_purpose && (
                        <p className="text-red-600 text-sm">
                            {errors.account_purpose}
                        </p>
                    )}
                </div>

                {/* Source of Funds */}

                <div>
                    <label className="text-sm font-medium">Source of Funds *</label>
                    <select
                        value={local.source_of_funds}
                        onChange={(e) => update("source_of_funds", e.target.value)}
                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors.source_of_funds ? "border-red-300" : "border-gray-300"
                            }`}
                    >
                        <option value="">Select</option>
                        {Object.entries(sourceOfFunds).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                    {errors.source_of_funds && (
                        <p className="text-red-600 text-sm">{errors.source_of_funds}</p>
                    )}
                </div>

                {/* High Risk Activities */}
                <div className="sm:col-span-2">
                    <label className="text-sm font-medium">
                        High Risk Activities (select if applicable)
                    </label>
                    <div className="mt-2 flex flex-wrap gap-3">
                        {['adult_entertainment', 'gambling', 'hold_client_funds', 'investment_services',
                            'lending_banking', 'marijuana_or_related_services', 'money_services',
                            'nicotine_tobacco_or_related_services', 'operate_foreign_exchange_virtual_currencies_brokerage_otc',
                            'pharmaceuticals', 'precious_metals_precious_stones_jewelry', 'safe_deposit_box_rentals',
                            'third_party_payment_processing', 'weapons_firearms_and_explosives', 'none_of_the_above'
                        ].map((item) => (
                            <label key={item} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={local.high_risk_activities.includes(item)}
                                    onChange={() => toggleHighRisk(item)}
                                    className="h-4 w-4 text-indigo-600"
                                />
                                <span className="text-sm capitalize">{item.replaceAll("_", " ")}</span>
                            </label>
                        ))}
                    </div>

                    {local.high_risk_activities.length > 0 && (
                        <textarea
                            rows={3}
                            placeholder="Explain high-risk activities..."
                            value={local.high_risk_activities_explanation}
                            onChange={(e) =>
                                update(
                                    "high_risk_activities_explanation",
                                    e.target.value
                                )
                            }
                            className={`mt-3 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.high_risk_activities_explanation
                                ? "border-red-300"
                                : "border-gray-300"
                                }`}
                        />
                    )}

                    {errors.high_risk_activities_explanation && (
                        <p className="text-red-600 text-sm">
                            {errors.high_risk_activities_explanation}
                        </p>
                    )}
                </div>

                {/* Conducts Money Services */}
                <div className="sm:col-span-2 mt-6">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={local.conducts_money_services}
                            onChange={(e) =>
                                update("conducts_money_services", e.target.checked)
                            }
                            className="h-4 w-4 text-indigo-600"
                        />
                        <span className="text-sm">
                            Does the business conduct money service activities?
                        </span>
                    </label>

                    {local.conducts_money_services && (
                        <>
                            <textarea
                                rows={3}
                                placeholder="Describe money service activities"
                                value={local.conducts_money_services_description}
                                onChange={(e) =>
                                    update(
                                        "conducts_money_services_description",
                                        e.target.value
                                    )
                                }
                                className={`mt-3 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.conducts_money_services_description
                                    ? "border-red-300"
                                    : "border-gray-300"
                                    }`}
                            />

                            {errors.conducts_money_services_description && (
                                <p className="text-red-600 text-sm">
                                    {errors.conducts_money_services_description}
                                </p>
                            )}

                            <textarea
                                rows={3}
                                placeholder="Compliance screening explanation"
                                value={local.compliance_screening_explanation}
                                onChange={(e) =>
                                    update(
                                        "compliance_screening_explanation",
                                        e.target.value
                                    )
                                }
                                className={`mt-3 block w-full border rounded-md shadow-sm py-2 px-3 ${errors.compliance_screening_explanation
                                    ? "border-red-300"
                                    : "border-gray-300"
                                    }`}
                            />

                            {errors.compliance_screening_explanation && (
                                <p className="text-red-600 text-sm">
                                    {errors.compliance_screening_explanation}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Revenue */}
                <div>
                    <label className="text-sm font-medium">
                        Estimated Annual Revenue (USD)
                    </label>
                    <input
                        type="number"
                        value={local.estimated_annual_revenue_usd}
                        onChange={(e) =>
                            update("estimated_annual_revenue_usd", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>

                {/* Monthly Payments */}
                <div>
                    <label className="text-sm font-medium">
                        Expected Monthly Payments (USD)
                    </label>
                    <input
                        type="number"
                        value={local.expected_monthly_payments_usd}
                        onChange={(e) =>
                            update("expected_monthly_payments_usd", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>

                {/* Prohibited Country */}
                <div>
                    <label className="text-sm font-medium">
                        Operates in Prohibited Countries?
                    </label>
                    <select
                        value={local.operates_in_prohibited_countries}
                        onChange={(e) =>
                            update("operates_in_prohibited_countries", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>

                {/* Ownership Threshold */}
                <div>
                    <label className="text-sm font-medium">Ownership Threshold</label>
                    <input
                        type="number"
                        value={local.ownership_threshold}
                        min={5}
                        max={100}
                        onChange={(e) =>
                            update("ownership_threshold", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    />
                </div>

                {/* Material Intermediary Ownership */}
                <div className="sm:col-span-2 mt-6">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={local.has_material_intermediary_ownership}
                            onChange={(e) =>
                                update(
                                    "has_material_intermediary_ownership",
                                    e.target.checked
                                )
                            }
                            className="h-4 w-4 text-indigo-600"
                        />
                        <span className="text-sm">Has Material Intermediary Ownership?</span>
                    </label>
                </div>
            </div>

            {/* BUTTONS */}
            <div className="mt-10 flex justify-between">
                {/* PREVIOUS */}
                <button
                    onClick={() => goToStep("persons")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                {/* NEXT */}
                <button
                    onClick={save}
                    disabled={saving}
                    className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                        ${saving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}
                    `}
                >
                    {saving ? "Saving..." : "Next"}
                </button>
            </div>
        </div>
    );
}
