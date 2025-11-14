// resources/js/components/BusinessCustomerForm/constants/staticData.ts

// 1. Business legal entity types
export const businessTypes = [
    'cooperative',
    'corporation',
    'llc',
    'other',
    'partnership',
    'sole_prop',
    'trust',
] as const;

// 2. High-risk activities
export const highRiskActivities = [
    'adult_entertainment',
    'gambling',
    'hold_client_funds',
    'investment_services',
    'lending_banking',
    'marijuana_or_related_services',
    'money_services',
    'nicotine_tobacco_or_related_services',
    'operate_foreign_exchange_virtual_currencies_brokerage_otc',
    'pharmaceuticals',
    'precious_metals_precious_stones_jewelry',
    'safe_deposit_box_rentals',
    'third_party_payment_processing',
    'weapons_firearms_and_explosives',
    'none_of_the_above',
] as const;

// 3. Source of funds
export const sourceOfFunds = [
    'business_loans',
    'grants',
    'inter_company_funds',
    'investment_proceeds',
    'legal_settlement',
    'owners_capital',
    'pension_retirement',
    'sale_of_assets',
    'sales_of_goods_and_services',
    'tax_refund',
    'third_party_funds',
    'treasury_reserves',
] as const;

// 4. Account purpose choices
export const accountPurposes = [
  { code: 'CharitableDonations', description: 'Charitable Donations' },
  { code: 'EcommerceRetailPayments', description: 'Ecommerce Retail Payments' },
  { code: 'InvestmentPurposes', description: 'Investment Purposes' },
  { code: 'OperatingACompany', description: 'Operating a Company' },
  { code: 'Other', description: 'Other' },
  { code: 'PaymentsToFriendsOrFamilyAbroad', description: 'Payments To Friends Or Family Abroad' },
  { code: 'PersonalOrLivingExpenses', description: 'Personal Or Living Expenses' },
  { code: 'ProtectWealth', description: 'Protect Wealth' },
  { code: 'PurchaseGoodsAndServices', description: 'Purchase Goods and Services' },
  { code: 'ReceivePaymentForFreelancing', description: 'Receive Payment for Freelancing' },
  { code: 'ReceiveSalary', description: 'Receive Salary' }
] as const;


// 5. Sample industry codes (first 50 for brevity – extend as needed)
export const industryCodes = [
    { code: '111110', description: 'Soybean Farming' },
    { code: '111120', description: 'Oilseed Except Soybean Farming' },
    { code: '111130', description: 'Dry Pea And Bean Farming' },
    { code: '111140', description: 'Wheat Farming' },
    { code: '111150', description: 'Corn Farming' },
    { code: '111160', description: 'Rice Farming' },
    { code: '111191', description: 'Oilseed And Grain Combination Farming' },
    { code: '111199', description: 'All Other Grain Farming' },
    { code: '111211', description: 'Potato Farming' },
    { code: '111219', description: 'Other Vegetable Except Potato And Melon Farming' },
    { code: '111310', description: 'Orange Groves' },
    { code: '111320', description: 'Citrus Except Orange Groves' },
    { code: '111331', description: 'Apple Orchards' },
    { code: '111332', description: 'Grape Vineyards' },
    { code: '111333', description: 'Strawberry Farming' },
    { code: '111334', description: 'Berry Except Strawberry Farming' },
    { code: '111335', description: 'Tree Nut Farming' },
    { code: '111336', description: 'Fruit And Tree Nut Combination Farming' },
    { code: '111339', description: 'Other Noncitrus Fruit Farming' },
    { code: '111411', description: 'Mushroom Production' },
    { code: '111421', description: 'Nursery And Tree Production' },
    { code: '111910', description: 'Tobacco Farming' },
    { code: '112120', description: 'Dairy Cattle And Milk Production' },
    { code: '112210', description: 'Hog And Pig Farming' },
    { code: '112310', description: 'Chicken Egg Production' },
    { code: '113310', description: 'Logging' },
    { code: '211120', description: 'Crude Petroleum Extraction' },
    { code: '221111', description: 'Hydroelectric Power Generation' },
    { code: '236220', description: 'Commercial And Institutional Building Construction' },
    { code: '311811', description: 'Retail Bakeries' },
    { code: '321113', description: 'Sawmills' },
    { code: '325412', description: 'Pharmaceutical Preparation Manufacturing' },
    { code: '331110', description: 'Iron And Steel Mills And Ferroalloy Manufacturing' },
    { code: '334111', description: 'Electronic Computer Manufacturing' },
    { code: '423110', description: 'Automobile And Other Motor Vehicle Merchant Wholesalers' },
    { code: '441110', description: 'New Car Dealers' },
    { code: '445110', description: 'Supermarkets And Other Grocery Retailers' },
    { code: '481111', description: 'Scheduled Passenger Air Transportation' },
    { code: '522110', description: 'Commercial Banking' },
    { code: '541511', description: 'Custom Computer Programming Services' },
    { code: '561720', description: 'Janitorial Services' },
    { code: '611110', description: 'Elementary And Secondary Schools' },
    { code: '621111', description: 'Offices Of Physicians Except Mental Health Specialists' },
    { code: '722511', description: 'Full Service Restaurants' },
    { code: '811111', description: 'General Automotive Repair' },
    { code: '813110', description: 'Religious Organizations' },
    { code: '999999', description: 'Unclassified' },
];

// 6. Revenue ranges
export const estimatedRevenueOptions = [
    'under_10000',
    '10000_to_99999',
    '100000_to_499999',
    '500000_to_999999',
    '1000000_to_4999999',
    '5000000_to_9999999',
    '10000000_to_24999999',
    '25000000_to_49999999',
    '50000000_to_99999999',
    '100000000_plus',
] as const;

// 7. Document purposes
export const documentPurposes = [
    { value: 'business_formation', label: 'Business formation' },
    { value: 'ownership_information', label: 'Ownership information' },
    { value: 'proof_of_address', label: 'Proof of address' },
    { value: 'proof_of_tax_identification', label: 'Proof of tax identification' },
    { value: 'aml_policy', label: 'AML policy' },
    { value: 'evidence_of_good_standing', label: 'Evidence of good standing' },
    { value: 'regulatory_license_registration', label: 'Proof of regulatory license registration' },
    { value: 'other', label: 'Other' },
] as const;

// 8. Government ID types
export const governmentIdTypes = [
    'drivers_license',
    'matriculate_id',
    'military_id',
    'permanent_residency_id',
    'state_or_provincial_id',
    'visa',
    'national_id',
    'passport',
    'other',
] as const;