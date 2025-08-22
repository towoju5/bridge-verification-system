import React, { useState } from 'react';
import axios from 'axios';

interface IDInfo {
	type: string;
	issuing_country: string;
	number: string;
	description: string;
	expiration: string;
	image_front: string;
	image_back: string;
}

interface Props {
	formData: any;
	setFormData: React.Dispatch<React.SetStateAction<any>>;
	idTypes: string[];
	setActiveTab: (tab: string) => void;
	onComplete: () => void;
}

export default function IdentifyingInfoTab({ formData, setFormData, setActiveTab, idTypes, onComplete }: Props) {
	const [ids, setIds] = useState<IDInfo[]>(formData.identifying_information || []);

	const add = () =>
		setIds([
			...ids,
			{ type: '', issuing_country: '', number: '', description: '', expiration: '', image_front: '', image_back: '' },
		]);
	const remove = (idx: number) => setIds(ids.filter((_, i) => i !== idx));
	const change = (idx: number, field: keyof IDInfo, val: string) => {
		const copy = [...ids];
		(copy[idx] as any)[field] = val;
		setIds(copy);
	};

	// const finish = async () => {
	// 	await axios.post('/api/business-customer/step/7', { identifying_information: ids });
	// 	setFormData((prev: any) => ({ ...prev, identifying_information: ids }));
	// 	onComplete();
	// };

	const next = async () => {
		await axios.post('/api/business-customer/step/7', { identifying_information: ids });
		setFormData((prev: any) => ({ ...prev, identifying_information: ids }));
		setActiveTab('review');
	};

	return (
		<div className="bg-white p-6 rounded-lg shadow-md">
			<h2 className="text-lg font-bold mb-2">Identifying Information</h2>

			{ids.map((info, idx) => (
				<div key={idx} className="mb-4 border p-4 rounded bg-gray-50 relative">
					<button
						type="button"
						onClick={() => remove(idx)}
						className="absolute top-2 right-2 text-red-500"
					>
						Remove
					</button>

					<label className="block text-sm font-medium">ID Type</label>
					<select
						className="w-full border rounded p-2"
						value={info.type}
						onChange={(e) => change(idx, 'type', e.target.value)}
					>
						<option value="">Select type</option>
						{idTypes.map((t) => (
							<option key={t} value={t}>
								{t.replace(/_/g, ' ')}
							</option>
						))}
					</select>

					<label className="block mt-2 text-sm font-medium">Issuing Country</label>
					<input
						className="w-full border rounded p-2"
						value={info.issuing_country}
						onChange={(e) => change(idx, 'issuing_country', e.target.value)}
					/>

					<label className="block mt-2 text-sm font-medium">Number</label>
					<input
						className="w-full border rounded p-2"
						value={info.number}
						onChange={(e) => change(idx, 'number', e.target.value)}
					/>

					<label className="block mt-2 text-sm font-medium">Description</label>
					<input
						className="w-full border rounded p-2"
						value={info.description}
						onChange={(e) => change(idx, 'description', e.target.value)}
					/>

					<label className="block mt-2 text-sm font-medium">Expiration Date</label>
					<input
						type="date"
						className="w-full border rounded p-2"
						value={info.expiration}
						onChange={(e) => change(idx, 'expiration', e.target.value)}
					/>

					<label className="block mt-2 text-sm font-medium">Front Image (file)</label>
					<input
						type="file"
						className="w-full border rounded p-2"
						onChange={(e) => change(idx, 'image_front', (e.target as any).files[0]?.name || '')}
					/>

					<label className="block mt-2 text-sm font-medium">Back Image (file)</label>
					<input
						type="file"
						className="w-full border rounded p-2"
						onChange={(e) => change(idx, 'image_back', (e.target as any).files[0]?.name || '')}
					/>
				</div>
			))}

			<button
				type="button"
				onClick={add}
				className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
			>
				Add ID Information
			</button>

			<div className="mt-6 flex justify-end">
				<button
					onClick={next}
					className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
				>
					Next
				</button>
			</div>
		</div>
	);
}