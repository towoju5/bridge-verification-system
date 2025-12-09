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
	goToStep: (step: string) => void;
	showError: (msg: string) => void;
	countries?: Country[];
}

export default function Address({
	formData,
	setFormData,
	saving,
	goToStep,
	showError,
	countries = [],
}: Props) {
	const [local, setLocal] = useState({
		registered_address: formData.registered_address || {
			street_line_1: "",
			street_line_2: "",
			city: "",
			subdivision: "",
			postal_code: "",
			country: "",
			proof_of_address_file: null,
		},
		physical_address: formData.physical_address || {
			street_line_1: "",
			street_line_2: "",
			city: "",
			subdivision: "",
			postal_code: "",
			country: "",
			proof_of_address_file: null,
		},
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

		if (errors[`${type}.${field}`]) {
			setErrors((prev) => ({ ...prev, [`${type}.${field}`]: "" }));
		}
	};

	/** ------------------------------------------------------
	 * VALIDATION
	 * ----------------------------------------------------- **/
	const validate = () => {
		const e: Record<string, string> = {};

		["registered_address", "physical_address"].forEach((type) => {
			const a = (local as any)[type];

			if (!a.street_line_1?.trim())
				e[`${type}.street_line_1`] = "Street Line 1 is required.";
			if (!a.city?.trim()) e[`${type}.city`] = "City is required.";
			if (!a.country?.trim()) e[`${type}.country`] = "Country is required.";
		});

		setErrors(e);
		return Object.keys(e).length === 0;
	};

	/** ------------------------------------------------------
	 * SUBMIT STEP 2 (Addresses)
	 * ----------------------------------------------------- **/
	const save = async () => {
		if (!validate()) return;

		const fd = new FormData();

		["registered_address", "physical_address"].forEach((type) => {
			const address = (local as any)[type];
			Object.keys(address).forEach((key) => {
				if (key === "proof_of_address_file" && address[key]) {
					fd.append(`${type}[${key}]`, address[key]);
				} else {
					fd.append(`${type}[${key}]`, address[key] ?? "");
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
			console.error(err);
			showError(err.response?.data?.message || "Unable to save addresses.");
		}
	};

	return (
		<div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
			<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
				Addresses
			</h2>

			{/* ------------------------------------------
                REGISTERED ADDRESS
            ------------------------------------------- */}
			<div className="mb-8">
				<h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
					Registered Address *
				</h3>

				<div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
					{/* Street Line 1 */}
					<div className="sm:col-span-2">
						<label className="block text-sm font-medium">Street Line 1 *</label>
						<input
							value={local.registered_address.street_line_1}
							onChange={(e) =>
								update("registered_address", "street_line_1", e.target.value)
							}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors["registered_address.street_line_1"]
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

					{/* Street Line 2 */}
					<div className="sm:col-span-2">
						<label className="block text-sm font-medium">Street Line 2</label>
						<input
							value={local.registered_address.street_line_2}
							onChange={(e) =>
								update("registered_address", "street_line_2", e.target.value)
							}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					{/* City */}
					<div>
						<label className="block text-sm font-medium">City *</label>
						<input
							value={local.registered_address.city}
							onChange={(e) =>
								update("registered_address", "city", e.target.value)
							}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors["registered_address.city"]
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

					{/* Subdivision */}
					<div>
						<label className="block text-sm font-medium">State/Province</label>
						<input
							value={local.registered_address.subdivision}
							onChange={(e) =>
								update("registered_address", "subdivision", e.target.value)
							}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					{/* Postal Code */}
					<div>
						<label className="block text-sm font-medium">Postal Code</label>
						<input
							value={local.registered_address.postal_code}
							onChange={(e) =>
								update("registered_address", "postal_code", e.target.value)
							}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					{/* Country */}
					<div>
						<label className="block text-sm font-medium">Country *</label>
						{countries.length ? (
							<select
								value={local.registered_address.country}
								onChange={(e) =>
									update("registered_address", "country", e.target.value)
								}
								className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors["registered_address.country"]
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
								value={local.registered_address.country}
								onChange={(e) =>
									update("registered_address", "country", e.target.value)
								}
								placeholder="US"
								className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors["registered_address.country"]
										? "border-red-300"
										: "border-gray-300"
									}`}
							/>
						)}
						{errors["registered_address.country"] && (
							<p className="text-sm text-red-600">
								{errors["registered_address.country"]}
							</p>
						)}
					</div>
				</div>
			</div>
			{/* ------------------------------------------
                PHYSICAL ADDRESS
            ------------------------------------------- */}
			<div className="mt-10">
				<h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
					Physical Operating Address *
				</h3>

				<div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
					{/* Street Line 1 */}
					<div className="sm:col-span-2">
						<label className="block text-sm font-medium">Street Line 1 *</label>
						<input
							value={local.physical_address.street_line_1}
							onChange={(e) =>
								update("physical_address", "street_line_1", e.target.value)
							}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors["physical_address.street_line_1"]
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

					{/* Street Line 2 */}
					<div className="sm:col-span-2">
						<label className="block text-sm font-medium">Street Line 2</label>
						<input
							value={local.physical_address.street_line_2}
							onChange={(e) =>
								update("physical_address", "street_line_2", e.target.value)
							}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					{/* City */}
					<div>
						<label className="block text-sm font-medium">City *</label>
						<input
							value={local.physical_address.city}
							onChange={(e) => update("physical_address", "city", e.target.value)}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors["physical_address.city"]
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

					{/* Subdivision */}
					<div>
						<label className="block text-sm font-medium">State/Province</label>
						<input
							value={local.physical_address.subdivision}
							onChange={(e) =>
								update("physical_address", "subdivision", e.target.value)
							}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					{/* Postal Code */}
					<div>
						<label className="block text-sm font-medium">Postal Code</label>
						<input
							value={local.physical_address.postal_code}
							onChange={(e) =>
								update("physical_address", "postal_code", e.target.value)
							}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					{/* Country */}
					<div>
						<label className="block text-sm font-medium">Country *</label>

						{countries.length ? (
							<select
								value={local.physical_address.country}
								onChange={(e) =>
									update("physical_address", "country", e.target.value)
								}
								className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors["physical_address.country"]
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
								value={local.physical_address.country}
								onChange={(e) =>
									update("physical_address", "country", e.target.value)
								}
								placeholder="US"
								className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors["physical_address.country"]
										? "border-red-300"
										: "border-gray-300"
									}`}
							/>
						)}

						{errors["physical_address.country"] && (
							<p className="text-sm text-red-600">
								{errors["physical_address.country"]}
							</p>
						)}
					</div>

					{/* Proof of Address */}
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
							className="mt-2"
						/>
					</div>
				</div>
			</div>

			{/* ------------------------------------------
                BUTTONS
            ------------------------------------------- */}
			<div className="mt-10 flex justify-between">
				{/* PREVIOUS BUTTON */}
				<button
					onClick={() => goToStep("business-info")}
					disabled={saving}
					className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
				>
					Previous
				</button>

				{/* NEXT BUTTON */}
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
