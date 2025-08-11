// --- TypeScript Interfaces ---
export interface Occupation {
    occupation: string;
    code: string;
}

export interface Country {
    code: string;
    name: string;
}

export interface InitialData {
    occupations: Occupation[];
    accountPurposes: string[];
    sourceOfFunds: string[];
    countries: Country[];
}

export interface BusinessCustomerFormProps {
    onSubmit: (data: any) => void;
    isLoading: boolean;
    countries: Country[];
}



// interface BusinessCustomerFormProps {
//     onSubmit: (data: any) => void;
//     isLoading: boolean;
//     countries: Country[];
// }

// // --- TypeScript Interfaces ---
// interface Occupation {
//     occupation: string;
//     code: string;
// }

// interface Country {
//     code: string;
//     name: string;
// }

// interface InitialData {
//     occupations: Occupation[];
//     accountPurposes: string[];
//     sourceOfFunds: string[];
//     countries: Country[];
// }

// // --- Default Values ---
// export default { Occupation, Country, InitialData, BusinessCustomerFormProps };