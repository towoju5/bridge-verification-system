// DocumentsTab
import React, { useState } from 'react';
import axios from 'axios';

interface Document {
	purposes: string[];
	file: File | null; // must hold actual File object
	description: string;
}

interface Props {
	formData: any;
	setFormData: React.Dispatch<React.SetStateAction<any>>;
	setActiveTab: (tab: string) => void;
	documentPurposes: { value: string; label: string }[];
}

export default function DocumentsTab({ formData, setFormData, setActiveTab, documentPurposes }: Props) {
	const [docs, setDocs] = useState<Document[]>(formData.documents || []);

	const add = () => setDocs([...docs, { purposes: [], file: null, description: '' }]);
	const remove = (idx: number) => setDocs(docs.filter((_, i) => i !== idx));
	const update = (idx: number, field: keyof Document, val: any) => {
		const copy = [...docs];
		(copy[idx] as any)[field] = val;
		setDocs(copy);
	};

	const next = async () => {
		try {
			const formDataToSend = new FormData();

			docs.forEach((doc, i) => {
				// Append purposes
				doc.purposes.forEach((p, j) => {
					formDataToSend.append(`documents[${i}][purposes][${j}]`, p);
				});

				// Append file if selected
				if (doc.file) {
					formDataToSend.append(`documents[${i}][file]`, doc.file);
				}

				// Append description
				formDataToSend.append(`documents[${i}][description]`, doc.description);
			});

			await axios.post('/api/business-customer/step/6', formDataToSend, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});

			setFormData((prev: any) => ({ ...prev, documents: docs }));
			setActiveTab('identifying_information');
		} catch (err) {
			console.error('Upload error:', err);
		}
	};

	return (
		<div className="bg-white p-6 rounded-lg shadow-md">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-bold">Documents</h2>
				<button
					type="button"
					onClick={add}
					className="px-4 py-2 bg-blue-600 text-white rounded"
				>
					Add Document
				</button>
			</div>

			{docs.map((doc, idx) => (
				<div key={idx} className="mb-4 border p-4 rounded bg-gray-50 relative">
					<button
						type="button"
						onClick={() => remove(idx)}
						className="absolute top-2 right-2 text-red-500"
					>
						Remove
					</button>

					{/* Purposes */}
					<label className="block text-sm font-medium mb-1">Purposes</label>
					<select
						className="w-full border rounded p-2"
						value={doc.purposes}
						onChange={(e) =>
							update(idx, 'purposes', Array.from(e.target.selectedOptions, (o) => o.value))
						}
					>
						{documentPurposes.map((p) => (
							<option key={p.value} value={p.value}>
								{p.label}
							</option>
						))}
					</select>

					{/* File */}
					<label className="block mt-2 text-sm font-medium">File</label>
					<input
						type="file"
						className="w-full border rounded p-2"
						accept=".pdf,.jpg,.jpeg,.png"
						onChange={(e) => update(idx, 'file', (e.target as HTMLInputElement).files?.[0] || null)}
					/>

					{/* Description */}
					<label className="block mt-2 text-sm font-medium">Description</label>
					<input
						type="text"
						className="w-full border rounded p-2"
						value={doc.description}
						onChange={(e) => update(idx, 'description', e.target.value)}
					/>
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
