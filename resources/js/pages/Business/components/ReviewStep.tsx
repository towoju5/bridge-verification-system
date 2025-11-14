// ReviewStep.tsx

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

interface Country {
    code: string;
    name: string;
}

interface Address {
    street_line_1?: string;
    street_line_2?: string;
    city?: string;
    subdivision?: string;
    postal_code?: string;
    country?: string;
    proof_of_address_file?: string;
}

interface AssociatedPerson {
    first_name: string;
    last_name: string;
    birth_date?: string;
    email?: string;
    phone?: string;
    title?: string;
    ownership_percentage?: number;
    is_director?: boolean;
}

interface DocumentItem {
    purposes: string[];
    description?: string;
    file?: string;
}

interface IdentifyingInformation {
    type: string;
    issuing_country: string;
    number?: string;
    description?: string;
    expiration?: string;
    image_front?: string;
    image_back?: string;
}

interface ReviewData {
    business_legal_name: string;
    business_trade_name?: string;
    business_description?: string;
    email?: string;
    primary_website?: string;
    business_type?: string;
    business_industry?: string;
    registered_address?: Address;
    physical_address?: Address;
    associated_persons?: AssociatedPerson[];
    documents?: DocumentItem[];
    identifying_information?: IdentifyingInformation[];
}

interface InitialData {
    countries: Country[];
}

interface ReviewStepProps {
    setActiveTab: (tab: string) => void;
    onComplete: () => void;
}

export default function ReviewStep({ onComplete }: ReviewStepProps) {
    const [data, setData] = useState<ReviewData | null>(null);
    const [initialData, setInitialData] = useState<InitialData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getCountryName = useCallback(
        (code?: string) => {
            if (!code || !initialData?.countries) return "Not specified";
            return initialData.countries.find(c => c.code === code)?.name || code;
        },
        [initialData]
    );

    const getAddressString = useCallback(
        (address?: Address) => {
            if (!address) return "Not provided";
            const parts = [
                address.street_line_1,
                address.street_line_2,
                address.city,
                address.subdivision,
                address.postal_code,
                getCountryName(address.country),
            ].filter(Boolean);

            return parts.length ? parts.join(", ") : "Not provided";
        },
        [getCountryName]
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get("/api/business-customer/step/8");

                setData(res.data?.data ?? res.data?.business_data ?? null);
                setInitialData(res.data?.initialData ?? res.data?.business_data ?? null);

                if (!res.data?.data) {
                    setError("No review data received.");
                }
            } catch (err) {
                console.error("Review fetch error:", err);
                setError("Failed to load review information. Try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <p className="text-gray-600 animate-pulse">Loading review information...</p>;
    }

    if (error) {
        return <p className="text-red-600 font-medium">{error}</p>;
    }

    if (!data || !initialData) {
        return <p className="text-red-600">Unable to load information. Please retry.</p>;
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">Step 8: Review Information</h3>
            <p className="text-sm text-gray-600">
                Please verify all information before submitting.
            </p>

            {/* BUSINESS INFO */}
            <Section title="Business Information">
                <Grid>
                    <Info label="Legal Name" value={data.business_legal_name} />
                    <Info label="Trade Name" value={data.business_trade_name} />
                    <Info label="Description" value={data.business_description} />
                    <Info label="Email" value={data.email} />
                    <Info label="Website" value={data.primary_website} />
                    <Info label="Type" value={data.business_type} />
                    <Info label="Industry" value={data.business_industry} />
                </Grid>
            </Section>

            {/* ADDRESSES */}
            <Section title="Addresses">
                <div className="space-y-4 text-sm">
                    <AddressBlock
                        title="Registered Address"
                        address={data.registered_address}
                        getAddressString={getAddressString}
                    />
                    <AddressBlock
                        title="Physical Address"
                        address={data.physical_address}
                        getAddressString={getAddressString}
                    />
                </div>
            </Section>

            {/* ASSOCIATED PERSONS */}
            <Section title="Associated Persons">
                {data.associated_persons?.length ? (
                    data.associated_persons.map((p, idx) => (
                        <div key={idx} className="mb-3 border-b pb-2 text-sm">
                            <Info label="Name" value={`${p.first_name} ${p.last_name}`} />
                            <Info label="Birth Date" value={p.birth_date} />
                            <Info label="Email" value={p.email} />
                            <Info label="Phone" value={p.phone} />
                            <Info label="Title" value={p.title} />
                            <Info label="Ownership %" value={p.ownership_percentage} />
                            <Info label="Director" value={p.is_director ? "Yes" : "No"} />
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-600">No associated persons added.</p>
                )}
            </Section>

            {/* DOCUMENTS */}
            <Section title="Documents">
                {data.documents?.length ? (
                    data.documents.map((doc, idx) => (
                        <div key={idx} className="mb-3 border-b pb-2 text-sm">
                            <Info label="Purposes" value={doc.purposes.join(", ")} />
                            <Info label="Description" value={doc.description} />
                            {doc.file && <FileLink label="View File" file={doc.file} />}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-600">No documents uploaded.</p>
                )}
            </Section>

            {/* IDENTIFYING INFORMATION */}
            <Section title="Identifying Information">
                {data.identifying_information?.length ? (
                    data.identifying_information.map((id, idx) => (
                        <div key={idx} className="mb-3 border-b pb-2 text-sm">
                            <Info label="Type" value={id.type} />
                            <Info label="Issuing Country" value={getCountryName(id.issuing_country)} />
                            <Info label="Number" value={id.number} />
                            <Info label="Description" value={id.description} />
                            <Info label="Expiration" value={id.expiration} />

                            {id.image_front && <FileLink label="View Front" file={id.image_front} />}
                            {id.image_back && (
                                <FileLink label="View Back" file={id.image_back} extraClass="ml-2" />
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-600">No identifying information available.</p>
                )}
            </Section>

            {/* SUBMIT BUTTON */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={onComplete}
                    className="inline-flex items-center px-4 py-2 border border-transparent 
                    text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 
                    hover:bg-indigo-700"
                >
                    Finish
                </button>
            </div>
        </div>
    );
}

/* -------------------- Reusable Components -------------------- */

const Section = ({ title, children }: { title: string; children: any }) => (
    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-3">{title}</h4>
        {children}
    </div>
);

const Grid = ({ children }: { children: any }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">{children}</div>
);

const Info = ({ label, value }: { label: string; value: any }) => (
    <p>
        <span className="font-semibold">{label}:</span> {value || "Not provided"}
    </p>
);

const FileLink = ({ label, file, extraClass }: any) => (
    <a
        href={`/storage/${file}`}
        target="_blank"
        rel="noreferrer"
        className={`text-blue-600 text-xs ${extraClass ?? ""}`}
    >
        {label}
    </a>
);

const AddressBlock = ({
    title,
    address,
    getAddressString,
}: {
    title: string;
    address?: Address;
    getAddressString: (a?: Address) => string;
}) => (
    <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm">{getAddressString(address)}</p>

        {address?.proof_of_address_file && (
            <FileLink label="View Proof of Address" file={address.proof_of_address_file} />
        )}
    </div>
);
