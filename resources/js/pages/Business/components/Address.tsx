import React, { useState } from 'react';
import axios from 'axios';

interface Props {
	formData: any;
	setFormData: React.Dispatch<React.SetStateAction<any>>;
	setActiveTab: (tab: string) => void;
	countries: { code: string; name: string }[];
}

export default function Address({ formData, setFormData, setActiveTab, countries }: Props) {
	const [local, setLocal] = useState({
		registered_address: formData.registered_address || {},
		physical_address: formData.physical_address || {},
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	const change = (type: 'registered_address' | 'physical_address', field: string, val: string) =>
		setLocal((prev) => ({
			...prev,
			[type]: { ...prev[type], [field]: val },
		}));

	const validate = () => {
		const e: Record<string, string> = {};
		['registered_address', 'physical_address'].forEach((addr) => {
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
		await axios.post('/api/business-customer/step/2', local);
		setFormData((prev: any) => ({ ...prev, ...local }));
		setActiveTab('persons');
	};

	return (
		<div className="bg-white shadow sm:rounded-lg p-6">
			<h2 className="text-lg font-medium text-gray-900 mb-4">Addresses</h2>

			{/* Registered Address */}
			<div className="mb-6">
				<h3 className="text-md font-medium text-gray-900 mb-2">Registered Address *</h3>
				<div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
					<div className="sm:col-span-2">
						<label>Street Line 1 *</label>
						<input
							value={local.registered_address.street_line_1 || ''}
							onChange={(e) => change('registered_address', 'street_line_1', e.target.value)}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors['registered_address.street_line_1'] ? 'border-red-300' : 'border-gray-300'}`}
						/>
						{errors['registered_address.street_line_1'] && <p className="text-sm text-red-600">{errors['registered_address.street_line_1']}</p>}
					</div>

					<div className="sm:col-span-2">
						<label>Street Line 2</label>
						<input
							value={local.registered_address.street_line_2 || ''}
							onChange={(e) => change('registered_address', 'street_line_2', e.target.value)}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					<div>
						<label>City *</label>
						<input
							value={local.registered_address.city || ''}
							onChange={(e) => change('registered_address', 'city', e.target.value)}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors['registered_address.city'] ? 'border-red-300' : 'border-gray-300'}`}
						/>
						{errors['registered_address.city'] && <p className="text-sm text-red-600">{errors['registered_address.city']}</p>}
					</div>

					<div>
						<label>State/Province</label>
						<input
							value={local.registered_address.subdivision || ''}
							onChange={(e) => change('registered_address', 'subdivision', e.target.value)}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
							placeholder="e.g., NY"
						/>
					</div>

					<div>
						<label>Postal Code</label>
						<input
							value={local.registered_address.postal_code || ''}
							onChange={(e) => change('registered_address', 'postal_code', e.target.value)}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					<div>
						<label>Country *</label>
						<select
							value={local.registered_address.country || ''}
							onChange={(e) => change('registered_address', 'country', e.target.value)}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors['registered_address.country'] ? 'border-red-300' : 'border-gray-300'}`}
						>
							<option value="">Select country</option>
							{countries.map((c) => (
								<option key={c.code} value={c.code}>
									{c.name}
								</option>
							))}
						</select>
						{errors['registered_address.country'] && <p className="text-sm text-red-600">{errors['registered_address.country']}</p>}
					</div>
				</div>
			</div>

			{/* Physical Address */}
			<div>
				<h3 className="text-md font-medium text-gray-900 mb-2">Physical Address (Primary Place of Business) *</h3>
				<div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
					<div className="sm:col-span-2">
						<label>Street Line 1 *</label>
						<input
							value={local.physical_address.street_line_1 || ''}
							onChange={(e) => change('physical_address', 'street_line_1', e.target.value)}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors['physical_address.street_line_1'] ? 'border-red-300' : 'border-gray-300'}`}
						/>
						{errors['physical_address.street_line_1'] && <p className="text-sm text-red-600">{errors['physical_address.street_line_1']}</p>}
					</div>

					<div className="sm:col-span-2">
						<label>Street Line 2</label>
						<input
							value={local.physical_address.street_line_2 || ''}
							onChange={(e) => change('physical_address', 'street_line_2', e.target.value)}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					<div>
						<label>City *</label>
						<input
							value={local.physical_address.city || ''}
							onChange={(e) => change('physical_address', 'city', e.target.value)}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors['physical_address.city'] ? 'border-red-300' : 'border-gray-300'}`}
						/>
						{errors['physical_address.city'] && <p className="text-sm text-red-600">{errors['physical_address.city']}</p>}
					</div>

					<div>
						<label>State/Province</label>
						<input
							value={local.physical_address.subdivision || ''}
							onChange={(e) => change('physical_address', 'subdivision', e.target.value)}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
							placeholder="e.g., NY"
						/>
					</div>

					<div>
						<label>Postal Code</label>
						<input
							value={local.physical_address.postal_code || ''}
							onChange={(e) => change('physical_address', 'postal_code', e.target.value)}
							className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
						/>
					</div>

					<div>
						<label>Country *</label>
						<input
							value={local.physical_address.country || ''}
							onChange={(e) => change('physical_address', 'country', e.target.value)}
							className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 ${errors['physical_address.country'] ? 'border-red-300' : 'border-gray-300'}`}
							placeholder="3-letter code (e.g., USA)"
						/>
						{errors['physical_address.country'] && <p className="text-sm text-red-600">{errors['physical_address.country']}</p>}
					</div>
				</div>
			</div>

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