// Address.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface Country {
	code: string;
	name: string;
}

interface Props {
	formData: any;
	setFormData: React.Dispatch<React.SetStateAction<any>>;
	setActiveTab: (tab: string) => void;
	countries?: Country[];
}

export default function Address({ formData, setFormData, setActiveTab, countries = [] }: Props) {
	const [local, setLocal] = useState({
		registered_address: formData.registered_address || {},
		physical_address: formData.physical_address || {},
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	const change = (
		type: 'registered_address' | 'physical_address',
		field: string,
		val: string | File | null
	) =>
		setLocal(prev => ({
			...prev,
			[type]: { ...prev[type], [field]: val },
		}));

	const validate = () => {
		const e: Record<string, string> = {};
		['registered_address', 'physical_address'].forEach(addr => {
			const a = local[addr as keyof typeof local];
			if (!a.street_line_1?.trim()) e[`${addr}.street_line_1`] = 'Required';
			if (!a.city?.trim()) e[`${addr}.city`] = 'Required';
			if (!a.country?.trim()) e[`${addr}.country`] = 'Required';
		});
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const next = async () => {
		if (!validate()) return;

		try {
			const formDataToSend = new FormData();

			// Loop over both addresses
			(['registered_address', 'physical_address'] as const).forEach(addrType => {
				const address = local[addrType];

				Object.keys(address).forEach(key => {
					if (key === 'proof_of_address_file' && address[key]) {
						formDataToSend.append(`${addrType}[${key}]`, address[key]); // file
					} else {
						formDataToSend.append(`${addrType}[${key}]`, address[key] ?? '');
					}
				});
			});

			await axios.post('/api/business-customer/step/2', formDataToSend, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			setFormData((prev: any) => ({ ...prev, ...local }));
			setActiveTab('persons');
		} catch (err) {
			console.error('Upload error:', err);
		}
	};

	return (
		<div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
			<h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Addresses</h2>

			{(['registered_address', 'physical_address'] as const).map(addrType => (
				<div key={addrType} className="mb-6">
					<h3 className="text-md font-medium text-gray-900 mb-2">
						{addrType === 'registered_address' ? 'Registered Address' : 'Physical Address'} *
					</h3>
					<div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
						<div className="sm:col-span-2">
							<label>Street Line 1 *</label>
							<input
								value={local[addrType].street_line_1 || ''}
								onChange={(e) => change(addrType, 'street_line_1', e.target.value)}
								className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors[`${addrType}.street_line_1`] ? 'border-red-300' : 'border-gray-300'}`}
							/>
							{errors[`${addrType}.street_line_1`] && <p className="text-sm text-red-600">{errors[`${addrType}.street_line_1`]}</p>}
						</div>

						<div className="sm:col-span-2">
							<label>Street Line 2</label>
							<input
								value={local[addrType].street_line_2 || ''}
								onChange={(e) => change(addrType, 'street_line_2', e.target.value)}
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
							/>
						</div>

						<div>
							<label>City *</label>
							<input
								value={local[addrType].city || ''}
								onChange={(e) => change(addrType, 'city', e.target.value)}
								className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors[`${addrType}.city`] ? 'border-red-300' : 'border-gray-300'}`}
							/>
							{errors[`${addrType}.city`] && <p className="text-sm text-red-600">{errors[`${addrType}.city`]}</p>}
						</div>

						<div>
							<label>State/Province</label>
							<input
								value={local[addrType].subdivision || ''}
								onChange={(e) => change(addrType, 'subdivision', e.target.value)}
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
								placeholder="e.g., NY"
							/>
						</div>

						<div>
							<label>Postal Code</label>
							<input
								value={local[addrType].postal_code || ''}
								onChange={(e) => change(addrType, 'postal_code', e.target.value)}
								className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
							/>
						</div>

						<div>
							<label>Country *</label>
							{(countries || []).length ? (
								<select
									value={local[addrType].country || ''}
									onChange={(e) => change(addrType, 'country', e.target.value)}
									className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors[`${addrType}.country`] ? 'border-red-300' : 'border-gray-300'}`}
								>
									<option value="">Select country</option>
									{(countries || []).map((c) => (
										<option key={c.code} value={c.code}>
											{c.name}
										</option>
									))}
								</select>
							) : (
								<input
									value={local[addrType].country || ''}
									onChange={(e) => change(addrType, 'country', e.target.value)}
									className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors[`${addrType}.country`] ? 'border-red-300' : 'border-gray-300'}`}
									placeholder="3-letter code (e.g., USA)"
								/>
							)}
							{errors[`${addrType}.country`] && <p className="text-sm text-red-600">{errors[`${addrType}.country`]}</p>}
						</div>

						{/* Proof of Address file */}
						<div className="sm:col-span-2">
							<label>Proof of Address</label>
							<input
								type="file"
								accept=".pdf,.jpeg,.jpg,.png,.heic,.tif"
								onChange={(e) => change(addrType, 'proof_of_address_file', e.target.files?.[0] || null)}
								className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
							/>
						</div>
					</div>
				</div>
			))}

			<div className="mt-6 flex justify-end">
				<button
					onClick={next}
					className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
				>
					Next
				</button>
			</div>
		</div>
	);
}
