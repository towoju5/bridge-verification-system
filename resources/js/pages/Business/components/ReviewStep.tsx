// ReviewStep

import React, { useEffect, useState } from "react";
import axios from "axios";

interface ReviewStepProps {
    setActiveTab: (tab: string) => void;
    onComplete: () => void;
}

const getCountryName = (code: string, countries: { code: string; name: string }[]) => {
    if (!code) return "Not specified";
    return countries.find(c => c.code === code)?.name || code;
};

const getAddressString = (address: any, countries: { code: string; name: string }[]) => {
    if (!address) return "Not provided";

    const parts = [
        address.street_line_1,
        address.street_line_2,
        address.city,
        address.subdivision,
        address.postal_code,
        getCountryName(address.country, countries),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "Not provided";
};

export default function ReviewStep({ setActiveTab, onComplete }: ReviewStepProps) {
    const [data, setData] = useState<any>(null);
    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get("/api/business-customer/step/8");
                setData(res.data.data);
                setInitialData(res.data.initialData);
            } catch (error) {
                console.error("Failed to fetch review data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <p className="text-gray-600">Loading review information...</p>;
    }

    if (!data || !initialData) {
        return <p className="text-red-600">Failed to load review information.</p>;
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Step 8: Review Information</h3>
            <p className="text-sm text-gray-600">
                Please review all information carefully before submitting.
            </p>

            {/* Business Info */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                    <p><span className="font-semibold">Legal Name:</span> {data.business_legal_name}</p>
                    <p><span className="font-semibold">Trade Name:</span> {data.business_trade_name}</p>
                    <p><span className="font-semibold">Description:</span> {data.business_description}</p>
                    <p><span className="font-semibold">Email:</span> {data.email}</p>
                    <p><span className="font-semibold">Website:</span> {data.primary_website}</p>
                    <p><span className="font-semibold">Type:</span> {data.business_type}</p>
                    <p><span className="font-semibold">Industry:</span> {data.business_industry}</p>
                </div>
            </div>

            {/* Addresses */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Addresses</h4>
                <div className="space-y-4 text-sm">
                    <div>
                        <p className="font-semibold">Registered Address</p>
                        <p>{getAddressString(data.registered_address, initialData.countries)}</p>
                        {data.registered_address?.proof_of_address_file && (
                            <a
                                href={`/storage/${data.registered_address.proof_of_address_file}`}
                                target="_blank"
                                className="text-blue-600 text-xs"
                                rel="noreferrer"
                            >
                                View Proof of Address
                            </a>
                        )}
                    </div>
                    <div>
                        <p className="font-semibold">Physical Address</p>
                        <p>{getAddressString(data.physical_address, initialData.countries)}</p>
                        {data.physical_address?.proof_of_address_file && (
                            <a
                                href={`/storage/${data.physical_address.proof_of_address_file}`}
                                target="_blank"
                                className="text-blue-600 text-xs"
                                rel="noreferrer"
                            >
                                View Proof of Address
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Associated Persons */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Associated Persons</h4>
                {data.associated_persons?.map((p: any, idx: number) => (
                    <div key={idx} className="mb-3 border-b pb-2">
                        <p><span className="font-semibold">Name:</span> {p.first_name} {p.last_name}</p>
                        <p><span className="font-semibold">Birth Date:</span> {p.birth_date}</p>
                        <p><span className="font-semibold">Email:</span> {p.email}</p>
                        <p><span className="font-semibold">Phone:</span> {p.phone}</p>
                        <p><span className="font-semibold">Title:</span> {p.title}</p>
                        <p><span className="font-semibold">Ownership %:</span> {p.ownership_percentage}</p>
                        <p><span className="font-semibold">Director:</span> {p.is_director ? "Yes" : "No"}</p>
                    </div>
                ))}
            </div>

            {/* Documents */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Documents</h4>
                {data.documents?.map((doc: any, idx: number) => (
                    <div key={idx} className="mb-3 border-b pb-2">
                        <p><span className="font-semibold">Purposes:</span> {doc.purposes.join(", ")}</p>
                        <p><span className="font-semibold">Description:</span> {doc.description}</p>
                        {doc.file && (
                            <a
                                href={`/storage/${doc.file}`}
                                target="_blank"
                                className="text-blue-600 text-xs"
                                rel="noreferrer"
                            >
                                View File
                            </a>
                        )}
                    </div>
                ))}
            </div>

            {/* Identifying Information */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Identifying Information</h4>
                {data.identifying_information?.map((id: any, idx: number) => (
                    <div key={idx} className="mb-3 border-b pb-2">
                        <p><span className="font-semibold">Type:</span> {id.type}</p>
                        <p><span className="font-semibold">Issuing Country:</span> {getCountryName(id.issuing_country, initialData.countries)}</p>
                        <p><span className="font-semibold">Number:</span> {id.number}</p>
                        <p><span className="font-semibold">Description:</span> {id.description}</p>
                        <p><span className="font-semibold">Expiration:</span> {id.expiration}</p>
                        {id.image_front && (
                            <a
                                href={`/storage/${id.image_front}`}
                                target="_blank"
                                className="text-blue-600 text-xs"
                                rel="noreferrer"
                            >
                                View Front
                            </a>
                        )}
                        {id.image_back && (
                            <a
                                href={`/storage/${id.image_back}`}
                                target="_blank"
                                className="text-blue-600 text-xs ml-2"
                                rel="noreferrer"
                            >
                                View Back
                            </a>
                        )}
                    </div>
                ))}
            </div>

            {/* Submit */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={onComplete}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Finish
                </button>
            </div>
        </div>
    );
}
