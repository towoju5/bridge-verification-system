import React, { useState } from "react";
import axios from "axios";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  saving: boolean;
  goToStep: (step: string) => void;
  showError: (msg: string) => void;
}

export default function BusinessInfo({
  formData,
  setFormData,
  saving,
  goToStep,
  showError,
}: Props) {
  const [local, setLocal] = useState({
    business_legal_name: formData.business_legal_name || "",
    business_trade_name: formData.business_trade_name || "",
    business_description: formData.business_description || "",
    email: formData.email || "",
    business_type: formData.business_type || "",
    registration_number: formData.registration_number || "",
    tax_id: formData.tax_id || "",
    incorporation_date: formData.incorporation_date || "",
    phone_calling_code: formData.phone_calling_code || "",
    phone_number: formData.phone_number || "",
    business_industry: formData.business_industry || "",
    primary_website: formData.primary_website || "",
    is_dao: formData.is_dao || false,
    statement_descriptor: formData.statement_descriptor || "",
  });


  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: any) => {
    setLocal((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  /** -------------------------------------------
   * Validate required fields before submission
   * ------------------------------------------- */
  const validate = () => {
    const e: Record<string, string> = {};

    if (!local.business_legal_name.trim())
      e.business_legal_name = "Legal name is required.";

    if (!local.business_trade_name.trim())
      e.business_trade_name = "Trade name is required.";

    if (!local.business_description.trim())
      e.business_description = "Business description is required.";

    if (!local.email.trim())
      e.email = "Email is required.";

    if (!local.business_type.trim())
      e.business_type = "Business type is required.";

    if (!local.registration_number.trim())
      e.registration_number = "Registration number is required.";

    if (!local.phone_calling_code) {
      errors.phone_calling_code = 'Required';
    } else if (!/^\+[1-9]\d{0,3}$/.test(local.phone_calling_code)) {
      errors.phone_calling_code = 'Invalid calling code (e.g. +234)';
    }

    if (!local.incorporation_date.trim())
      e.incorporation_date = "Incorporation date is required.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** -------------------------------------------
   * Submit step 1
   * ------------------------------------------- */
  const save = async () => {
    if (!validate()) return;

    try {
      const payload = { ...local };

      await axios.post("/api/business-customer/step/1", payload);

      setFormData((prev: any) => ({ ...prev, ...local }));
      goToStep("collections");
    } catch (err: any) {
      console.error(err);
      showError(err.response?.data?.message || "Unable to save step 1.");
    }
  };

  return (
    <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Business Information
      </h2>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        {/* Legal Name */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-white">
            Legal Business Name *
          </label>
          <input
            value={local.business_legal_name}
            onChange={(e) => update("business_legal_name", e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 
                            ${errors.business_legal_name ? "border-red-300" : "border-gray-300"}
                        `}
          />
          {errors.business_legal_name && (
            <p className="text-red-600 text-sm">{errors.business_legal_name}</p>
          )}
        </div>

        {/* Trade Name */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-white">
            Trade Name *
          </label>
          <input
            value={local.business_trade_name}
            onChange={(e) => update("business_trade_name", e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600
                            ${errors.business_trade_name ? "border-red-300" : "border-gray-300"}
                        `}
          />
          {errors.business_trade_name && (
            <p className="text-red-600 text-sm">{errors.business_trade_name}</p>
          )}
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Business Description *</label>
          <textarea
            rows={3}
            value={local.business_description}
            onChange={(e) => update("business_description", e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600
                            ${errors.business_description ? "border-red-300" : "border-gray-300"}
                        `}
          />
          {errors.business_description && (
            <p className="text-red-600 text-sm">{errors.business_description}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium">Email *</label>
          <input
            type="email"
            value={local.email}
            onChange={(e) => update("email", e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600
                            ${errors.email ? "border-red-300" : "border-gray-300"}
                        `}
          />
          {errors.email && (
            <p className="text-red-600 text-sm">{errors.email}</p>
          )}
        </div>

        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium">Business Type *</label>
          <select
            value={local.business_type}
            onChange={(e) => update("business_type", e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600
                            ${errors.business_type ? "border-red-300" : "border-gray-300"}
                        `}
          >
            <option value="">Select type</option>
            <option value="cooperative">Cooperative</option>
            <option value="corporation">Corporation</option>
            <option value="llc">LLC</option>
            <option value="partnership">Partnership</option>
            <option value="sole_prop">Sole Proprietor</option>
            <option value="trust">Trust</option>
            <option value="other">Other</option>
          </select>
          {errors.business_type && (
            <p className="text-red-600 text-sm">{errors.business_type}</p>
          )}
        </div>

        {/* Registration Number */}
        <div>
          <label className="block text-sm font-medium">
            Registration Number *
          </label>
          <input
            value={local.registration_number}
            onChange={(e) => update("registration_number", e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600
                            ${errors.registration_number ? "border-red-300" : "border-gray-300"}
                        `}
          />
          {errors.registration_number && (
            <p className="text-red-600 text-sm">{errors.registration_number}</p>
          )}
        </div>

        {/* Tax ID */}
        <div>
          <label className="block text-sm font-medium">Tax ID</label>
          <input
            value={local.tax_id}
            onChange={(e) => update("tax_id", e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>

        {/* Incorporation date */}
        <div>
          <label className="block text-sm font-medium">Incorporation Date *</label>
          <input
            type="date"
            value={local.incorporation_date}
            onChange={(e) => update("incorporation_date", e.target.value)}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600
                            ${errors.incorporation_date ? "border-red-300" : "border-gray-300"}
                        `}
          />
          {errors.incorporation_date && (
            <p className="text-red-600 text-sm">{errors.incorporation_date}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium">
            Phone Calling Code *
          </label>
          <input
            placeholder="+234"
            value={local.phone_calling_code}
            onChange={(e) => {
              let value = e.target.value;

              // Allow empty or only '+' at start
              if (value === '') {
                update("phone_calling_code", value);
                return;
              }

              // Enforce format: must start with '+', followed only by digits
              if (value.startsWith('+')) {
                // Keep only '+' and digits
                const cleaned = '+' + value.slice(1).replace(/[^0-9]/g, '');
                // Limit total length to 5 chars (+1234)
                if (cleaned.length <= 5) {
                  update("phone_calling_code", cleaned);
                }
              } else if (value === '+') {
                update("phone_calling_code", '+');
              }
              // Ignore all other input (e.g. letters, symbols)
            }}
            onBlur={() => {
              const val = local.phone_calling_code;
              const isValid = /^\+[1-9]\d{0,3}$/.test(val);
              if (val && !isValid) {
                setErrors(prev => ({
                  ...prev,
                  phone_calling_code: 'Invalid format (e.g. +234)'
                }));
              }
            }}
            className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors.phone_calling_code ? 'border-red-300' : 'border-gray-300'
              }`}
          />
          {errors.phone_calling_code && (
            <p className="text-sm text-red-600 mt-1">{errors.phone_calling_code}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Phone Number</label>
          <input
            value={local.phone_number}
            onChange={(e) => update("phone_number", e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>

        {/* Industry */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Business Industry</label>
          <input
            value={local.business_industry}
            onChange={(e) => update("business_industry", e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>

        {/* Website */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Primary Website</label>
          <input
            type="url"
            value={local.primary_website}
            onChange={(e) => update("primary_website", e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>

        {/* DAO */}
        <div className="sm:col-span-2 flex items-center space-x-2 mt-4">
          <input
            type="checkbox"
            checked={local.is_dao}
            onChange={(e) => update("is_dao", e.target.checked)}
            className="h-4 w-4 text-indigo-600"
          />
          <label className="text-sm">Is this a DAO?</label>
        </div>

        {/* Statement Descriptor */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">
            Statement Descriptor (max 22 chars)
          </label>
          <input
            maxLength={22}
            value={local.statement_descriptor}
            onChange={(e) => update("statement_descriptor", e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>
      </div>

      {/* NEXT BUTTON */}
      <div className="mt-8 flex justify-end">
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
