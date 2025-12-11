import React, { useState } from "react";
import axios from "axios";

interface Country {
  code: string;
  name: string;
}

interface AddressFields {
  street_line_1: string;
  street_line_2: string;
  city: string;
  subdivision: string;
  postal_code: string;
  country: string;
  proof_of_address_file: File | null;
}

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  saving: boolean;
  goToStep: (step: string) => void;
  showError: (msg: string) => void;
  countries: Country[]; // Required; parent ensures it's always passed
}

export default function Address({
  formData,
  setFormData,
  saving,
  goToStep,
  showError,
  countries,
}: Props) {
  // Safely extract initial addresses, fallback to empty structure
  const initialRegistered = formData.registered_address || {
    street_line_1: "",
    street_line_2: "",
    city: "",
    subdivision: "",
    postal_code: "",
    country: "",
    proof_of_address_file: null,
  };

  const initialPhysical = formData.physical_address || {
    street_line_1: "",
    street_line_2: "",
    city: "",
    subdivision: "",
    postal_code: "",
    country: "",
    proof_of_address_file: null,
  };

  const [local, setLocal] = useState({
    registered_address: initialRegistered,
    physical_address: initialPhysical,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (
    type: "registered_address" | "physical_address",
    field: string,
    value: any
  ) => {
    setLocal((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));

    // Clear error when user types
    const errorKey = `${type}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: "" }));
    }
  };

  /** ------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------- **/
  const validate = () => {
    const newErrors: Record<string, string> = {};

    (["registered_address", "physical_address"] as const).forEach((type) => {
      const addr = local[type];
      if (!addr.street_line_1?.trim()) {
        newErrors[`${type}.street_line_1`] = "Street Line 1 is required.";
      }
      if (!addr.city?.trim()) {
        newErrors[`${type}.city`] = "City is required.";
      }
      if (!addr.country?.trim()) {
        newErrors[`${type}.country`] = "Country is required.";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

//   console.log(countries);
  

  /** ------------------------------------------------------
   * SAVE STEP
   * ----------------------------------------------------- **/
  const save = async () => {
    if (!validate()) return;

    const fd = new FormData();

    (["registered_address", "physical_address"] as const).forEach((type) => {
      const addr = local[type];
      Object.entries(addr).forEach(([key, value]) => {
        if (key === "proof_of_address_file" && value instanceof File) {
          fd.append(`${type}[${key}]`, value);
        } else {
          fd.append(`${type}[${key}]`, value ?? "");
        }
      });
    });

    try {
      await axios.post("/api/business-customer/step/2", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFormData((prev: any) => ({
        ...prev,
        registered_address: local.registered_address,
        physical_address: local.physical_address,
      }));

      goToStep("persons");
    } catch (err: any) {
      console.error("Address save error:", err);
      showError(err.response?.data?.message || "Unable to save addresses.");
    }
  };

  return (
    <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Addresses
      </h2>

      {/* REGISTERED ADDRESS */}
      <div className="mb-8">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Registered Address *
        </h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Street Line 1 *</label>
            <input
              type="text"
              value={local.registered_address.street_line_1}
              onChange={(e) =>
                update("registered_address", "street_line_1", e.target.value)
              }
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                errors["registered_address.street_line_1"]
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
            />
            {errors["registered_address.street_line_1"] && (
              <p className="text-sm text-red-600">
                {errors["registered_address.street_line_1"]}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Street Line 2</label>
            <input
              type="text"
              value={local.registered_address.street_line_2}
              onChange={(e) =>
                update("registered_address", "street_line_2", e.target.value)
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">City *</label>
            <input
              type="text"
              value={local.registered_address.city}
              onChange={(e) =>
                update("registered_address", "city", e.target.value)
              }
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                errors["registered_address.city"]
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
            />
            {errors["registered_address.city"] && (
              <p className="text-sm text-red-600">
                {errors["registered_address.city"]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">State/Province</label>
            <input
              type="text"
              value={local.registered_address.subdivision}
              onChange={(e) =>
                update("registered_address", "subdivision", e.target.value)
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Postal Code</label>
            <input
              type="text"
              value={local.registered_address.postal_code}
              onChange={(e) =>
                update("registered_address", "postal_code", e.target.value)
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Country *</label>
            <select
              value={local.registered_address.country}
              onChange={(e) =>
                update("registered_address", "country", e.target.value)
              }
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                errors["registered_address.country"]
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
            {errors["registered_address.country"] && (
              <p className="text-sm text-red-600">
                {errors["registered_address.country"]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PHYSICAL OPERATING ADDRESS */}
      <div className="mt-10">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Physical Operating Address *
        </h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Street Line 1 *</label>
            <input
              type="text"
              value={local.physical_address.street_line_1}
              onChange={(e) =>
                update("physical_address", "street_line_1", e.target.value)
              }
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                errors["physical_address.street_line_1"]
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
            />
            {errors["physical_address.street_line_1"] && (
              <p className="text-sm text-red-600">
                {errors["physical_address.street_line_1"]}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Street Line 2</label>
            <input
              type="text"
              value={local.physical_address.street_line_2}
              onChange={(e) =>
                update("physical_address", "street_line_2", e.target.value)
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">City *</label>
            <input
              type="text"
              value={local.physical_address.city}
              onChange={(e) =>
                update("physical_address", "city", e.target.value)
              }
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                errors["physical_address.city"]
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
            />
            {errors["physical_address.city"] && (
              <p className="text-sm text-red-600">
                {errors["physical_address.city"]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">State/Province</label>
            <input
              type="text"
              value={local.physical_address.subdivision}
              onChange={(e) =>
                update("physical_address", "subdivision", e.target.value)
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Postal Code</label>
            <input
              type="text"
              value={local.physical_address.postal_code}
              onChange={(e) =>
                update("physical_address", "postal_code", e.target.value)
              }
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Country *</label>
            <select
              value={local.physical_address.country}
              onChange={(e) =>
                update("physical_address", "country", e.target.value)
              }
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                errors["physical_address.country"]
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
            {errors["physical_address.country"] && (
              <p className="text-sm text-red-600">
                {errors["physical_address.country"]}
              </p>
            )}
          </div>

          {/* Proof of Address Upload */}
          <div className="sm:col-span-2 mt-4">
            <label className="block text-sm font-medium">
              Proof of Address (PDF/JPG/PNG)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) =>
                update(
                  "physical_address",
                  "proof_of_address_file",
                  e.target.files?.[0] ?? null
                )
              }
              className="mt-2 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
          </div>
        </div>
      </div>

      {/* NAVIGATION BUTTONS */}
      <div className="mt-10 flex justify-between">
        <button
          type="button"
          onClick={() => goToStep("business-info")}
          disabled={saving}
          className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none
            ${saving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
        >
          {saving ? "Saving..." : "Next"}
        </button>
      </div>
    </div>
  );
}