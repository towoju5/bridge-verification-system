export interface Address {
    street_line_1: string;
    street_line_2: string;
    city: string;
    subdivision: string;
    postal_code: string;
    country: string;
}

export interface AssociatedPerson {
    first_name: string;
    last_name: string;
    birth_date: string;
    email: string;
    phone: string;
    residential_address: Address;
    has_ownership: boolean;
    has_control: boolean;
    is_signer: boolean;
    is_director: boolean;
    title: string;
    ownership_percentage: number;
    relationship_established_at: string;
    identifying_information: any[];
    documents: any[];
}

export interface FormData {
    type: 'business';
    business_legal_name: string;
    business_trade_name: string;
    business_description: string;
    email: string;
    business_type: string;
    primary_website: string;
    other_websites: string[];
    registered_address: Address;
    physical_address: Address;
    signed_agreement_id: string;
    is_dao: boolean;
    compliance_screening_explanation: string;
    associated_persons: AssociatedPerson[];
    business_industry: string[];
    ownership_threshold: number;
    has_material_intermediary_ownership: boolean;
    estimated_annual_revenue_usd: string;
    expected_monthly_payments_usd: number;
    operates_in_prohibited_countries: 'yes' | 'no';
    account_purpose: string;
    account_purpose_other: string;
    high_risk_activities: string[];
    high_risk_activities_explanation: string;
    source_of_funds: string;
    source_of_funds_description: string;
    conducts_money_services: boolean;
    conducts_money_services_using_bridge: boolean;
    conducts_money_services_description: string;
    regulated_activity: {
        regulated_activities_description: string;
        primary_regulatory_authority_country: string;
        primary_regulatory_authority_name: string;
        license_number: string;
    };
    identifying_information: any[];
    documents: any[];
}