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

export default function AssociatedPersons({
    formData,
    setFormData,
    saving,
    countries = [],
    goToStep,
    showError,
}: Props) {

    const [persons, setPersons] = useState<any[]>(
        formData.associated_persons?.length
            ? formData.associated_persons
            : [
                  {
                      first_name: "",
                      last_name: "",
                      birth_date: "",
                      nationality: "",
                      email: "",
                      phone: "",
                      title: "",
                      ownership_percentage: "",
                      relationship_established_at: "",
                      residential_address: {
                          street_line_1: "",
                          street_line_2: "",
                          city: "",
                          subdivision: "",
                          postal_code: "",
                          country: "",
                      },
                      has_ownership: false,
                      has_control: false,
                      is_signer: false,
                      is_director: false,
                  },
              ]
    );

    const [errors, setErrors] = useState<Record<string, string>>({});

    /** ---------------------------------------------------------
     * Add a new person
     * --------------------------------------------------------- */
    const addPerson = () => {
        setPersons((prev) => [
            ...prev,
            {
                first_name: "",
                last_name: "",
                birth_date: "",
                nationality: "",
                email: "",
                phone: "",
                title: "",
                ownership_percentage: "",
                relationship_established_at: "",
                residential_address: {
                    street_line_1: "",
                    street_line_2: "",
                    city: "",
                    subdivision: "",
                    postal_code: "",
                    country: "",
                },
                has_ownership: false,
                has_control: false,
                is_signer: false,
                is_director: false,
            },
        ]);
    };

    /** ---------------------------------------------------------
     * Remove a person
     * --------------------------------------------------------- */
    const removePerson = (index: number) => {
        if (persons.length === 1) {
            showError("At least one associated person is required.");
            return;
        }
        setPersons((prev) => prev.filter((_, i) => i !== index));
    };

    /** ---------------------------------------------------------
     * Update a person field
     * --------------------------------------------------------- */
    const update = (index: number, field: string, value: any) => {
        setPersons((prev) =>
            prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
        );

        if (errors[`persons.${index}.${field}`]) {
            setErrors((prev) => ({ ...prev, [`persons.${index}.${field}`]: "" }));
        }
    };

    /** ---------------------------------------------------------
     * Update a nested address field
     * --------------------------------------------------------- */
    const updateAddress = (
        index: number,
        field: string,
        value: any
    ) => {
        setPersons((prev) =>
            prev.map((p, i) =>
                i === index
                    ? {
                          ...p,
                          residential_address: {
                              ...p.residential_address,
                              [field]: value,
                          },
                      }
                    : p
            )
        );

        if (errors[`persons.${index}.residential_address.${field}`]) {
            setErrors((prev) => ({
                ...prev,
                [`persons.${index}.residential_address.${field}`]: "",
            }));
        }
    };

    /** ---------------------------------------------------------
     * Validate persons array
     * --------------------------------------------------------- */
    const validate = () => {
        const e: Record<string, string> = {};

        persons.forEach((p, idx) => {
            if (!p.first_name.trim())
                e[`persons.${idx}.first_name`] = "First name is required.";

            if (!p.last_name.trim())
                e[`persons.${idx}.last_name`] = "Last name is required.";

            if (!p.birth_date.trim())
                e[`persons.${idx}.birth_date`] = "Birth date is required.";

            if (!p.nationality.trim())
                e[`persons.${idx}.nationality`] = "Nationality is required.";

            if (!p.email.trim()) e[`persons.${idx}.email`] = "Email is required.";

            if (p.ownership_percentage === "")
                e[`persons.${idx}.ownership_percentage`] =
                    "Ownership percentage is required.";

            const a = p.residential_address;
            if (!a.street_line_1.trim())
                e[`persons.${idx}.residential_address.street_line_1`] =
                    "Street line 1 is required.";
            if (!a.city.trim())
                e[`persons.${idx}.residential_address.city`] = "City is required.";
            if (!a.country.trim())
                e[`persons.${idx}.residential_address.country`] =
                    "Country is required.";
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };
    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Associated Persons
            </h2>

            {persons.map((person, idx) => (
                <div
                    key={idx}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 mb-8 bg-gray-50 dark:bg-gray-900"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 classname="text-md font-medium text-gray-900 dark:text-white">
                            Person #{idx + 1}
                        </h3>
                        {persons.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removePerson(idx)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        {/* First Name */}
                        <div>
                            <label className="block text-sm font-medium">First Name *</label>
                            <input
                                value={person.first_name}
                                onChange={(e) =>
                                    update(idx, "first_name", e.target.value)
                                }
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                    errors[`persons.${idx}.first_name`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors[`persons.${idx}.first_name`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`persons.${idx}.first_name`]}
                                </p>
                            )}
                        </div>

                        {/* Last Name */}
                        <div>
                            <label className="block text-sm font-medium">Last Name *</label>
                            <input
                                value={person.last_name}
                                onChange={(e) =>
                                    update(idx, "last_name", e.target.value)
                                }
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                    errors[`persons.${idx}.last_name`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors[`persons.${idx}.last_name`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`persons.${idx}.last_name`]}
                                </p>
                            )}
                        </div>

                        {/* Birth Date */}
                        <div>
                            <label className="block text-sm font-medium">Birth Date *</label>
                            <input
                                type="date"
                                value={person.birth_date}
                                onChange={(e) =>
                                    update(idx, "birth_date", e.target.value)
                                }
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                    errors[`persons.${idx}.birth_date`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors[`persons.${idx}.birth_date`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`persons.${idx}.birth_date`]}
                                </p>
                            )}
                        </div>

                        {/* Nationality */}
                        <div>
                            <label className="block text-sm font-medium">Nationality *</label>

                            {countries.length ? (
                                <select
                                    value={person.nationality}
                                    onChange={(e) =>
                                        update(idx, "nationality", e.target.value)
                                    }
                                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                        errors[`persons.${idx}.nationality`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                >
                                    <option value="">Select</option>
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    value={person.nationality}
                                    onChange={(e) =>
                                        update(idx, "nationality", e.target.value)
                                    }
                                    placeholder="US"
                                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                        errors[`persons.${idx}.nationality`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                />
                            )}

                            {errors[`persons.${idx}.nationality`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`persons.${idx}.nationality`]}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium">Email *</label>
                            <input
                                type="email"
                                value={person.email}
                                onChange={(e) =>
                                    update(idx, "email", e.target.value)
                                }
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                    errors[`persons.${idx}.email`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors[`persons.${idx}.email`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`persons.${idx}.email`]}
                                </p>
                            )}
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium">Phone</label>
                            <input
                                value={person.phone}
                                onChange={(e) =>
                                    update(idx, "phone", e.target.value)
                                }
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                            />
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium">Title/Role</label>
                            <input
                                value={person.title}
                                onChange={(e) =>
                                    update(idx, "title", e.target.value)
                                }
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                            />
                        </div>

                        {/* Ownership Percentage */}
                        <div>
                            <label className="block text-sm font-medium">
                                Ownership % *
                            </label>
                            <input
                                type="number"
                                value={person.ownership_percentage}
                                onChange={(e) =>
                                    update(idx, "ownership_percentage", e.target.value)
                                }
                                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                    errors[`persons.${idx}.ownership_percentage`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {errors[`persons.${idx}.ownership_percentage`] && (
                                <p className="text-sm text-red-600">
                                    {errors[`persons.${idx}.ownership_percentage`]}
                                </p>
                            )}
                        </div>

                        {/* Relationship Established At */}
                        <div>
                            <label className="block text-sm font-medium">
                                Relationship Established At
                            </label>
                            <input
                                type="date"
                                value={person.relationship_established_at}
                                onChange={(e) =>
                                    update(
                                        idx,
                                        "relationship_established_at",
                                        e.target.value
                                    )
                                }
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                            />
                        </div>

                        {/* Ownership Flags */}
                        <div className="sm:col-span-2 grid grid-cols-2 gap-3 mt-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={person.has_ownership}
                                    onChange={(e) =>
                                        update(idx, "has_ownership", e.target.checked)
                                    }
                                    className="h-4 w-4 text-indigo-600"
                                />
                                <span className="text-sm">Has Ownership</span>
                            </label>

                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={person.has_control}
                                    onChange={(e) =>
                                        update(idx, "has_control", e.target.checked)
                                    }
                                    className="h-4 w-4 text-indigo-600"
                                />
                                <span className="text-sm">Has Control</span>
                            </label>

                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={person.is_signer}
                                    onChange={(e) =>
                                        update(idx, "is_signer", e.target.checked)
                                    }
                                    className="h-4 w-4 text-indigo-600"
                                />
                                <span className="text-sm">Is Signer</span>
                            </label>

                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={person.is_director}
                                    onChange={(e) =>
                                        update(idx, "is_director", e.target.checked)
                                    }
                                    className="h-4 w-4 text-indigo-600"
                                />
                                <span className="text-sm">Is Director</span>
                            </label>
                        </div>
                    </div>

                    {/* Residential Address Section */}
                    <div className="mt-8">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Residential Address *
                        </h4>

                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            {/* Street Line 1 */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium">Street Line 1 *</label>
                                <input
                                    value={person.residential_address.street_line_1}
                                    onChange={(e) =>
                                        updateAddress(idx, "street_line_1", e.target.value)
                                    }
                                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                        errors[`persons.${idx}.residential_address.street_line_1`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                />
                                {errors[`persons.${idx}.residential_address.street_line_1`] && (
                                    <p className="text-sm text-red-600">
                                        {errors[`persons.${idx}.residential_address.street_line_1`]}
                                    </p>
                                )}
                            </div>

                            {/* Street Line 2 */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium">Street Line 2</label>
                                <input
                                    value={person.residential_address.street_line_2}
                                    onChange={(e) =>
                                        updateAddress(idx, "street_line_2", e.target.value)
                                    }
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                />
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-sm font-medium">City *</label>
                                <input
                                    value={person.residential_address.city}
                                    onChange={(e) =>
                                        updateAddress(idx, "city", e.target.value)
                                    }
                                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                        errors[`persons.${idx}.residential_address.city`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                    }`}
                                />
                                {errors[`persons.${idx}.residential_address.city`] && (
                                    <p className="text-sm text-red-600">
                                        {errors[`persons.${idx}.residential_address.city`]}
                                    </p>
                                )}
                            </div>

                            {/* Subdivision */}
                            <div>
                                <label className="block text-sm font-medium">State/Province</label>
                                <input
                                    value={person.residential_address.subdivision}
                                    onChange={(e) =>
                                        updateAddress(idx, "subdivision", e.target.value)
                                    }
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                />
                            </div>

                            {/* Postal Code */}
                            <div>
                                <label className="block text-sm font-medium">Postal Code</label>
                                <input
                                    value={person.residential_address.postal_code}
                                    onChange={(e) =>
                                        updateAddress(idx, "postal_code", e.target.value)
                                    }
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                />
                            </div>

                            {/* Country */}
                            <div>
                                <label className="block text-sm font-medium">Country *</label>

                                {countries.length ? (
                                    <select
                                        value={person.residential_address.country}
                                        onChange={(e) =>
                                            updateAddress(idx, "country", e.target.value)
                                        }
                                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                            errors[`persons.${idx}.residential_address.country`]
                                                ? "border-red-300"
                                                : "border-gray-300"
                                        }`}
                                    >
                                        <option value="">Select</option>
                                        {countries.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        value={person.residential_address.country}
                                        onChange={(e) =>
                                            updateAddress(idx, "country", e.target.value)
                                        }
                                        placeholder="US"
                                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${
                                            errors[`persons.${idx}.residential_address.country`]
                                                ? "border-red-300"
                                                : "border-gray-300"
                                        }`}
                                    />
                                )}

                                {errors[`persons.${idx}.residential_address.country`] && (
                                    <p className="text-sm text-red-600">
                                        {errors[`persons.${idx}.residential_address.country`]}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {/* ADD PERSON BUTTON */}
            <div className="flex justify-start mb-6">
                <button
                    type="button"
                    onClick={addPerson}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                >
                    + Add Another Person
                </button>
            </div>

            {/* SUBMIT SECTION */}
            <div className="mt-10 flex justify-between">
                {/* PREVIOUS BUTTON */}
                <button
                    onClick={() => goToStep("addresses")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                {/* NEXT BUTTON */}
                <button
                    onClick={async () => {
                        if (!validate()) return;

                        try {
                            const payload = { associated_persons: persons };

                            await axios.post(
                                "/api/business-customer/step/3",
                                payload
                            );

                            setFormData((prev: any) => ({
                                ...prev,
                                associated_persons: persons,
                            }));

                            goToStep("financial");
                        } catch (err: any) {
                            console.error(err);
                            showError(
                                err.response?.data?.message ||
                                    "Unable to save associated persons."
                            );
                        }
                    }}
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
