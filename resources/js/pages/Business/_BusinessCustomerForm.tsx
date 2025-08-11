import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import React, { useState } from 'react';
import IdentifyingInfoTab from './components/IdentifyingInfoTab';
import DocumentsTab from './components/DocumentsTab';

interface BusinessCustomerFormProps {
    onSubmit: (data: any) => void;
    isLoading: boolean;
}

// --- TypeScript Interfaces ---
interface Occupation {
    occupation: string;
    code: string;
}

interface Country {
    code: string;
    name: string;
}

interface InitialData {
    occupations: Occupation[];
    accountPurposes: string[];
    sourceOfFunds: string[];
    countries: Country[];
}

const BusinessCustomerForm: React.FC<BusinessCustomerFormProps> = ({ onSubmit, isLoading, countries }) => {
    // State for form data
    const [formData, setFormData] = useState({
        type: 'business',
        business_legal_name: '',
        business_trade_name: '',
        business_description: '',
        email: '',
        business_type: '',
        primary_website: '',
        other_websites: [] as string[],
        registered_address: {
            street_line_1: '',
            street_line_2: '',
            city: '',
            subdivision: '',
            postal_code: '',
            country: '',
        },
        physical_address: {
            street_line_1: '',
            street_line_2: '',
            city: '',
            subdivision: '',
            postal_code: '',
            country: '',
        },
        signed_agreement_id: '',
        is_dao: false,
        compliance_screening_explanation: '',
        associated_persons: [] as any[],
        business_industry: [] as string[],
        ownership_threshold: 25,
        has_material_intermediary_ownership: false,
        estimated_annual_revenue_usd: '',
        expected_monthly_payments_usd: 0,
        operates_in_prohibited_countries: 'no',
        account_purpose: '',
        account_purpose_other: '',
        high_risk_activities: ['none_of_the_above'] as string[],
        high_risk_activities_explanation: '',
        source_of_funds: '',
        source_of_funds_description: '',
        conducts_money_services: false,
        conducts_money_services_using_bridge: false,
        conducts_money_services_description: '',
        regulated_activity: {
            regulated_activities_description: '',
            primary_regulatory_authority_country: '',
            primary_regulatory_authority_name: '',
            license_number: '',
        },
        identifying_information: [] as Array<{
            type: string;
            issuing_country: string;
            number: string;
            description: string;
            expiration: string;
            image_front: string;
            image_back: string;
        }>,
        documents: [] as Array<{
            purposes: string[];
            file: string;
            description: string;
        }>,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState('business-info');

    // === DOCUMENT PURPOSES ===
    const documentPurposes = [
        { value: 'business_formation', label: 'Business formation' },
        { value: 'ownership_information', label: 'Ownership information' },
        { value: 'proof_of_address', label: 'Proof of address' },
        { value: 'proof_of_tax_identification', label: 'Proof of tax identification' },
        { value: 'aml_policy', label: 'AML policy' },
        { value: 'evidence_of_good_standing', label: 'Evidence of good standing' },
        { value: 'regulatory_license_registration', label: 'Proof of regulatory license registration' },
        { value: 'other', label: 'Other' },
    ];

    // === GOVERNMENT ID TYPES ===
    const governmentIdTypes = [
        'drivers_license',
        'matriculate_id',
        'military_id',
        'permanent_residency_id',
        'state_or_provincial_id',
        'visa',
        'national_id',
        'passport',
        'other',
    ];

    // Business types dropdown
    const businessTypes = [
        'cooperative', 'corporation', 'llc', 'other', 'partnership',
        'sole_prop', 'trust'
    ];

    // High risk activities
    const highRiskActivities = [
        'adult_entertainment', 'gambling', 'hold_client_funds', 'investment_services',
        'lending_banking', 'marijuana_or_related_services', 'money_services',
        'nicotine_tobacco_or_related_services', 'operate_foreign_exchange_virtual_currencies_brokerage_otc',
        'pharmaceuticals', 'precious_metals_precious_stones_jewelry', 'safe_deposit_box_rentals',
        'third_party_payment_processing', 'weapons_firearms_and_explosives', 'none_of_the_above'
    ];

    // Source of funds
    const sourceOfFunds = [
        'business_loans', 'grants', 'inter_company_funds', 'investment_proceeds',
        'legal_settlement', 'owners_capital', 'pension_retirement', 'sale_of_assets',
        'sales_of_goods_and_services', 'tax_refund', 'third_party_funds', 'treasury_reserves'
    ];

    // Industry codes (first few for example)
    const industryCodes = [
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
        { code: '111419', description: 'Other Food Crops Grown Under Cover' },
        { code: '111421', description: 'Nursery And Tree Production' },
        { code: '111422', description: 'Floriculture Production' },
        { code: '111910', description: 'Tobacco Farming' },
        { code: '111920', description: 'Cotton Farming' },
        { code: '111930', description: 'Sugarcane Farming' },
        { code: '111940', description: 'Hay Farming' },
        { code: '111991', description: 'Sugar Beet Farming' },
        { code: '111992', description: 'Peanut Farming' },
        { code: '111998', description: 'All Other Miscellaneous Crop Farming' },
        { code: '112111', description: 'Beef Cattle Ranching And Farming' },
        { code: '112112', description: 'Cattle Feedlots' },
        { code: '112120', description: 'Dairy Cattle And Milk Production' },
        { code: '112210', description: 'Hog And Pig Farming' },
        { code: '112310', description: 'Chicken Egg Production' },
        { code: '112320', description: 'Broilers And Other Meat Type Chicken Production' },
        { code: '112330', description: 'Turkey Production' },
        { code: '112340', description: 'Poultry Hatcheries' },
        { code: '112390', description: 'Other Poultry Production' },
        { code: '112410', description: 'Sheep Farming' },
        { code: '112420', description: 'Goat Farming' },
        { code: '112511', description: 'Finfish Farming And Fish Hatcheries' },
        { code: '112512', description: 'Shellfish Farming' },
        { code: '112519', description: 'Other Aquaculture' },
        { code: '112910', description: 'Apiculture' },
        { code: '112920', description: 'Horses And Other Equine Production' },
        { code: '112930', description: 'Fur Bearing Animal And Rabbit Production' },
        { code: '112990', description: 'All Other Animal Production' },
        { code: '113110', description: 'Timber Tract Operations' },
        { code: '113210', description: 'Forest Nurseries And Gathering Of Forest Products' },
        { code: '113310', description: 'Logging' },
        { code: '114111', description: 'Finfish Fishing' },
        { code: '114112', description: 'Shellfish Fishing' },
        { code: '114119', description: 'Other Marine Fishing' },
        { code: '114210', description: 'Hunting And Trapping' },
        { code: '115111', description: 'Cotton Ginning' },
        { code: '115112', description: 'Soil Preparation Planting And Cultivating' },
        { code: '115113', description: 'Crop Harvesting Primarilyby Machine' },
        { code: '115114', description: 'Postharvest Crop Activities Except Cotton Ginning' },
        { code: '115115', description: 'Farm Labor Contractors And Crew Leaders' },
        { code: '115116', description: 'Farm Management Services' },
        { code: '115210', description: 'Support Activities For Animal Production' },
        { code: '115310', description: 'Support Activities For Forestry' },
        { code: '211120', description: 'Crude Petroleum Extraction' },
        { code: '211130', description: 'Natural Gas Extraction' },
        { code: '212114', description: 'Surface Coal Mining' },
        { code: '212115', description: 'Underground Coal Mining' },
        { code: '212210', description: 'Iron Ore Mining' },
        { code: '212220', description: 'Gold Ore And Silver Ore Mining' },
        { code: '212230', description: 'Copper Nickel Lead And Zinc Mining' },
        { code: '212290', description: 'Other Metal Ore Mining' },
        { code: '212311', description: 'Dimension Stone Mining And Quarrying' },
        { code: '212312', description: 'Crushed And Broken Limestone Mining And Quarrying' },
        { code: '212313', description: 'Crushed And Broken Granite Mining And Quarrying' },
        { code: '212319', description: 'Other Crushed And Broken Stone Mining And Quarrying' },
        { code: '212321', description: 'Construction Sand And Gravel Mining' },
        { code: '212322', description: 'Industrial Sand Mining' },
        { code: '212323', description: 'Kaolin Clay And Ceramic And Refractory Minerals Mining' },
        { code: '212390', description: 'Other Nonmetallic Mineral Mining And Quarrying' },
        { code: '213111', description: 'Drilling Oil And Gas Wells' },
        { code: '213112', description: 'Support Activities For Oil And Gas Operations' },
        { code: '213113', description: 'Support Activities For Coal Mining' },
        { code: '213114', description: 'Support Activities For Metal Mining' },
        { code: '213115', description: 'Support Activities For Nonmetallic Minerals Except Fuels Mining' },
        { code: '221111', description: 'Hydroelectric Power Generation' },
        { code: '221112', description: 'Fossil Fuel Electric Power Generation' },
        { code: '221113', description: 'Nuclear Electric Power Generation' },
        { code: '221114', description: 'Solar Electric Power Generation' },
        { code: '221115', description: 'Wind Electric Power Generation' },
        { code: '221116', description: 'Geothermal Electric Power Generation' },
        { code: '221117', description: 'Biomass Electric Power Generation' },
        { code: '221118', description: 'Other Electric Power Generation' },
        { code: '221121', description: 'Electric Bulk Power Transmission And Control' },
        { code: '221122', description: 'Electric Power Distribution' },
        { code: '221210', description: 'Natural Gas Distribution' },
        { code: '221310', description: 'Water Supply And Irrigation Systems' },
        { code: '221320', description: 'Sewage Treatment Facilities' },
        { code: '221330', description: 'Steam And Air Conditioning Supply' },
        { code: '236115', description: 'New Single Family Housing Construction Except For Sale Builders' },
        { code: '236116', description: 'New Multifamily Housing Construction Except For Sale Builders' },
        { code: '236117', description: 'New Housing For Sale Builders' },
        { code: '236118', description: 'Residential Remodelers' },
        { code: '236210', description: 'Industrial Building Construction' },
        { code: '236220', description: 'Commercial And Institutional Building Construction' },
        { code: '237110', description: 'Water And Sewer Line And Related Structures Construction' },
        { code: '237120', description: 'Oil And Gas Pipeline And Related Structures Construction' },
        { code: '237130', description: 'Power And Communication Line And Related Structures Construction' },
        { code: '237210', description: 'Land Subdivision' },
        { code: '237310', description: 'Highway Street And Bridge Construction' },
        { code: '237990', description: 'Other Heavy And Civil Engineering Construction' },
        { code: '238110', description: 'Poured Concrete Foundation And Structure Contractors' },
        { code: '238111', description: 'Residential Poured Concrete Foundation And Structure Contractors' },
        { code: '238112', description: 'Non Residential Poured Concrete Foundation And Structure Contractors' },
        { code: '238121', description: 'Residential Structural Steel And Precast Concrete Contractors' },
        { code: '238122', description: 'Non Residential Structural Steel And Precast Concrete Contractors' },
        { code: '238131', description: 'Residential Framing Contractors' },
        { code: '238132', description: 'Non Residential Framing Contractors' },
        { code: '238140', description: 'Masonry Contractors' },
        { code: '238141', description: 'Residential Masonry Contractors' },
        { code: '238142', description: 'Non Residential Masonry Contractors' },
        { code: '238151', description: 'Residential Glass And Glazing Contractors' },
        { code: '238152', description: 'Non Residential Glass And Glazing Contractors' },
        { code: '238160', description: 'Roofing Contractors' },
        { code: '238161', description: 'Residential Roofing Contractors' },
        { code: '238162', description: 'Non Residential Roofing Contractors' },
        { code: '238171', description: 'Residential Siding Contractors' },
        { code: '238172', description: 'Non Residential Siding Contractors' },
        { code: '238191', description: 'Residential Other Foundation Structure And Building Exterior Contractors' },
        { code: '238192', description: 'Non Residential Other Foundation Structure And Building Exterior Contractors' },
        { code: '238210', description: 'Electrical Contractors And Other Wiring Installation Contractors' },
        { code: '238211', description: 'Residential Electrical Contractors And Other Wiring Installation Contractors' },
        { code: '238212', description: 'Non Residential Electrical Contractors And Other Wiring Installation Contractors' },
        { code: '238220', description: 'Plumbing Heating And Air Conditioning Contractors' },
        { code: '238221', description: 'Residential Plumbing Heating And Air Conditioning Contractors' },
        { code: '238222', description: 'Non Residential Plumbing Heating And Air Conditioning Contractors' },
        { code: '238291', description: 'Residential Other Building Equipment Contractors' },
        { code: '238292', description: 'Non Residential Other Building Equipment Contractors' },
        { code: '238311', description: 'Residential Drywall And Insulation Contractors' },
        { code: '238312', description: 'Non Residential Drywall And Insulation Contractors' },
        { code: '238321', description: 'Residential Painting And Wall Covering Contractors' },
        { code: '238322', description: 'Non Residential Painting And Wall Covering Contractors' },
        { code: '238331', description: 'Residential Flooring Contractors' },
        { code: '238332', description: 'Non Residential Flooring Contractors' },
        { code: '238341', description: 'Residential Tile And Terrazzo Contractors' },
        { code: '238342', description: 'Non Residential Tile And Terrazzo Contractors' },
        { code: '238350', description: 'Finish Carpentry Contractors' },
        { code: '238351', description: 'Residential Finish Carpentry Contractors' },
        { code: '238352', description: 'Non Residential Finish Carpentry Contractors' },
        { code: '238391', description: 'Residential Other Building Finishing Contractors' },
        { code: '238392', description: 'Non Residential Other Building Finishing Contractors' },
        { code: '238911', description: 'Residential Site Preparation Contractors' },
        { code: '238912', description: 'Non Residential Site Preparation Contractors' },
        { code: '238990', description: 'All Other Specialty Trade Contractors' },
        { code: '238991', description: 'Residential All Other Specialty Trade Contractors' },
        { code: '238992', description: 'Non Residential All Other Specialty Trade Contractors' },
        { code: '311111', description: 'Dog And Cat Food Manufacturing' },
        { code: '311119', description: 'Other Animal Food Manufacturing' },
        { code: '311211', description: 'Flour Milling' },
        { code: '311212', description: 'Rice Milling' },
        { code: '311213', description: 'Malt Manufacturing' },
        { code: '311221', description: 'Wet Corn Milling And Starch Manufacturing' },
        { code: '311224', description: 'Soybean And Other Oilseed Processing' },
        { code: '311225', description: 'Fats And Oils Refining And Blending' },
        { code: '311230', description: 'Breakfast Cereal Manufacturing' },
        { code: '311313', description: 'Beet Sugar Manufacturing' },
        { code: '311314', description: 'Cane Sugar Manufacturing' },
        { code: '311340', description: 'Nonchocolate Confectionery Manufacturing' },
        { code: '311351', description: 'Chocolate And Confectionery Manufacturing From Cacao Beans' },
        { code: '311352', description: 'Confectionery Manufacturing From Purchased Chocolate' },
        { code: '311411', description: 'Frozen Fruit Juice And Vegetable Manufacturing' },
        { code: '311412', description: 'Frozen Specialty Food Manufacturing' },
        { code: '311421', description: 'Fruit And Vegetable Canning' },
        { code: '311422', description: 'Specialty Canning' },
        { code: '311423', description: 'Dried And Dehydrated Food Manufacturing' },
        { code: '311511', description: 'Fluid Milk Manufacturing' },
        { code: '311512', description: 'Creamery Butter Manufacturing' },
        { code: '311513', description: 'Cheese Manufacturing' },
        { code: '311514', description: 'Dry Condensed And Evaporated Dairy Product Manufacturing' },
        { code: '311520', description: 'Ice Cream And Frozen Dessert Manufacturing' },
        { code: '311611', description: 'Animal Except Poultry Slaughtering' },
        { code: '311612', description: 'Meat Processed From Carcasses' },
        { code: '311613', description: 'Rendering And Meat Byproduct Processing' },
        { code: '311615', description: 'Poultry Processing' },
        { code: '311710', description: 'Seafood Product Preparation And Packaging' },
        { code: '311811', description: 'Retail Bakeries' },
        { code: '311812', description: 'Commercial Bakeries' },
        { code: '311813', description: 'Frozen Cakes Pies And Other Pastries Manufacturing' },
        { code: '311821', description: 'Cookie And Cracker Manufacturing' },
        { code: '311824', description: 'Dry Pasta Dough And Flour Mixes Manufacturing From Purchased Flour' },
        { code: '311830', description: 'Tortilla Manufacturing' },
        { code: '311911', description: 'Roasted Nuts And Peanut Butter Manufacturing' },
        { code: '311919', description: 'Other Snack Food Manufacturing' },
        { code: '311920', description: 'Coffee And Tea Manufacturing' },
        { code: '311930', description: 'Flavoring Syrup And Concentrate Manufacturing' },
        { code: '311941', description: 'Mayonnaise Dressing And Other Prepared Sauce Manufacturing' },
        { code: '311942', description: 'Spice And Extract Manufacturing' },
        { code: '311991', description: 'Perishable Prepared Food Manufacturing' },
        { code: '311999', description: 'All Other Miscellaneous Food Manufacturing' },
        { code: '312111', description: 'Soft Drink Manufacturing' },
        { code: '312112', description: 'Bottled Water Manufacturing' },
        { code: '312113', description: 'Ice Manufacturing' },
        { code: '312120', description: 'Breweries' },
        { code: '312130', description: 'Wineries' },
        { code: '312140', description: 'Distilleries' },
        { code: '312230', description: 'Tobacco Manufacturing' },
        { code: '313110', description: 'Fiber Yarn And Thread Mills' },
        { code: '313210', description: 'Broadwoven Fabric Mills' },
        { code: '313220', description: 'Narrow Fabric Mills And Schiffli Machine Embroidery' },
        { code: '313230', description: 'Nonwoven Fabric Mills' },
        { code: '313240', description: 'Knit Fabric Mills' },
        { code: '313310', description: 'Textile And Fabric Finishing Mills' },
        { code: '313320', description: 'Fabric Coating Mills' },
        { code: '314110', description: 'Carpet And Rug Mills' },
        { code: '314120', description: 'Curtain And Linen Mills' },
        { code: '314910', description: 'Textile Bag And Canvas Mills' },
        { code: '314994', description: 'Rope Cordage Twine Tire Cord And Tire Fabric Mills' },
        { code: '314999', description: 'All Other Miscellaneous Textile Product Mills' },
        { code: '315120', description: 'Apparel Knitting Mills' },
        { code: '315210', description: 'Cut And Sew Apparel Contractors' },
        { code: '315250', description: 'Cut And Sew Apparel Manufacturing Except Contractors' },
        { code: '315990', description: 'Apparel Accessories And Other Apparel Manufacturing' },
        { code: '316110', description: 'Leather And Hide Tanning And Finishing' },
        { code: '316210', description: 'Footwear Manufacturing' },
        { code: '316990', description: 'Other Leather And Allied Product Manufacturing' },
        { code: '321113', description: 'Sawmills' },
        { code: '321114', description: 'Wood Preservation' },
        { code: '321211', description: 'Hardwood Veneer And Plywood Manufacturing' },
        { code: '321212', description: 'Softwood Veneer And Plywood Manufacturing' },
        { code: '321215', description: 'Engineered Wood Member Manufacturing' },
        { code: '321219', description: 'Reconstituted Wood Product Manufacturing' },
        { code: '321911', description: 'Wood Window And Door Manufacturing' },
        { code: '321912', description: 'Cut Stock Resawing Lumber And Planing' },
        { code: '321918', description: 'Other Millwork Including Flooring' },
        { code: '321920', description: 'Wood Container And Pallet Manufacturing' },
        { code: '321991', description: 'Manufactured Home Mobile Home Manufacturing' },
        { code: '321992', description: 'Prefabricated Wood Building Manufacturing' },
        { code: '321999', description: 'All Other Miscellaneous Wood Product Manufacturing' },
        { code: '322110', description: 'Pulp Mills' },
        { code: '322120', description: 'Paper Mills' },
        { code: '322130', description: 'Paperboard Mills' },
        { code: '322211', description: 'Corrugated And Solid Fiber Box Manufacturing' },
        { code: '322212', description: 'Folding Paperboard Box Manufacturing' },
        { code: '322219', description: 'Other Paperboard Container Manufacturing' },
        { code: '322220', description: 'Paper Bag And Coated And Treated Paper Manufacturing' },
        { code: '322230', description: 'Stationery Product Manufacturing' },
        { code: '322291', description: 'Sanitary Paper Product Manufacturing' },
        { code: '322299', description: 'All Other Converted Paper Product Manufacturing' },
        { code: '323111', description: 'Commercial Printing Except Screen And Books' },
        { code: '323113', description: 'Commercial Screen Printing' },
        { code: '323117', description: 'Books Printing' },
        { code: '323120', description: 'Support Activities For Printing' },
        { code: '324110', description: 'Petroleum Refineries' },
        { code: '324121', description: 'Asphalt Paving Mixture And Block Manufacturing' },
        { code: '324122', description: 'Asphalt Shingle And Coating Materials Manufacturing' },
        { code: '324191', description: 'Petroleum Lubricating Oil And Grease Manufacturing' },
        { code: '324199', description: 'All Other Petroleum And Coal Products Manufacturing' },
        { code: '325110', description: 'Petrochemical Manufacturing' },
        { code: '325120', description: 'Industrial Gas Manufacturing' },
        { code: '325130', description: 'Synthetic Dye And Pigment Manufacturing' },
        { code: '325180', description: 'Other Basic Inorganic Chemical Manufacturing' },
        { code: '325193', description: 'Ethyl Alcohol Manufacturing' },
        { code: '325194', description: 'Cyclic Crude Intermediate And Gum And Wood Chemical Manufacturing' },
        { code: '325199', description: 'All Other Basic Organic Chemical Manufacturing' },
        { code: '325211', description: 'Plastics Material And Resin Manufacturing' },
        { code: '325212', description: 'Synthetic Rubber Manufacturing' },
        { code: '325220', description: 'Artificial And Synthetic Fibers And Filaments Manufacturing' },
        { code: '325311', description: 'Nitrogenous Fertilizer Manufacturing' },
        { code: '325312', description: 'Phosphatic Fertilizer Manufacturing' },
        { code: '325314', description: 'Fertilizer Mixing Only Manufacturing' },
        { code: '325315', description: 'Compost Manufacturing' },
        { code: '325320', description: 'Pesticide And Other Agricultural Chemical Manufacturing' },
        { code: '325411', description: 'Medicinal And Botanical Manufacturing' },
        { code: '325412', description: 'Pharmaceutical Preparation Manufacturing' },
        { code: '325413', description: 'In Vitro Diagnostic Substance Manufacturing' },
        { code: '325414', description: 'Biological Product Except Diagnostic Manufacturing' },
        { code: '325510', description: 'Paint And Coating Manufacturing' },
        { code: '325520', description: 'Adhesive Manufacturing' },
        { code: '325611', description: 'Soap And Other Detergent Manufacturing' },
        { code: '325612', description: 'Polish And Other Sanitation Good Manufacturing' },
        { code: '325613', description: 'Surface Active Agent Manufacturing' },
        { code: '325620', description: 'Toilet Preparation Manufacturing' },
        { code: '325910', description: 'Printing Ink Manufacturing' },
        { code: '325920', description: 'Explosives Manufacturing' },
        { code: '325991', description: 'Custom Compounding Of Purchased Resins' },
        { code: '325992', description: 'Photographic Film Paper Plate Chemical And Copy Toner Manufacturing' },
        { code: '325998', description: 'All Other Miscellaneous Chemical Product And Preparation Manufacturing' },
        { code: '326111', description: 'Plastics Bag And Pouch Manufacturing' },
        { code: '326112', description: 'Plastics Packaging Film And Sheet Including Laminated Manufacturing' },
        { code: '326113', description: 'Unlaminated Plastics Film And Sheet Except Packaging Manufacturing' },
        { code: '326121', description: 'Unlaminated Plastics Profile Shape Manufacturing' },
        { code: '326122', description: 'Plastics Pipe And Pipe Fitting Manufacturing' },
        { code: '326130', description: 'Laminated Plastics Plate Sheet Except Packaging And Shape Manufacturing' },
        { code: '326140', description: 'Polystyrene Foam Product Manufacturing' },
        { code: '326150', description: 'Urethane And Other Foam Product Except Polystyrene Manufacturing' },
        { code: '326160', description: 'Plastics Bottle Manufacturing' },
        { code: '326191', description: 'Plastics Plumbing Fixture Manufacturing' },
        { code: '326199', description: 'All Other Plastics Product Manufacturing' },
        { code: '326211', description: 'Tire Manufacturing Except Retreading' },
        { code: '326212', description: 'Tire Retreading' },
        { code: '326220', description: 'Rubber And Plastics Hoses And Belting Manufacturing' },
        { code: '326291', description: 'Rubber Product Manufacturing For Mechanical Use' },
        { code: '326299', description: 'All Other Rubber Product Manufacturing' },
        { code: '327110', description: 'Pottery Ceramics And Plumbing Fixture Manufacturing' },
        { code: '327120', description: 'Clay Building Material And Refractories Manufacturing' },
        { code: '327211', description: 'Flat Glass Manufacturing' },
        { code: '327212', description: 'Other Pressed And Blown Glass And Glassware Manufacturing' },
        { code: '327213', description: 'Glass Container Manufacturing' },
        { code: '327215', description: 'Glass Product Manufacturing Made Of Purchased Glass' },
        { code: '327310', description: 'Cement Manufacturing' },
        { code: '327320', description: 'Ready Mix Concrete Manufacturing' },
        { code: '327331', description: 'Concrete Block And Brick Manufacturing' },
        { code: '327332', description: 'Concrete Pipe Manufacturing' },
        { code: '327390', description: 'Other Concrete Product Manufacturing' },
        { code: '327410', description: 'Lime Manufacturing' },
        { code: '327420', description: 'Gypsum Product Manufacturing' },
        { code: '327910', description: 'Abrasive Product Manufacturing' },
        { code: '327991', description: 'Cut Stone And Stone Product Manufacturing' },
        { code: '327992', description: 'Ground Or Treated Mineral And Earth Manufacturing' },
        { code: '327993', description: 'Mineral Wool Manufacturing' },
        { code: '327999', description: 'All Other Miscellaneous Nonmetallic Mineral Product Manufacturing' },
        { code: '331110', description: 'Iron And Steel Mills And Ferroalloy Manufacturing' },
        { code: '331210', description: 'Iron And Steel Pipe And Tube Manufacturing From Purchased Steel' },
        { code: '331221', description: 'Rolled Steel Shape Manufacturing' },
        { code: '331222', description: 'Steel Wire Drawing' },
        { code: '331313', description: 'Alumina Refining And Primary Aluminum Production' },
        { code: '331314', description: 'Secondary Smelting And Alloying Of Aluminum' },
        { code: '331315', description: 'Aluminum Sheet Plate And Foil Manufacturing' },
        { code: '331318', description: 'Other Aluminum Rolling Drawing And Extruding' },
        { code: '331410', description: 'Nonferrous Metal Except Aluminum Smelting And Refining' },
        { code: '331420', description: 'Copper Rolling Drawing Extruding And Alloying' },
        { code: '331491', description: 'Nonferrous Metal Except Copper And Aluminum Rolling Drawing And Extruding' },
        { code: '331492', description: 'Secondary Smelting Refining And Alloying Of Nonferrous Metal Except Copper And Aluminum' },
        { code: '331511', description: 'Iron Foundries' },
        { code: '331512', description: 'Steel Investment Foundries' },
        { code: '331513', description: 'Steel Foundries Except Investment' },
        { code: '331523', description: 'Nonferrous Metal Die Casting Foundries' },
        { code: '331524', description: 'Aluminum Foundries Except Die Casting' },
        { code: '331529', description: 'Other Nonferrous Metal Foundries Except Die Casting' },
        { code: '332111', description: 'Iron And Steel Forging' },
        { code: '332112', description: 'Nonferrous Forging' },
        { code: '332114', description: 'Custom Roll Forming' },
        { code: '332117', description: 'Powder Metallurgy Part Manufacturing' },
        { code: '332119', description: 'Metal Crown Closure And Other Metal Stamping Except Automotive' },
        { code: '332215', description: 'Metal Kitchen Cookware Utensil Cutlery And Flatware Except Precious Manufacturing' },
        { code: '332216', description: 'Saw Blade And Handtool Manufacturing' },
        { code: '332311', description: 'Prefabricated Metal Building And Component Manufacturing' },
        { code: '332312', description: 'Fabricated Structural Metal Manufacturing' },
        { code: '332313', description: 'Plate Work Manufacturing' },
        { code: '332321', description: 'Metal Window And Door Manufacturing' },
        { code: '332322', description: 'Sheet Metal Work Manufacturing' },
        { code: '332323', description: 'Ornamental And Architectural Metal Work Manufacturing' },
        { code: '332410', description: 'Power Boiler And Heat Exchanger Manufacturing' },
        { code: '332420', description: 'Metal Tank Heavy Gauge Manufacturing' },
        { code: '332431', description: 'Metal Can Manufacturing' },
        { code: '332439', description: 'Other Metal Container Manufacturing' },
        { code: '332510', description: 'Hardware Manufacturing' },
        { code: '332613', description: 'Spring Manufacturing' },
        { code: '332618', description: 'Other Fabricated Wire Product Manufacturing' },
        { code: '332710', description: 'Machine Shops' },
        { code: '332721', description: 'Precision Turned Product Manufacturing' },
        { code: '332722', description: 'Bolt Nut Screw Rivet And Washer Manufacturing' },
        { code: '332811', description: 'Metal Heat Treating' },
        { code: '332812', description: 'Metal Coating Engraving Except Jewelry And Silverware And Allied Servicesto Manufacturers' },
        { code: '332813', description: 'Electroplating Plating Polishing Anodizing And Coloring' },
        { code: '332911', description: 'Industrial Valve Manufacturing' },
        { code: '332912', description: 'Fluid Power Valve And Hose Fitting Manufacturing' },
        { code: '332913', description: 'Plumbing Fixture Fitting And Trim Manufacturing' },
        { code: '332919', description: 'Other Metal Valve And Pipe Fitting Manufacturing' },
        { code: '332991', description: 'Ball And Roller Bearing Manufacturing' },
        { code: '332992', description: 'Small Arms Ammunition Manufacturing' },
        { code: '332993', description: 'Ammunition Except Small Arms Manufacturing' },
        { code: '332994', description: 'Small Arms Ordnance And Ordnance Accessories Manufacturing' },
        { code: '332996', description: 'Fabricated Pipe And Pipe Fitting Manufacturing' },
        { code: '332999', description: 'All Other Miscellaneous Fabricated Metal Product Manufacturing' },
        { code: '333111', description: 'Farm Machinery And Equipment Manufacturing' },
        { code: '333112', description: 'Lawn And Garden Tractor And Home Lawn And Garden Equipment Manufacturing' },
        { code: '333120', description: 'Construction Machinery Manufacturing' },
        { code: '333131', description: 'Mining Machinery And Equipment Manufacturing' },
        { code: '333132', description: 'Oil And Gas Field Machinery And Equipment Manufacturing' },
        { code: '333241', description: 'Food Product Machinery Manufacturing' },
        { code: '333242', description: 'Semiconductor Machinery Manufacturing' },
        { code: '333243', description: 'Sawmill Woodworking And Paper Machinery Manufacturing' },
        { code: '333248', description: 'All Other Industrial Machinery Manufacturing' },
        { code: '333310', description: 'Commercial And Service Industry Machinery Manufacturing' },
        { code: '333413', description: 'Industrial And Commercial Fan And Blower And Air Purification Equipment Manufacturing' },
        { code: '333414', description: 'Heating Equipment Except Warm Air Furnaces Manufacturing' },
        { code: '333415', description: 'Air Conditioning And Warm Air Heating Equipment And Commercial And Industrial Refrigeration Equipment Manufacturing' },
        { code: '333511', description: 'Industrial Mold Manufacturing' },
        { code: '333514', description: 'Special Die And Tool Die Set Jig And Fixture Manufacturing' },
        { code: '333515', description: 'Cutting Tool And Machine Tool Accessory Manufacturing' },
        { code: '333517', description: 'Machine Tool Manufacturing' },
        { code: '333519', description: 'Rolling Mill And Other Metalworking Machinery Manufacturing' },
        { code: '333611', description: 'Turbine And Turbine Generator Set Units Manufacturing' },
        { code: '333612', description: 'Speed Changer Industrial High Speed Drive And Gear Manufacturing' },
        { code: '333613', description: 'Mechanical Power Transmission Equipment Manufacturing' },
        { code: '333618', description: 'Other Engine Equipment Manufacturing' },
        { code: '333912', description: 'Air And Gas Compressor Manufacturing' },
        { code: '333914', description: 'Measuring Dispensing And Other Pumping Equipment Manufacturing' },
        { code: '333921', description: 'Elevator And Moving Stairway Manufacturing' },
        { code: '333922', description: 'Conveyor And Conveying Equipment Manufacturing' },
        { code: '333923', description: 'Overhead Traveling Crane Hoist And Monorail System Manufacturing' },
        { code: '333924', description: 'Industrial Truck Tractor Trailer And Stacker Machinery Manufacturing' },
        { code: '333991', description: 'Power Driven Handtool Manufacturing' },
        { code: '333992', description: 'Welding And Soldering Equipment Manufacturing' },
        { code: '333993', description: 'Packaging Machinery Manufacturing' },
        { code: '333994', description: 'Industrial Process Furnace And Oven Manufacturing' },
        { code: '333995', description: 'Fluid Power Cylinder And Actuator Manufacturing' },
        { code: '333996', description: 'Fluid Power Pump And Motor Manufacturing' },
        { code: '333998', description: 'All Other Miscellaneous General Purpose Machinery Manufacturing' },
        { code: '334111', description: 'Electronic Computer Manufacturing' },
        { code: '334112', description: 'Computer Storage Device Manufacturing' },
        { code: '334118', description: 'Computer Terminal And Other Computer Peripheral Equipment Manufacturing' },
        { code: '334210', description: 'Telephone Apparatus Manufacturing' },
        { code: '334220', description: 'Radio And Television Broadcasting And Wireless Communications Equipment Manufacturing' },
        { code: '334290', description: 'Other Communications Equipment Manufacturing' },
        { code: '334310', description: 'Audio And Video Equipment Manufacturing' },
        { code: '334412', description: 'Bare Printed Circuit Board Manufacturing' },
        { code: '334413', description: 'Semiconductor And Related Device Manufacturing' },
        { code: '334416', description: 'Capacitor Resistor Coil Transformer And Other Inductor Manufacturing' },
        { code: '334417', description: 'Electronic Connector Manufacturing' },
        { code: '334418', description: 'Printed Circuit Assembly Electronic Assembly Manufacturing' },
        { code: '334419', description: 'Other Electronic Component Manufacturing' },
        { code: '334510', description: 'Electromedical And Electrotherapeutic Apparatus Manufacturing' },
        { code: '334511', description: 'Search Detection Navigation Guidance Aeronautical And Nautical System And Instrument Manufacturing' },
        { code: '334512', description: 'Automatic Environmental Control Manufacturing For Residential Commercial And Appliance Use' },
        { code: '334513', description: 'Instruments And Related Products Manufacturing For Measuring Displaying And Controlling Industrial Process Variables' },
        { code: '334514', description: 'Totalizing Fluid Meter And Counting Device Manufacturing' },
        { code: '334515', description: 'Instrument Manufacturing For Measuring And Testing Electricity And Electrical Signals' },
        { code: '334516', description: 'Analytical Laboratory Instrument Manufacturing' },
        { code: '334517', description: 'Irradiation Apparatus Manufacturing' },
        { code: '334519', description: 'Other Measuring And Controlling Device Manufacturing' },
        { code: '334610', description: 'Manufacturing And Reproducing Magnetic And Optical Media' },
        { code: '335131', description: 'Residential Electric Lighting Fixture Manufacturing' },
        { code: '335132', description: 'Commercial Industrial And Institutional Electric Lighting Fixture Manufacturing' },
        { code: '335139', description: 'Electric Lamp Bulb And Other Lighting Equipment Manufacturing' },
        { code: '335210', description: 'Small Electrical Appliance Manufacturing' },
        { code: '335220', description: 'Major Household Appliance Manufacturing' },
        { code: '335311', description: 'Power Distribution And Specialty Transformer Manufacturing' },
        { code: '335312', description: 'Motor And Generator Manufacturing' },
        { code: '335313', description: 'Switchgear And Switchboard Apparatus Manufacturing' },
        { code: '335314', description: 'Relay And Industrial Control Manufacturing' },
        { code: '335910', description: 'Battery Manufacturing' },
        { code: '335921', description: 'Fiber Optic Cable Manufacturing' },
        { code: '335929', description: 'Other Communication And Energy Wire Manufacturing' },
        { code: '335931', description: 'Current Carrying Wiring Device Manufacturing' },
        { code: '335932', description: 'Noncurrent Carrying Wiring Device Manufacturing' },
        { code: '335991', description: 'Carbon And Graphite Product Manufacturing' },
        { code: '335999', description: 'All Other Miscellaneous Electrical Equipment And Component Manufacturing' },
        { code: '336110', description: 'Automobile And Light Duty Motor Vehicle Manufacturing' },
        { code: '336120', description: 'Heavy Duty Truck Manufacturing' },
        { code: '336211', description: 'Motor Vehicle Body Manufacturing' },
        { code: '336212', description: 'Truck Trailer Manufacturing' },
        { code: '336213', description: 'Motor Home Manufacturing' },
        { code: '336214', description: 'Travel Trailer And Camper Manufacturing' },
        { code: '336310', description: 'Motor Vehicle Gasoline Engine And Engine Parts Manufacturing' },
        { code: '336320', description: 'Motor Vehicle Electrical And Electronic Equipment Manufacturing' },
        { code: '336330', description: 'Motor Vehicle Steering And Suspension Components Except Spring Manufacturing' },
        { code: '336340', description: 'Motor Vehicle Brake System Manufacturing' },
        { code: '336350', description: 'Motor Vehicle Transmission And Power Train Parts Manufacturing' },
        { code: '336360', description: 'Motor Vehicle Seating And Interior Trim Manufacturing' },
        { code: '336370', description: 'Motor Vehicle Metal Stamping' },
        { code: '336390', description: 'Other Motor Vehicle Parts Manufacturing' },
        { code: '336411', description: 'Aircraft Manufacturing' },
        { code: '336412', description: 'Aircraft Engine And Engine Parts Manufacturing' },
        { code: '336413', description: 'Other Aircraft Parts And Auxiliary Equipment Manufacturing' },
        { code: '336414', description: 'Guided Missile And Space Vehicle Manufacturing' },
        { code: '336415', description: 'Guided Missile And Space Vehicle Propulsion Unit And Propulsion Unit Parts Manufacturing' },
        { code: '336419', description: 'Other Guided Missile And Space Vehicle Parts And Auxiliary Equipment Manufacturing' },
        { code: '336510', description: 'Railroad Rolling Stock Manufacturing' },
        { code: '336611', description: 'Ship Building And Repairing' },
        { code: '336612', description: 'Boat Building' },
        { code: '336991', description: 'Motorcycle Bicycle And Parts Manufacturing' },
        { code: '336992', description: 'Military Armored Vehicle Tank And Tank Component Manufacturing' },
        { code: '336999', description: 'All Other Transportation Equipment Manufacturing' },
        { code: '337110', description: 'Wood Kitchen Cabinet And Countertop Manufacturing' },
        { code: '337121', description: 'Upholstered Household Furniture Manufacturing' },
        { code: '337122', description: 'Nonupholstered Wood Household Furniture Manufacturing' },
        { code: '337126', description: 'Household Furniture Except Wood And Upholstered Manufacturing' },
        { code: '337127', description: 'Institutional Furniture Manufacturing' },
        { code: '337211', description: 'Wood Office Furniture Manufacturing' },
        { code: '337212', description: 'Custom Architectural Woodwork And Millwork Manufacturing' },
        { code: '337214', description: 'Office Furniture Except Wood Manufacturing' },
        { code: '337215', description: 'Showcase Partition Shelving And Locker Manufacturing' },
        { code: '337910', description: 'Mattress Manufacturing' },
        { code: '337920', description: 'Blind And Shade Manufacturing' },
        { code: '339112', description: 'Surgical And Medical Instrument Manufacturing' },
        { code: '339113', description: 'Surgical Appliance And Supplies Manufacturing' },
        { code: '339114', description: 'Dental Equipment And Supplies Manufacturing' },
        { code: '339115', description: 'Ophthalmic Goods Manufacturing' },
        { code: '339116', description: 'Dental Laboratories' },
        { code: '339910', description: 'Jewelry And Silverware Manufacturing' },
        { code: '339920', description: 'Sporting And Athletic Goods Manufacturing' },
        { code: '339930', description: 'Doll Toy And Game Manufacturing' },
        { code: '339940', description: 'Office Supplies Except Paper Manufacturing' },
        { code: '339950', description: 'Sign Manufacturing' },
        { code: '339991', description: 'Gasket Packing And Sealing Device Manufacturing' },
        { code: '339992', description: 'Musical Instrument Manufacturing' },
        { code: '339993', description: 'Fastener Button Needle And Pin Manufacturing' },
        { code: '339994', description: 'Broom Brush And Mop Manufacturing' },
        { code: '339995', description: 'Burial Casket Manufacturing' },
        { code: '339999', description: 'All Other Miscellaneous Manufacturing' },
        { code: '423110', description: 'Automobile And Other Motor Vehicle Merchant Wholesalers' },
        { code: '423120', description: 'Motor Vehicle Supplies And New Parts Merchant Wholesalers' },
        { code: '423130', description: 'Tire And Tube Merchant Wholesalers' },
        { code: '423140', description: 'Motor Vehicle Parts Used Merchant Wholesalers' },
        { code: '423210', description: 'Furniture Merchant Wholesalers' },
        { code: '423220', description: 'Home Furnishing Merchant Wholesalers' },
        { code: '423310', description: 'Lumber Plywood Millwork And Wood Panel Merchant Wholesalers' },
        { code: '423320', description: 'Brick Stone And Related Construction Material Merchant Wholesalers' },
        { code: '423330', description: 'Roofing Siding And Insulation Material Merchant Wholesalers' },
        { code: '423390', description: 'Other Construction Material Merchant Wholesalers' },
        { code: '423410', description: 'Photographic Equipment And Supplies Merchant Wholesalers' },
        { code: '423420', description: 'Office Equipment Merchant Wholesalers' },
        { code: '423430', description: 'Computer And Computer Peripheral Equipment And Software Merchant Wholesalers' },
        { code: '423440', description: 'Other Commercial Equipment Merchant Wholesalers' },
        { code: '423450', description: 'Medical Dental And Hospital Equipment And Supplies Merchant Wholesalers' },
        { code: '423460', description: 'Ophthalmic Goods Merchant Wholesalers' },
        { code: '423490', description: 'Other Professional Equipment And Supplies Merchant Wholesalers' },
        { code: '423510', description: 'Metal Service Centers And Other Metal Merchant Wholesalers' },
        { code: '423520', description: 'Coal And Other Mineral And Ore Merchant Wholesalers' },
        { code: '423610', description: 'Electrical Apparatus And Equipment Wiring Supplies And Related Equipment Merchant Wholesalers' },
        { code: '423620', description: 'Household Appliances Electric Housewares And Consumer Electronics Merchant Wholesalers' },
        { code: '423690', description: 'Other Electronic Parts And Equipment Merchant Wholesalers' },
        { code: '423710', description: 'Hardware Merchant Wholesalers' },
        { code: '423720', description: 'Plumbing And Heating Equipment And Supplies Hydronics Merchant Wholesalers' },
        { code: '423730', description: 'Warm Air Heating And Air Conditioning Equipment And Supplies Merchant Wholesalers' },
        { code: '423740', description: 'Refrigeration Equipment And Supplies Merchant Wholesalers' },
        { code: '423810', description: 'Construction And Mining Except Oil Well Machinery And Equipment Merchant Wholesalers' },
        { code: '423820', description: 'Farm And Garden Machinery And Equipment Merchant Wholesalers' },
        { code: '423830', description: 'Industrial Machinery And Equipment Merchant Wholesalers' },
        { code: '423840', description: 'Industrial Supplies Merchant Wholesalers' },
        { code: '423850', description: 'Service Establishment Equipment And Supplies Merchant Wholesalers' },
        { code: '423860', description: 'Transportation Equipment And Supplies Except Motor Vehicle Merchant Wholesalers' },
        { code: '423910', description: 'Sporting And Recreational Goods And Supplies Merchant Wholesalers' },
        { code: '423920', description: 'Toy And Hobby Goods And Supplies Merchant Wholesalers' },
        { code: '423930', description: 'Recyclable Material Merchant Wholesalers' },
        { code: '423940', description: 'Jewelry Watch Precious Stone And Precious Metal Merchant Wholesalers' },
        { code: '423990', description: 'Other Miscellaneous Durable Goods Merchant Wholesalers' },
        { code: '424110', description: 'Printing And Writing Paper Merchant Wholesalers' },
        { code: '424120', description: 'Stationery And Office Supplies Merchant Wholesalers' },
        { code: '424130', description: 'Industrial And Personal Service Paper Merchant Wholesalers' },
        { code: '424210', description: 'Drugs And Druggists Sundries Merchant Wholesalers' },
        { code: '424310', description: 'Piece Goods Notions And Other Dry Goods Merchant Wholesalers' },
        { code: '424340', description: 'Footwear Merchant Wholesalers' },
        { code: '424350', description: 'Clothing And Clothing Accessories Merchant Wholesalers' },
        { code: '424410', description: 'General Line Grocery Merchant Wholesalers' },
        { code: '424420', description: 'Packaged Frozen Food Merchant Wholesalers' },
        { code: '424430', description: 'Dairy Product Except Dried Or Canned Merchant Wholesalers' },
        { code: '424440', description: 'Poultry And Poultry Product Merchant Wholesalers' },
        { code: '424450', description: 'Confectionery Merchant Wholesalers' },
        { code: '424460', description: 'Fish And Seafood Merchant Wholesalers' },
        { code: '424470', description: 'Meat And Meat Product Merchant Wholesalers' },
        { code: '424480', description: 'Fresh Fruit And Vegetable Merchant Wholesalers' },
        { code: '424490', description: 'Other Grocery And Related Products Merchant Wholesalers' },
        { code: '424510', description: 'Grain And Field Bean Merchant Wholesalers' },
        { code: '424520', description: 'Livestock Merchant Wholesalers' },
        { code: '424590', description: 'Other Farm Product Raw Material Merchant Wholesalers' },
        { code: '424610', description: 'Plastics Materials And Basic Forms And Shapes Merchant Wholesalers' },
        { code: '424690', description: 'Other Chemical And Allied Products Merchant Wholesalers' },
        { code: '424710', description: 'Petroleum Bulk Stations And Terminals' },
        { code: '424720', description: 'Petroleum And Petroleum Products Merchant Wholesalers Except Bulk Stations And Terminals' },
        { code: '424810', description: 'Beer And Ale Merchant Wholesalers' },
        { code: '424820', description: 'Wine And Distilled Alcoholic Beverage Merchant Wholesalers' },
        { code: '424910', description: 'Farm Supplies Merchant Wholesalers' },
        { code: '424920', description: 'Book Periodical And Newspaper Merchant Wholesalers' },
        { code: '424930', description: 'Flower Nursery Stock And Florists Supplies Merchant Wholesalers' },
        { code: '424940', description: 'Tobacco Product And Electronic Cigarette Merchant Wholesalers' },
        { code: '424950', description: 'Paint Varnish And Supplies Merchant Wholesalers' },
        { code: '424990', description: 'Other Miscellaneous Nondurable Goods Merchant Wholesalers' },
        { code: '425120', description: 'Wholesale Trade Agents And Brokers' },
        { code: '441110', description: 'New Car Dealers' },
        { code: '441120', description: 'Used Car Dealers' },
        { code: '441210', description: 'Recreational Vehicle Dealers' },
        { code: '441222', description: 'Boat Dealers' },
        { code: '441227', description: 'Motorcycle ATV And All Other Motor Vehicle Dealers' },
        { code: '441330', description: 'Automotive Parts And Accessories Retailers' },
        { code: '441340', description: 'Tire Dealers' },
        { code: '444110', description: 'Home Centers' },
        { code: '444120', description: 'Paint And Wallpaper Retailers' },
        { code: '444140', description: 'Hardware Retailers' },
        { code: '444180', description: 'Other Building Material Dealers' },
        { code: '444230', description: 'Outdoor Power Equipment Retailers' },
        { code: '444240', description: 'Nursery Garden Center And Farm Supply Retailers' },
        { code: '445110', description: 'Supermarkets And Other Grocery Retailers Except Convenience Retailers' },
        { code: '445131', description: 'Convenience Retailers' },
        { code: '445132', description: 'Vending Machine Operators' },
        { code: '445230', description: 'Fruit And Vegetable Retailers' },
        { code: '445240', description: 'Meat Retailers' },
        { code: '445250', description: 'Fish And Seafood Retailers' },
        { code: '445291', description: 'Baked Goods Retailers' },
        { code: '445292', description: 'Confectionery And Nut Retailers' },
        { code: '445298', description: 'All Other Specialty Food Retailers' },
        { code: '445320', description: 'Beer Wine And Liquor Retailers' },
        { code: '449110', description: 'Furniture Retailers' },
        { code: '449121', description: 'Floor Covering Retailers' },
        { code: '449122', description: 'Window Treatment Retailers' },
        { code: '449129', description: 'All Other Home Furnishings Retailers' },
        { code: '449210', description: 'Electronics And Appliance Retailers' },
        { code: '454113', description: 'Mail Order Houses' },
        { code: '454390', description: 'Other Direct Selling Establishments' },
        { code: '455110', description: 'Department Stores' },
        { code: '455211', description: 'Warehouse Clubs And Supercenters' },
        { code: '455219', description: 'All Other General Merchandise Retailers' },
        { code: '456110', description: 'Pharmacies And Drug Retailers' },
        { code: '456120', description: 'Cosmetics Beauty Supplies And Perfume Retailers' },
        { code: '456130', description: 'Optical Goods Retailers' },
        { code: '456191', description: 'Food Health Supplement Retailers' },
        { code: '456199', description: 'All Other Health And Personal Care Retailers' },
        { code: '457110', description: 'Gasoline Stations With Convenience Stores' },
        { code: '457120', description: 'Other Gasoline Stations' },
        { code: '457210', description: 'Fuel Dealers' },
        { code: '458110', description: 'Clothing And Clothing Accessories Retailers' },
        { code: '458210', description: 'Shoe Retailers' },
        { code: '458310', description: 'Jewelry Retailers' },
        { code: '458320', description: 'Luggage And Leather Goods Retailers' },
        { code: '459110', description: 'Sporting Goods Retailers' },
        { code: '459120', description: 'Hobby Toy And Game Retailers' },
        { code: '459130', description: 'Sewing Needlework And Piece Goods Retailers' },
        { code: '459140', description: 'Musical Instrument And Supplies Retailers' },
        { code: '459210', description: 'Book Retailers And News Dealers' },
        { code: '459310', description: 'Florists' },
        { code: '459410', description: 'Office Supplies And Stationery Retailers' },
        { code: '459420', description: 'Gift Novelty And Souvenir Retailers' },
        { code: '459510', description: 'Used Merchandise Retailers' },
        { code: '459910', description: 'Pet And Pet Supplies Retailers' },
        { code: '459920', description: 'Art Dealers' },
        { code: '459930', description: 'Manufactured Mobile Home Dealers' },
        { code: '459991', description: 'Tobacco Electronic Cigarette And Other Smoking Supplies Retailers' },
        { code: '459999', description: 'All Other Miscellaneous Retailers' },
        { code: '481111', description: 'Scheduled Passenger Air Transportation' },
        { code: '481112', description: 'Scheduled Freight Air Transportation' },
        { code: '481211', description: 'Nonscheduled Chartered Passenger Air Transportation' },
        { code: '481212', description: 'Nonscheduled Chartered Freight Air Transportation' },
        { code: '481219', description: 'Other Nonscheduled Air Transportation' },
        { code: '482111', description: 'Line Haul Railroads' },
        { code: '482112', description: 'Short Line Railroads' },
        { code: '483111', description: 'Deep Sea Freight Transportation' },
        { code: '483112', description: 'Deep Sea Passenger Transportation' },
        { code: '483113', description: 'Coastal And Great Lakes Freight Transportation' },
        { code: '483114', description: 'Coastal And Great Lakes Passenger Transportation' },
        { code: '483211', description: 'Inland Water Freight Transportation' },
        { code: '483212', description: 'Inland Water Passenger Transportation' },
        { code: '484110', description: 'General Freight Trucking Local' },
        { code: '484121', description: 'General Freight Trucking Long Distance Truckload' },
        { code: '484122', description: 'General Freight Trucking Long Distance Less Than Truckload' },
        { code: '484210', description: 'Used Household And Office Goods Moving' },
        { code: '484220', description: 'Specialized Freight Except Used Goods Trucking Local' },
        { code: '484230', description: 'Specialized Freight Except Used Goods Trucking Long Distance' },
        { code: '485111', description: 'Mixed Mode Transit Systems' },
        { code: '485112', description: 'Commuter Rail Systems' },
        { code: '485113', description: 'Bus And Other Motor Vehicle Transit Systems' },
        { code: '485119', description: 'Other Urban Transit Systems' },
        { code: '485210', description: 'Interurban And Rural Bus Transportation' },
        { code: '485310', description: 'Taxi And Ridesharing Services' },
        { code: '485320', description: 'Limousine Service' },
        { code: '485410', description: 'School And Employee Bus Transportation' },
        { code: '485510', description: 'Charter Bus Industry' },
        { code: '485991', description: 'Special Needs Transportation' },
        { code: '485999', description: 'All Other Transit And Ground Passenger Transportation' },
        { code: '486110', description: 'Pipeline Transportation Of Crude Oil' },
        { code: '486210', description: 'Pipeline Transportation Of Natural Gas' },
        { code: '486910', description: 'Pipeline Transportation Of Refined Petroleum Products' },
        { code: '486990', description: 'All Other Pipeline Transportation' },
        { code: '487110', description: 'Scenic And Sightseeing Transportation Land' },
        { code: '487210', description: 'Scenic And Sightseeing Transportation Water' },
        { code: '487990', description: 'Scenic And Sightseeing Transportation Other' },
        { code: '488111', description: 'Air Traffic Control' },
        { code: '488119', description: 'Other Airport Operations' },
        { code: '488190', description: 'Other Support Activities For Air Transportation' },
        { code: '488210', description: 'Support Activities For Rail Transportation' },
        { code: '488310', description: 'Port And Harbor Operations' },
        { code: '488320', description: 'Marine Cargo Handling' },
        { code: '488330', description: 'Navigational Services To Shipping' },
        { code: '488390', description: 'Other Support Activities For Water Transportation' },
        { code: '488410', description: 'Motor Vehicle Towing' },
        { code: '488490', description: 'Other Support Activities For Road Transportation' },
        { code: '488510', description: 'Freight Transportation Arrangement' },
        { code: '488991', description: 'Packing And Crating' },
        { code: '488999', description: 'All Other Support Activities For Transportation' },
        { code: '491110', description: 'Postal Service' },
        { code: '492110', description: 'Couriers And Express Delivery Services' },
        { code: '492210', description: 'Local Messengers And Local Delivery' },
        { code: '493110', description: 'General Warehousing And Storage' },
        { code: '493120', description: 'Refrigerated Warehousing And Storage' },
        { code: '493130', description: 'Farm Product Warehousing And Storage' },
        { code: '493190', description: 'Other Warehousing And Storage' },
        { code: '512110', description: 'Motion Picture And Video Production' },
        { code: '512120', description: 'Motion Picture And Video Distribution' },
        { code: '512131', description: 'Motion Picture Theaters Except Drive Ins' },
        { code: '512132', description: 'Drive In Motion Picture Theaters' },
        { code: '512191', description: 'Teleproduction And Other Postproduction Services' },
        { code: '512199', description: 'Other Motion Picture And Video Industries' },
        { code: '512230', description: 'Music Publishers' },
        { code: '512240', description: 'Sound Recording Studios' },
        { code: '512250', description: 'Record Production And Distribution' },
        { code: '512290', description: 'Other Sound Recording Industries' },
        { code: '513110', description: 'Newspaper Publishers' },
        { code: '513120', description: 'Periodical Publishers' },
        { code: '513130', description: 'Book Publishers' },
        { code: '513140', description: 'Directory And Mailing List Publishers' },
        { code: '513191', description: 'Greeting Card Publishers' },
        { code: '513199', description: 'All Other Publishers' },
        { code: '513210', description: 'Software Publishers' },
        { code: '515210', description: 'Cable And Other Subscription Programming' },
        { code: '516110', description: 'Radio Broadcasting Stations' },
        { code: '516120', description: 'Television Broadcasting Stations' },
        { code: '516210', description: 'Media Streaming Distribution Services Social Networks And Other Media Networks And Content Providers' },
        { code: '517111', description: 'Wired Telecommunications Carriers' },
        { code: '517112', description: 'Wireless Telecommunications Carriers Except Satellite' },
        { code: '517121', description: 'Telecommunications Resellers' },
        { code: '517410', description: 'Satellite Telecommunications' },
        { code: '517810', description: 'All Other Telecommunications' },
        { code: '518210', description: 'Computing Infrastructure Providers Data Processing Web Hosting And Related Services' },
        { code: '519210', description: 'Libraries And Archives' },
        { code: '519290', description: 'Web Search Portals And All Other Information Services' },
        { code: '521110', description: 'Monetary Authorities Central Bank' },
        { code: '522110', description: 'Commercial Banking' },
        { code: '522130', description: 'Credit Unions' },
        { code: '522180', description: 'Savings Institutions And Other Depository Credit Intermediation' },
        { code: '522210', description: 'Credit Card Issuing' },
        { code: '522220', description: 'Sales Financing' },
        { code: '522291', description: 'Consumer Lending' },
        { code: '522292', description: 'Real Estate Credit' },
        { code: '522298', description: 'All Other Nondepository Credit Intermediation' },
        { code: '522299', description: 'International Secondary Market And All Other Nondepository Credit Intermediation' },
        { code: '522310', description: 'Mortgage And Nonmortgage Loan Brokers' },
        { code: '522320', description: 'Financial Transactions Processing Reserve And Clearinghouse Activities' },
        { code: '522390', description: 'Other Activities Related To Credit Intermediation' },
        { code: '523150', description: 'Investment Banking And Securities Intermediation' },
        { code: '523160', description: 'Commodity Contracts Intermediation' },
        { code: '523210', description: 'Securities And Commodity Exchanges' },
        { code: '523910', description: 'Miscellaneous Intermediation' },
        { code: '523940', description: 'Portfolio Management And Investment Advice' },
        { code: '523991', description: 'Trust Fiduciary And Custody Activities' },
        { code: '523999', description: 'Miscellaneous Financial Investment Activities' },
        { code: '524113', description: 'Direct Life Insurance Carriers' },
        { code: '524114', description: 'Direct Health And Medical Insurance Carriers' },
        { code: '524126', description: 'Direct Property And Casualty Insurance Carriers' },
        { code: '524127', description: 'Direct Title Insurance Carriers' },
        { code: '524128', description: 'Other Direct Insurance Except Life Health And Medical Carriers' },
        { code: '524130', description: 'Reinsurance Carriers' },
        { code: '524210', description: 'Insurance Agencies And Brokerages' },
        { code: '524291', description: 'Claims Adjusting' },
        { code: '524292', description: 'Pharmacy Benefit Management And Other Third Party Administration Of Insurance And Pension Funds' },
        { code: '524298', description: 'All Other Insurance Related Activities' },
        { code: '525110', description: 'Pension Funds' },
        { code: '525120', description: 'Health And Welfare Funds' },
        { code: '525190', description: 'Other Insurance Funds' },
        { code: '525910', description: 'Open End Investment Funds' },
        { code: '525920', description: 'Trusts Estates And Agency Accounts' },
        { code: '525990', description: 'Other Financial Vehicles' },
        { code: '531110', description: 'Lessors Of Residential Buildings And Dwellings' },
        { code: '531120', description: 'Lessors Of Nonresidential Buildings Except Miniwarehouses' },
        { code: '531130', description: 'Lessors Of Miniwarehouses And Self Storage Units' },
        { code: '531190', description: 'Lessors Of Other Real Estate Property' },
        { code: '531210', description: 'Offices Of Real Estate Agents And Brokers' },
        { code: '531311', description: 'Residential Property Managers' },
        { code: '531312', description: 'Nonresidential Property Managers' },
        { code: '531320', description: 'Offices Of Real Estate Appraisers' },
        { code: '531390', description: 'Other Activities Related To Real Estate' },
        { code: '532111', description: 'Passenger Car Rental' },
        { code: '532112', description: 'Passenger Car Leasing' },
        { code: '532120', description: 'Truck Utility Trailer And RV Recreational Vehicle Rental And Leasing' },
        { code: '532210', description: 'Consumer Electronics And Appliances Rental' },
        { code: '532281', description: 'Formal Wear And Costume Rental' },
        { code: '532282', description: 'Video Tape And Disc Rental' },
        { code: '532283', description: 'Home Health Equipment Rental' },
        { code: '532284', description: 'Recreational Goods Rental' },
        { code: '532289', description: 'All Other Consumer Goods Rental' },
        { code: '532310', description: 'General Rental Centers' },
        { code: '532411', description: 'Commercial Air Rail And Water Transportation Equipment Rental And Leasing' },
        { code: '532412', description: 'Construction Mining And Forestry Machinery And Equipment Rental And Leasing' },
        { code: '532420', description: 'Office Machinery And Equipment Rental And Leasing' },
        { code: '532490', description: 'Other Commercial And Industrial Machinery And Equipment Rental And Leasing' },
        { code: '533110', description: 'Lessors Of Nonfinancial Intangible Assets Except Copyrighted Works' },
        { code: '541110', description: 'Offices Of Lawyers' },
        { code: '541191', description: 'Title Abstract And Settlement Offices' },
        { code: '541199', description: 'All Other Legal Services' },
        { code: '541211', description: 'Offices Of Certified Public Accountants' },
        { code: '541213', description: 'Tax Preparation Services' },
        { code: '541214', description: 'Payroll Services' },
        { code: '541219', description: 'Other Accounting Services' },
        { code: '541310', description: 'Architectural Services' },
        { code: '541320', description: 'Landscape Architectural Services' },
        { code: '541330', description: 'Engineering Services' },
        { code: '541340', description: 'Drafting Services' },
        { code: '541350', description: 'Building Inspection Services' },
        { code: '541360', description: 'Geophysical Surveying And Mapping Services' },
        { code: '541370', description: 'Surveying And Mapping Except Geophysical Services' },
        { code: '541380', description: 'Testing Laboratories And Services' },
        { code: '541410', description: 'Interior Design Services' },
        { code: '541420', description: 'Industrial Design Services' },
        { code: '541430', description: 'Graphic Design Services' },
        { code: '541490', description: 'Other Specialized Design Services' },
        { code: '541511', description: 'Custom Computer Programming Services' },
        { code: '541512', description: 'Computer Systems Design Services' },
        { code: '541513', description: 'Computer Facilities Management Services' },
        { code: '541519', description: 'Other Computer Related Services' },
        { code: '541611', description: 'Administrative Management And General Management Consulting Services' },
        { code: '541612', description: 'Human Resources Consulting Services' },
        { code: '541613', description: 'Marketing Consulting Services' },
        { code: '541614', description: 'Process Physical Distribution And Logistics Consulting Services' },
        { code: '541618', description: 'Other Management Consulting Services' },
        { code: '541620', description: 'Environmental Consulting Services' },
        { code: '541690', description: 'Other Scientific And Technical Consulting Services' },
        { code: '541713', description: 'Research And Development In Nanotechnology' },
        { code: '541714', description: 'Research And Development In Biotechnology Except Nanobiotechnology' },
        { code: '541715', description: 'Research And Development In The Physical Engineering And Life Sciences Except Nanotechnology And Biotechnology' },
        { code: '541720', description: 'Research And Development In The Social Sciences And Humanities' },
        { code: '541810', description: 'Advertising Agencies' },
        { code: '541820', description: 'Public Relations Agencies' },
        { code: '541830', description: 'Media Buying Agencies' },
        { code: '541840', description: 'Media Representatives' },
        { code: '541850', description: 'Indoor And Outdoor Display Advertising' },
        { code: '541860', description: 'Direct Mail Advertising' },
        { code: '541870', description: 'Advertising Material Distribution Services' },
        { code: '541890', description: 'Other Services Related To Advertising' },
        { code: '541910', description: 'Marketing Research And Public Opinion Polling' },
        { code: '541921', description: 'Photography Studios Portrait' },
        { code: '541922', description: 'Commercial Photography' },
        { code: '541930', description: 'Translation And Interpretation Services' },
        { code: '541940', description: 'Veterinary Services' },
        { code: '541990', description: 'All Other Professional Scientific And Technical Services' },
        { code: '551111', description: 'Offices Of Bank Holding Companies' },
        { code: '551112', description: 'Offices Of Other Holding Companies' },
        { code: '551114', description: 'Corporate Subsidiary And Regional Managing Offices' },
        { code: '561110', description: 'Office Administrative Services' },
        { code: '561210', description: 'Facilities Support Services' },
        { code: '561311', description: 'Employment Placement Agencies' },
        { code: '561312', description: 'Executive Search Services' },
        { code: '561320', description: 'Temporary Help Services' },
        { code: '561330', description: 'Professional Employer Organizations' },
        { code: '561410', description: 'Document Preparation Services' },
        { code: '561421', description: 'Telephone Answering Services' },
        { code: '561422', description: 'Telemarketing Bureaus And Other Contact Centers' },
        { code: '561431', description: 'Private Mail Centers' },
        { code: '561439', description: 'Other Business Service Centers Including Copy Shops' },
        { code: '561440', description: 'Collection Agencies' },
        { code: '561450', description: 'Credit Bureaus' },
        { code: '561491', description: 'Repossession Services' },
        { code: '561492', description: 'Court Reporting And Stenotype Services' },
        { code: '561499', description: 'All Other Business Support Services' },
        { code: '561510', description: 'Travel Agencies' },
        { code: '561520', description: 'Tour Operators' },
        { code: '561591', description: 'Convention And Visitors Bureaus' },
        { code: '561599', description: 'All Other Travel Arrangement And Reservation Services' },
        { code: '561611', description: 'Investigation And Personal Background Check Services' },
        { code: '561612', description: 'Security Guards And Patrol Services' },
        { code: '561613', description: 'Armored Car Services' },
        { code: '561621', description: 'Security Systems Services Except Locksmiths' },
        { code: '561622', description: 'Locksmiths' },
        { code: '561710', description: 'Exterminating And Pest Control Services' },
        { code: '561720', description: 'Janitorial Services' },
        { code: '561730', description: 'Landscaping Services' },
        { code: '561740', description: 'Carpet And Upholstery Cleaning Services' },
        { code: '561790', description: 'Other Services To Buildings And Dwellings' },
        { code: '561910', description: 'Packaging And Labeling Services' },
        { code: '561920', description: 'Convention And Trade Show Organizers' },
        { code: '561990', description: 'All Other Support Services' },
        { code: '562111', description: 'Solid Waste Collection' },
        { code: '562112', description: 'Hazardous Waste Collection' },
        { code: '562119', description: 'Other Waste Collection' },
        { code: '562211', description: 'Hazardous Waste Treatment And Disposal' },
        { code: '562212', description: 'Solid Waste Landfill' },
        { code: '562213', description: 'Solid Waste Combustors And Incinerators' },
        { code: '562219', description: 'Other Nonhazardous Waste Treatment And Disposal' },
        { code: '562910', description: 'Remediation Services' },
        { code: '562920', description: 'Materials Recovery Facilities' },
        { code: '562991', description: 'Septic Tank And Related Services' },
        { code: '562998', description: 'All Other Miscellaneous Waste Management Services' },
        { code: '611110', description: 'Elementary And Secondary Schools' },
        { code: '611210', description: 'Junior Colleges' },
        { code: '611310', description: 'Colleges Universities And Professional Schools' },
        { code: '611410', description: 'Business And Secretarial Schools' },
        { code: '611420', description: 'Computer Training' },
        { code: '611430', description: 'Professional And Management Development Training' },
        { code: '611511', description: 'Cosmetology And Barber Schools' },
        { code: '611512', description: 'Flight Training' },
        { code: '611513', description: 'Apprenticeship Training' },
        { code: '611519', description: 'Other Technical And Trade Schools' },
        { code: '611610', description: 'Fine Arts Schools' },
        { code: '611620', description: 'Sports And Recreation Instruction' },
        { code: '611630', description: 'Language Schools' },
        { code: '611691', description: 'Exam Preparation And Tutoring' },
        { code: '611692', description: 'Automobile Driving Schools' },
        { code: '611699', description: 'All Other Miscellaneous Schools And Instruction' },
        { code: '611710', description: 'Educational Support Services' },
        { code: '621111', description: 'Offices Of Physicians Except Mental Health Specialists' },
        { code: '621112', description: 'Offices Of Physicians Mental Health Specialists' },
        { code: '621210', description: 'Offices Of Dentists' },
        { code: '621310', description: 'Offices Of Chiropractors' },
        { code: '621320', description: 'Offices Of Optometrists' },
        { code: '621330', description: 'Offices Of Mental Health Practitioners Except Physicians' },
        { code: '621340', description: 'Offices Of Physical Occupational And Speech Therapists And Audiologists' },
        { code: '621391', description: 'Offices Of Podiatrists' },
        { code: '621399', description: 'Offices Of All Other Miscellaneous Health Practitioners' },
        { code: '621410', description: 'Family Planning Centers' },
        { code: '621420', description: 'Outpatient Mental Health And Substance Abuse Centers' },
        { code: '621491', description: 'HMO Medical Centers' },
        { code: '621492', description: 'Kidney Dialysis Centers' },
        { code: '621493', description: 'Freestanding Ambulatory Surgical And Emergency Centers' },
        { code: '621498', description: 'All Other Outpatient Care Centers' },
        { code: '621511', description: 'Medical Laboratories' },
        { code: '621512', description: 'Diagnostic Imaging Centers' },
        { code: '621610', description: 'Home Health Care Services' },
        { code: '621910', description: 'Ambulance Services' },
        { code: '621991', description: 'Blood And Organ Banks' },
        { code: '621999', description: 'All Other Miscellaneous Ambulatory Health Care Services' },
        { code: '622110', description: 'General Medical And Surgical Hospitals' },
        { code: '622210', description: 'Psychiatric And Substance Abuse Hospitals' },
        { code: '622310', description: 'Specialty Except Psychiatric And Substance Abuse Hospitals' },
        { code: '623110', description: 'Nursing Care Facilities Skilled Nursing Facilities' },
        { code: '623210', description: 'Residential Intellectual And Developmental Disability Facilities' },
        { code: '623220', description: 'Residential Mental Health And Substance Abuse Facilities' },
        { code: '623311', description: 'Continuing Care Retirement Communities' },
        { code: '623312', description: 'Assisted Living Facilities For The Elderly' },
        { code: '623990', description: 'Other Residential Care Facilities' },
        { code: '624110', description: 'Child And Youth Services' },
        { code: '624120', description: 'Services For The Elderly And Persons With Disabilities' },
        { code: '624190', description: 'Other Individual And Family Services' },
        { code: '624210', description: 'Community Food Services' },
        { code: '624221', description: 'Temporary Shelters' },
        { code: '624229', description: 'Other Community Housing Services' },
        { code: '624230', description: 'Emergency And Other Relief Services' },
        { code: '624310', description: 'Vocational Rehabilitation Services' },
        { code: '624410', description: 'Child Care Services' },
        { code: '711110', description: 'Theater Companies And Dinner Theaters' },
        { code: '711120', description: 'Dance Companies' },
        { code: '711130', description: 'Musical Groups And Artists' },
        { code: '711190', description: 'Other Performing Arts Companies' },
        { code: '711211', description: 'Sports Teams And Clubs' },
        { code: '711212', description: 'Racetracks' },
        { code: '711219', description: 'Other Spectator Sports' },
        { code: '711310', description: 'Promoters Of Performing Arts Sports And Similar Events With Facilities' },
        { code: '711320', description: 'Promoters Of Performing Arts Sports And Similar Events Without Facilities' },
        { code: '711410', description: 'Agents And Managers For Artists Athletes Entertainers And Other Public Figures' },
        { code: '711510', description: 'Independent Artists Writers And Performers' },
        { code: '712110', description: 'Museums' },
        { code: '712120', description: 'Historical Sites' },
        { code: '712130', description: 'Zoos And Botanical Gardens' },
        { code: '712190', description: 'Nature Parks And Other Similar Institutions' },
        { code: '713110', description: 'Amusement And Theme Parks' },
        { code: '713120', description: 'Amusement Arcades' },
        { code: '713210', description: 'Casinos Except Casino Hotels' },
        { code: '713290', description: 'Other Gambling Industries' },
        { code: '713910', description: 'Golf Courses And Country Clubs' },
        { code: '713920', description: 'Skiing Facilities' },
        { code: '713930', description: 'Marinas' },
        { code: '713940', description: 'Fitness And Recreational Sports Centers' },
        { code: '713950', description: 'Bowling Centers' },
        { code: '713990', description: 'All Other Amusement And Recreation Industries' },
        { code: '721110', description: 'Hotels Except Casino Hotels And Motels' },
        { code: '721120', description: 'Casino Hotels' },
        { code: '721191', description: 'Bedand Breakfast Inns' },
        { code: '721199', description: 'All Other Traveler Accommodation' },
        { code: '721211', description: 'RV Recreational Vehicle Parks And Campgrounds' },
        { code: '721214', description: 'Recreational And Vacation Camps Except Campgrounds' },
        { code: '721310', description: 'Rooming And Boarding Houses Dormitories And Workers Camps' },
        { code: '722310', description: 'Food Service Contractors' },
        { code: '722320', description: 'Caterers' },
        { code: '722330', description: 'Mobile Food Services' },
        { code: '722410', description: 'Drinking Places Alcoholic Beverages' },
        { code: '722511', description: 'Full Service Restaurants' },
        { code: '722513', description: 'Limited Service Restaurants' },
        { code: '722514', description: 'Cafeterias Grill Buffets And Buffets' },
        { code: '722515', description: 'Snack And Nonalcoholic Beverage Bars' },
        { code: '811111', description: 'General Automotive Repair' },
        { code: '811114', description: 'Specialized Automotive Repair' },
        { code: '811121', description: 'Automotive Body Paint And Interior Repair And Maintenance' },
        { code: '811122', description: 'Automotive Glass Replacement Shops' },
        { code: '811191', description: 'Automotive Oil Change And Lubrication Shops' },
        { code: '811192', description: 'Car Washes' },
        { code: '811198', description: 'All Other Automotive Repair And Maintenance' },
        { code: '811210', description: 'Electronic And Precision Equipment Repair And Maintenance' },
        { code: '811310', description: 'Commercial And Industrial Machinery And Equipment Except Automotive And Electronic Repair And Maintenance' },
        { code: '811411', description: 'Home And Garden Equipment Repair And Maintenance' },
        { code: '811412', description: 'Appliance Repair And Maintenance' },
        { code: '811420', description: 'Reupholstery And Furniture Repair' },
        { code: '811430', description: 'Footwear And Leather Goods Repair' },
        { code: '811490', description: 'Other Personal And Household Goods Repair And Maintenance' },
        { code: '812111', description: 'Barber Shops' },
        { code: '812112', description: 'Beauty Salons' },
        { code: '812113', description: 'Nail Salons' },
        { code: '812191', description: 'Diet And Weight Reducing Centers' },
        { code: '812199', description: 'Other Personal Care Services' },
        { code: '812210', description: 'Funeral Homes And Funeral Services' },
        { code: '812220', description: 'Cemeteries And Crematories' },
        { code: '812310', description: 'Coin Operated Laundries And Drycleaners' },
        { code: '812320', description: 'Drycleaning And Laundry Services Except Coin Operated' },
        { code: '812331', description: 'Linen Supply' },
        { code: '812332', description: 'Industrial Launderers' },
        { code: '812910', description: 'Pet Care Except Veterinary Services' },
        { code: '812921', description: 'Photofinishing Laboratories Except One Hour' },
        { code: '812922', description: 'One Hour Photofinishing' },
        { code: '812930', description: 'Parking Lots And Garages' },
        { code: '812990', description: 'All Other Personal Services' },
        { code: '813110', description: 'Religious Organizations' },
        { code: '813211', description: 'Grantmaking Foundations' },
        { code: '813212', description: 'Voluntary Health Organizations' },
        { code: '813219', description: 'Other Grantmaking And Giving Services' },
        { code: '813311', description: 'Human Rights Organizations' },
        { code: '813312', description: 'Environment Conservation And Wildlife Organizations' },
        { code: '813319', description: 'Other Social Advocacy Organizations' },
        { code: '813410', description: 'Civic And Social Organizations' },
        { code: '813910', description: 'Business Associations' },
        { code: '813920', description: 'Professional Organizations' },
        { code: '813930', description: 'Labor Unions And Similar Labor Organizations' },
        { code: '813940', description: 'Political Organizations' },
        { code: '813990', description: 'Other Similar Organizations Except Business Professional Labor And Political Organizations' },
        { code: '814110', description: 'Private Households' },
        { code: '921110', description: 'Executive Offices' },
        { code: '921120', description: 'Legislative Bodies' },
        { code: '921130', description: 'Public Finance Activities' },
        { code: '921140', description: 'Executive And Legislative Offices Combined' },
        { code: '921150', description: 'American Indian And Alaska Native Tribal Governments' },
        { code: '921190', description: 'Other General Government Support' },
        { code: '922110', description: 'Courts' },
        { code: '922120', description: 'Police Protection' },
        { code: '922130', description: 'Legal Counsel And Prosecution' },
        { code: '922140', description: 'Correctional Institutions' },
        { code: '922150', description: 'Parole Offices And Probation Offices' },
        { code: '922160', description: 'Fire Protection' },
        { code: '922190', description: 'Other Justice Public Order And Safety Activities' },
        { code: '923110', description: 'Administration Of Education Programs' },
        { code: '923120', description: 'Administration Of Public Health Programs' },
        { code: '923130', description: 'Administration Of Human Resource Programs Except Education Public Health And Veterans Affairs Programs' },
        { code: '923140', description: 'Administration Of Veterans Affairs' },
        { code: '924110', description: 'Administration Of Air And Water Resource And Solid Waste Management Programs' },
        { code: '924120', description: 'Administration Of Conservation Programs' },
        { code: '925110', description: 'Administration Of Housing Programs' },
        { code: '925120', description: 'Administration Of Urban Planning And Community And Rural Development' },
        { code: '926110', description: 'Administration Of General Economic Programs' },
        { code: '926120', description: 'Regulation And Administration Of Transportation Programs' },
        { code: '926130', description: 'Regulation And Administration Of Communications Electric Gas And Other Utilities' },
        { code: '926140', description: 'Regulation Of Agricultural Marketing And Commodities' },
        { code: '926150', description: 'Regulation Licensing And Inspection Of Miscellaneous Commercial Sectors' },
        { code: '927110', description: 'Space Research And Technology' },
        { code: '928110', description: 'National Security' },
        { code: '928120', description: 'International Affairs' },
        { code: '999999', description: 'Unclassified' }
    ];

    // Account purposes
    const accountPurposes = [
        'receive_payments_for_goods_and_services',
        'charitable_donations',
        'payroll',
        'other'
    ];

    const estimatedRevenueOptions = [
        'under_10000',
        '10000_to_99999',
        '100000_to_499999',
        '500000_to_999999',
        '1000000_to_4999999',
        '5000000_to_9999999',
        '10000000_to_24999999',
        '25000000_to_49999999',
        '50000000_to_99999999',
        '100000000_plus'
    ];

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Required fields validation
        if (!formData.business_legal_name.trim()) {
            newErrors.business_legal_name = 'Business legal name is required';
        } else if (formData.business_legal_name.length < 1 || formData.business_legal_name.length > 1024) {
            newErrors.business_legal_name = 'Business legal name must be between 1 and 1024 characters';
        }

        if (!formData.business_trade_name.trim()) {
            newErrors.business_trade_name = 'Business trade name is required';
        } else if (formData.business_trade_name.length < 1 || formData.business_trade_name.length > 1024) {
            newErrors.business_trade_name = 'Business trade name must be between 1 and 1024 characters';
        }

        if (!formData.business_description.trim()) {
            newErrors.business_description = 'Business description is required';
        } else if (formData.business_description.length < 1 || formData.business_description.length > 1024) {
            newErrors.business_description = 'Business description must be between 1 and 1024 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.business_type) {
            newErrors.business_type = 'Business type is required';
        }

        // Registered address validation
        if (!formData.registered_address.street_line_1.trim()) {
            newErrors['registered_address.street_line_1'] = 'Street line 1 is required';
        } else if (formData.registered_address.street_line_1.length < 4) {
            newErrors['registered_address.street_line_1'] = 'Street line 1 must be at least 4 characters';
        }

        if (!formData.registered_address.city.trim()) {
            newErrors['registered_address.city'] = 'City is required';
        }

        if (!formData.registered_address.country.trim()) {
            newErrors['registered_address.country'] = 'Country is required';
        } else if (formData.registered_address.country.length !== 3) {
            newErrors['registered_address.country'] = 'Country must be a 3-letter code';
        }

        // Physical address validation (same rules as registered)
        if (!formData.physical_address.street_line_1.trim()) {
            newErrors['physical_address.street_line_1'] = 'Physical address street line 1 is required';
        } else if (formData.physical_address.street_line_1.length < 4) {
            newErrors['physical_address.street_line_1'] = 'Physical address street line 1 must be at least 4 characters';
        }

        if (!formData.physical_address.city.trim()) {
            newErrors['physical_address.city'] = 'Physical address city is required';
        }

        if (!formData.physical_address.country.trim()) {
            newErrors['physical_address.country'] = 'Physical address country is required';
        } else if (formData.physical_address.country.length !== 3) {
            newErrors['physical_address.country'] = 'Physical address country must be a 3-letter code';
        }

        // Additional validation based on business type
        if (formData.is_dao === undefined) {
            newErrors.is_dao = 'DAO status is required';
        }

        // if (!formData.signed_agreement_id.trim()) {
        //   newErrors.signed_agreement_id = 'Signed agreement ID is required';
        // } else if (formData.signed_agreement_id.length < 1 || formData.signed_agreement_id.length > 1024) {
        //   newErrors.signed_agreement_id = 'Signed agreement ID must be between 1 and 1024 characters';
        // }

        if (!formData.account_purpose) {
            newErrors.account_purpose = 'Account purpose is required';
        } else if (formData.account_purpose === 'other' && !formData.account_purpose_other?.trim()) {
            newErrors.account_purpose_other = 'Please specify the account purpose';
        }

        if (!formData.source_of_funds) {
            newErrors.source_of_funds = 'Source of funds is required';
        }

        if (formData.source_of_funds === 'other' && !formData.source_of_funds_description?.trim()) {
            newErrors.source_of_funds_description = 'Source of funds description is required';
        }

        // High risk activities validation
        if (formData.high_risk_activities.length === 0) {
            newErrors.high_risk_activities = 'At least one high risk activity must be selected';
        } else if (formData.high_risk_activities.includes('none_of_the_above') && formData.high_risk_activities.length > 1) {
            newErrors.high_risk_activities = 'Cannot select "none of the above" with other activities';
        } else if (!formData.high_risk_activities.includes('none_of_the_above') && !formData.high_risk_activities_explanation?.trim()) {
            newErrors.high_risk_activities_explanation = 'Explanation of high risk activities is required';
        }

        // Money services validation
        if (formData.conducts_money_services && !formData.compliance_screening_explanation?.trim()) {
            newErrors.compliance_screening_explanation = 'Compliance screening explanation is required when conducting money services';
        }

        if (formData.conducts_money_services && !formData.conducts_money_services_description?.trim()) {
            newErrors.conducts_money_services_description = 'Description of money services is required';
        }

        if (formData.conducts_money_services && formData.conducts_money_services_using_bridge && formData.associated_persons.length === 0) {
            newErrors.associated_persons = 'At least one associated person is required when conducting money services using Bridge';
        }

        // Regulated activity validation
        if (formData.regulated_activity.primary_regulatory_authority_name &&
            (!formData.regulated_activity.regulated_activities_description?.trim() ||
                !formData.regulated_activity.primary_regulatory_authority_country?.trim() ||
                !formData.regulated_activity.license_number?.trim())) {
            newErrors.regulated_activity = 'All regulated activity fields are required when providing regulatory information';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when field is updated
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleAddressChange = (addressType: 'registered_address' | 'physical_address', field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [addressType]: {
                ...prev[addressType],
                [field]: value
            }
        }));

        // Clear error when field is updated
        const errorKey = `${addressType}.${field}`;
        if (errors[errorKey]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const addAssociatedPerson = () => {
        setFormData(prev => ({
            ...prev,
            associated_persons: [
                ...prev.associated_persons,
                {
                    first_name: '',
                    last_name: '',
                    birth_date: '',
                    email: '',
                    phone: '',
                    residential_address: {
                        street_line_1: '',
                        street_line_2: '',
                        city: '',
                        subdivision: '',
                        postal_code: '',
                        country: ''
                    },
                    has_ownership: false,
                    has_control: false,
                    is_signer: false,
                    is_director: false,
                    title: '',
                    ownership_percentage: 0,
                    relationship_established_at: '',
                    identifying_information: [],
                    documents: []
                }
            ]
        }));
    };






    
    const removeAssociatedPerson = (index: number) => {
        setFormData(prev => ({
            ...prev,
            associated_persons: prev.associated_persons.filter((_, i) => i !== index)
        }));
    };

    const handleAssociatedPersonChange = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const newAssociatedPersons = [...prev.associated_persons];
            newAssociatedPersons[index] = {
                ...newAssociatedPersons[index],
                [field]: value
            };
            return {
                ...prev,
                associated_persons: newAssociatedPersons
            };
        });
    };

    const handleAssociatedPersonAddressChange = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newAssociatedPersons = [...prev.associated_persons];
            newAssociatedPersons[index] = {
                ...newAssociatedPersons[index],
                residential_address: {
                    ...newAssociatedPersons[index].residential_address,
                    [field]: value
                }
            };
            return {
                ...prev,
                associated_persons: newAssociatedPersons
            };
        });
    };

    const handleHighRiskActivityChange = (activity: string) => {
        setFormData(prev => {
            let newActivities = [...prev.high_risk_activities];

            if (activity === 'none_of_the_above') {
                // If selecting "none of the above", remove all other activities
                newActivities = ['none_of_the_above'];
            } else {
                // Remove "none_of_the_above" if selecting any other activity
                newActivities = newActivities.filter(a => a !== 'none_of_the_above');

                if (newActivities.includes(activity)) {
                    // Remove the activity if it's already selected
                    newActivities = newActivities.filter(a => a !== activity);
                } else {
                    // Add the activity
                    newActivities.push(activity);
                }

                // If no activities selected, add "none_of_the_above"
                if (newActivities.length === 0) {
                    newActivities = ['none_of_the_above'];
                }
            }

            return {
                ...prev,
                high_risk_activities: newActivities
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            // Prepare data for submission
            const submitData = {
                ...formData,
                // Convert string values to appropriate types
                is_dao: formData.is_dao,
                has_material_intermediary_ownership: formData.has_material_intermediary_ownership,
                conducts_money_services: formData.conducts_money_services,
                conducts_money_services_using_bridge: formData.conducts_money_services_using_bridge,
                // Add any additional processing needed
            };

            onSubmit(submitData);
        }
    };



    return (
        <AppLayout title="Select Account Type">
            <Head title="Business Account Registration" />
            <div className="max-w-6xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-6">Business Customer Creation</h1>

                <div className="mb-6 border-b">
                    <nav className="flex space-x-8">
                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'business-info'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('business-info')}
                        >
                            Business Information
                        </button>
                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'addresses'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('addresses')}
                        >
                            Addresses
                        </button>
                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'persons'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('persons')}
                        >
                            Associated Persons
                        </button>
                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'financial'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('financial')}
                        >
                            Financial Information
                        </button>
                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'regulatory'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('identifying_information')}
                        >
                            Identity Information
                        </button>
                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'regulatory'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('documents')}
                        >
                            Documents
                        </button>
                        <button
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'regulatory'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            onClick={() => setActiveTab('regulatory')}
                        >
                            Regulatory
                        </button>
                    </nav>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 'business-info' && (
                        <div className="bg-white shadow sm:rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Business Information</h2>

                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="business_legal_name" className="block text-sm font-medium text-gray-700">
                                        Business Legal Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="business_legal_name"
                                        value={formData.business_legal_name}
                                        onChange={(e) => handleChange('business_legal_name', e.target.value)}
                                        className={`mt-1 block w-full border ${errors.business_legal_name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                    />
                                    {errors.business_legal_name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.business_legal_name}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="business_trade_name" className="block text-sm font-medium text-gray-700">
                                        Business Trade Name (DBA) *
                                    </label>
                                    <input
                                        type="text"
                                        id="business_trade_name"
                                        value={formData.business_trade_name}
                                        onChange={(e) => handleChange('business_trade_name', e.target.value)}
                                        className={`mt-1 block w-full border ${errors.business_trade_name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                    />
                                    {errors.business_trade_name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.business_trade_name}</p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="business_description" className="block text-sm font-medium text-gray-700">
                                        Business Description *
                                    </label>
                                    <textarea
                                        id="business_description"
                                        rows={3}
                                        value={formData.business_description}
                                        onChange={(e) => handleChange('business_description', e.target.value)}
                                        className={`mt-1 block w-full border ${errors.business_description ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                    />
                                    {errors.business_description && (
                                        <p className="mt-1 text-sm text-red-600">{errors.business_description}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                        Business Email *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        className={`mt-1 block w-full border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="primary_website" className="block text-sm font-medium text-gray-700">
                                        Primary Website
                                    </label>
                                    <input
                                        type="url"
                                        id="primary_website"
                                        value={formData.primary_website}
                                        onChange={(e) => handleChange('primary_website', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="business_type" className="block text-sm font-medium text-gray-700">
                                        Business Type *
                                    </label>
                                    <select
                                        id="business_type"
                                        value={formData.business_type}
                                        onChange={(e) => handleChange('business_type', e.target.value)}
                                        className={`mt-1 block w-full border ${errors.business_type ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                    >
                                        <option value="">Select business type</option>
                                        {businessTypes.map(type => (
                                            <option key={type} value={type}>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                        ))}
                                    </select>
                                    {errors.business_type && (
                                        <p className="mt-1 text-sm text-red-600">{errors.business_type}</p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_dao}
                                            onChange={(e) => handleChange('is_dao', e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 block text-sm text-gray-700">
                                            This business is a DAO (Decentralized Autonomous Organization)
                                        </span>
                                    </label>
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="business_industry" className="block text-sm font-medium text-gray-700">
                                        Business Industry *
                                    </label>
                                    <select
                                        id="business_industry"
                                        value={formData.business_industry}
                                        onChange={(e) => {
                                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                            handleChange('business_industry', selectedOptions);
                                        }}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        {industryCodes.map(industry => (
                                            <option key={industry.code} value={industry.code}>
                                                {industry.description}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-sm text-gray-500">Select one or more industry codes</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'addresses' && (
                        <div className="bg-white shadow sm:rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Addresses</h2>

                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <h3 className="text-md font-medium text-gray-900 mb-2">Registered Address *</h3>
                                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label htmlFor="registered_street_line_1" className="block text-sm font-medium text-gray-700">
                                                Street Line 1 *
                                            </label>
                                            <input
                                                type="text"
                                                id="registered_street_line_1"
                                                value={formData.registered_address.street_line_1}
                                                onChange={(e) => handleAddressChange('registered_address', 'street_line_1', e.target.value)}
                                                className={`mt-1 block w-full border ${errors['registered_address.street_line_1'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            />
                                            {errors['registered_address.street_line_1'] && (
                                                <p className="mt-1 text-sm text-red-600">{errors['registered_address.street_line_1']}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label htmlFor="registered_street_line_2" className="block text-sm font-medium text-gray-700">
                                                Street Line 2
                                            </label>
                                            <input
                                                type="text"
                                                id="registered_street_line_2"
                                                value={formData.registered_address.street_line_2}
                                                onChange={(e) => handleAddressChange('registered_address', 'street_line_2', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="registered_city" className="block text-sm font-medium text-gray-700">
                                                City *
                                            </label>
                                            <input
                                                type="text"
                                                id="registered_city"
                                                value={formData.registered_address.city}
                                                onChange={(e) => handleAddressChange('registered_address', 'city', e.target.value)}
                                                className={`mt-1 block w-full border ${errors['registered_address.city'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            />
                                            {errors['registered_address.city'] && (
                                                <p className="mt-1 text-sm text-red-600">{errors['registered_address.city']}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="registered_subdivision" className="block text-sm font-medium text-gray-700">
                                                State/Province
                                            </label>
                                            <input
                                                type="text"
                                                id="registered_subdivision"
                                                value={formData.registered_address.subdivision}
                                                onChange={(e) => handleAddressChange('registered_address', 'subdivision', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                placeholder="e.g., NY"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="registered_postal_code" className="block text-sm font-medium text-gray-700">
                                                Postal Code
                                            </label>
                                            <input
                                                type="text"
                                                id="registered_postal_code"
                                                value={formData.registered_address.postal_code}
                                                onChange={(e) => handleAddressChange('registered_address', 'postal_code', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="registered_country" className="block text-sm font-medium text-gray-700">
                                                Country *
                                            </label>
                                            <select
                                                id="registered_country"
                                                value={formData.registered_address.country}
                                                onChange={(e) => handleAddressChange('registered_address', 'country', e.target.value)}
                                                className={`mt-1 block w-full border ${errors['registered_address.country'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            >
                                                <option value="">Select Nationality</option>
                                                {countries?.map(country => (
                                                    <option key={country.code} value={country.code}>{country.name}</option>
                                                ))}
                                            </select>
                                            {errors['registered_address.country'] && (
                                                <p className="mt-1 text-sm text-red-600">{errors['registered_address.country']}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <h3 className="text-md font-medium text-gray-900 mb-2">Physical Address (Primary Place of Business) *</h3>
                                    <p className="text-sm text-gray-500 mb-2">This must be a physical address and cannot be a PO Box.</p>
                                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label htmlFor="physical_street_line_1" className="block text-sm font-medium text-gray-700">
                                                Street Line 1 *
                                            </label>
                                            <input
                                                type="text"
                                                id="physical_street_line_1"
                                                value={formData.physical_address.street_line_1}
                                                onChange={(e) => handleAddressChange('physical_address', 'street_line_1', e.target.value)}
                                                className={`mt-1 block w-full border ${errors['physical_address.street_line_1'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            />
                                            {errors['physical_address.street_line_1'] && (
                                                <p className="mt-1 text-sm text-red-600">{errors['physical_address.street_line_1']}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label htmlFor="physical_street_line_2" className="block text-sm font-medium text-gray-700">
                                                Street Line 2
                                            </label>
                                            <input
                                                type="text"
                                                id="physical_street_line_2"
                                                value={formData.physical_address.street_line_2}
                                                onChange={(e) => handleAddressChange('physical_address', 'street_line_2', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="physical_city" className="block text-sm font-medium text-gray-700">
                                                City *
                                            </label>
                                            <input
                                                type="text"
                                                id="physical_city"
                                                value={formData.physical_address.city}
                                                onChange={(e) => handleAddressChange('physical_address', 'city', e.target.value)}
                                                className={`mt-1 block w-full border ${errors['physical_address.city'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            />
                                            {errors['physical_address.city'] && (
                                                <p className="mt-1 text-sm text-red-600">{errors['physical_address.city']}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="physical_subdivision" className="block text-sm font-medium text-gray-700">
                                                State/Province
                                            </label>
                                            <input
                                                type="text"
                                                id="physical_subdivision"
                                                value={formData.physical_address.subdivision}
                                                onChange={(e) => handleAddressChange('physical_address', 'subdivision', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                placeholder="e.g., NY"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="physical_postal_code" className="block text-sm font-medium text-gray-700">
                                                Postal Code
                                            </label>
                                            <input
                                                type="text"
                                                id="physical_postal_code"
                                                value={formData.physical_address.postal_code}
                                                onChange={(e) => handleAddressChange('physical_address', 'postal_code', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="physical_country" className="block text-sm font-medium text-gray-700">
                                                Country *
                                            </label>
                                            <input
                                                type="text"
                                                id="physical_country"
                                                value={formData.physical_address.country}
                                                onChange={(e) => handleAddressChange('physical_address', 'country', e.target.value)}
                                                className={`mt-1 block w-full border ${errors['physical_address.country'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                                placeholder="3-letter code (e.g., USA)"
                                            />
                                            {errors['physical_address.country'] && (
                                                <p className="mt-1 text-sm text-red-600">{errors['physical_address.country']}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'persons' && (
                        <div className="bg-white shadow sm:rounded-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-medium text-gray-900">Associated Persons</h2>
                                <button
                                    type="button"
                                    onClick={addAssociatedPerson}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Add Person
                                </button>
                            </div>

                            {errors.associated_persons && (
                                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                                    <p className="text-sm text-red-700">{errors.associated_persons}</p>
                                </div>
                            )}

                            {formData.associated_persons.map((person, index) => (
                                <div key={index} className="mb-6 p-4 border border-gray-200 rounded-md">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-md font-medium text-gray-900">Associated Person {index + 1}</h3>
                                        <button
                                            type="button"
                                            onClick={() => removeAssociatedPerson(index)}
                                            className="text-red-600 hover:text-red-800 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor={`first_name_${index}`} className="block text-sm font-medium text-gray-700">
                                                First Name *
                                            </label>
                                            <input
                                                type="text"
                                                id={`first_name_${index}`}
                                                value={person.first_name}
                                                onChange={(e) => handleAssociatedPersonChange(index, 'first_name', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor={`last_name_${index}`} className="block text-sm font-medium text-gray-700">
                                                Last Name *
                                            </label>
                                            <input
                                                type="text"
                                                id={`last_name_${index}`}
                                                value={person.last_name}
                                                onChange={(e) => handleAssociatedPersonChange(index, 'last_name', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor={`birth_date_${index}`} className="block text-sm font-medium text-gray-700">
                                                Date of Birth *
                                            </label>
                                            <input
                                                type="date"
                                                id={`birth_date_${index}`}
                                                value={person.birth_date}
                                                onChange={(e) => handleAssociatedPersonChange(index, 'birth_date', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor={`email_${index}`} className="block text-sm font-medium text-gray-700">
                                                Email *
                                            </label>
                                            <input
                                                type="email"
                                                id={`email_${index}`}
                                                value={person.email}
                                                onChange={(e) => handleAssociatedPersonChange(index, 'email', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor={`phone_${index}`} className="block text-sm font-medium text-gray-700">
                                                Phone
                                            </label>
                                            <input
                                                type="tel"
                                                id={`phone_${index}`}
                                                value={person.phone}
                                                onChange={(e) => handleAssociatedPersonChange(index, 'phone', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                placeholder="+12223334444"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor={`title_${index}`} className="block text-sm font-medium text-gray-700">
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                id={`title_${index}`}
                                                value={person.title}
                                                onChange={(e) => handleAssociatedPersonChange(index, 'title', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor={`ownership_percentage_${index}`} className="block text-sm font-medium text-gray-700">
                                                Ownership Percentage
                                            </label>
                                            <input
                                                type="number"
                                                id={`ownership_percentage_${index}`}
                                                value={person.ownership_percentage}
                                                onChange={(e) => handleAssociatedPersonChange(index, 'ownership_percentage', parseInt(e.target.value) || 0)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                min="0"
                                                max="100"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor={`relationship_established_at_${index}`} className="block text-sm font-medium text-gray-700">
                                                Relationship Established At *
                                            </label>
                                            <input
                                                type="date"
                                                id={`relationship_established_at_${index}`}
                                                value={person.relationship_established_at}
                                                onChange={(e) => handleAssociatedPersonChange(index, 'relationship_established_at', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Residential Address *</h4>
                                            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                                <div className="sm:col-span-2">
                                                    <label htmlFor={`res_street_1_${index}`} className="block text-sm font-medium text-gray-700">
                                                        Street Line 1 *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id={`res_street_1_${index}`}
                                                        value={person.residential_address.street_line_1}
                                                        onChange={(e) => handleAssociatedPersonAddressChange(index, 'street_line_1', e.target.value)}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    />
                                                </div>

                                                <div className="sm:col-span-2">
                                                    <label htmlFor={`res_street_2_${index}`} className="block text-sm font-medium text-gray-700">
                                                        Street Line 2
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id={`res_street_2_${index}`}
                                                        value={person.residential_address.street_line_2}
                                                        onChange={(e) => handleAssociatedPersonAddressChange(index, 'street_line_2', e.target.value)}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor={`res_city_${index}`} className="block text-sm font-medium text-gray-700">
                                                        City *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id={`res_city_${index}`}
                                                        value={person.residential_address.city}
                                                        onChange={(e) => handleAssociatedPersonAddressChange(index, 'city', e.target.value)}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor={`res_subdivision_${index}`} className="block text-sm font-medium text-gray-700">
                                                        State/Province
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id={`res_subdivision_${index}`}
                                                        value={person.residential_address.subdivision}
                                                        onChange={(e) => handleAssociatedPersonAddressChange(index, 'subdivision', e.target.value)}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                        placeholder="e.g., NY"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor={`res_postal_code_${index}`} className="block text-sm font-medium text-gray-700">
                                                        Postal Code
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id={`res_postal_code_${index}`}
                                                        value={person.residential_address.postal_code}
                                                        onChange={(e) => handleAssociatedPersonAddressChange(index, 'postal_code', e.target.value)}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor={`res_country_${index}`} className="block text-sm font-medium text-gray-700">
                                                        Country *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id={`res_country_${index}`}
                                                        value={person.residential_address.country}
                                                        onChange={(e) => handleAssociatedPersonAddressChange(index, 'country', e.target.value)}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                        placeholder="3-letter code (e.g., USA)"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={person.has_ownership}
                                                            onChange={(e) => handleAssociatedPersonChange(index, 'has_ownership', e.target.checked)}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />
                                                        <span className="ml-2 block text-sm text-gray-700">
                                                            Has ownership (≥25%)
                                                        </span>
                                                    </label>
                                                </div>

                                                <div>
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={person.has_control}
                                                            onChange={(e) => handleAssociatedPersonChange(index, 'has_control', e.target.checked)}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />
                                                        <span className="ml-2 block text-sm text-gray-700">
                                                            Has control
                                                        </span>
                                                    </label>
                                                </div>

                                                <div>
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={person.is_signer}
                                                            onChange={(e) => handleAssociatedPersonChange(index, 'is_signer', e.target.checked)}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />
                                                        <span className="ml-2 block text-sm text-gray-700">
                                                            Is signer
                                                        </span>
                                                    </label>
                                                </div>

                                                <div>
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={person.is_director}
                                                            onChange={(e) => handleAssociatedPersonChange(index, 'is_director', e.target.checked)}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />
                                                        <span className="ml-2 block text-sm text-gray-700">
                                                            Is director
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {formData.associated_persons.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No associated persons added. Click "Add Person" to begin.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="bg-white shadow sm:rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-6">Financial Information</h2>

                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="account_purpose" className="block text-sm font-medium text-gray-700">
                                        Account Purpose *
                                    </label>
                                    <select
                                        id="account_purpose"
                                        value={formData.account_purpose}
                                        onChange={(e) => handleChange('account_purpose', e.target.value)}
                                        className={`mt-1 block w-full border ${errors.account_purpose ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                    >
                                        <option value="">Select purpose</option>
                                        {accountPurposes.map(purpose => (
                                            <option key={purpose} value={purpose}>
                                                {purpose.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.account_purpose && (
                                        <p className="mt-1 text-sm text-red-600">{errors.account_purpose}</p>
                                    )}
                                </div>

                                {formData.account_purpose === 'other' && (
                                    <div>
                                        <label htmlFor="account_purpose_other" className="block text-sm font-medium text-gray-700">
                                            Specify Account Purpose *
                                        </label>
                                        <input
                                            type="text"
                                            id="account_purpose_other"
                                            value={formData.account_purpose_other}
                                            onChange={(e) => handleChange('account_purpose_other', e.target.value)}
                                            className={`mt-1 block w-full border ${errors.account_purpose_other ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                        />
                                        {errors.account_purpose_other && (
                                            <p className="mt-1 text-sm text-red-600">{errors.account_purpose_other}</p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="source_of_funds" className="block text-sm font-medium text-gray-700">
                                        Source of Funds *
                                    </label>
                                    <select
                                        id="source_of_funds"
                                        value={formData.source_of_funds}
                                        onChange={(e) => handleChange('source_of_funds', e.target.value)}
                                        className={`mt-1 block w-full border ${errors.source_of_funds ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                    >
                                        <option value="">Select source</option>
                                        {sourceOfFunds.map(source => (
                                            <option key={source} value={source}>
                                                {source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.source_of_funds && (
                                        <p className="mt-1 text-sm text-red-600">{errors.source_of_funds}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="source_of_funds_description" className="block text-sm font-medium text-gray-700">
                                        Source of Funds Description
                                    </label>
                                    <textarea
                                        id="source_of_funds_description"
                                        rows={3}
                                        value={formData.source_of_funds_description}
                                        onChange={(e) => handleChange('source_of_funds_description', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">High Risk Activities</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {highRiskActivities.map(activity => (
                                            <label key={activity} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.high_risk_activities.includes(activity)}
                                                    onChange={() => handleHighRiskActivityChange(activity)}
                                                    disabled={activity === 'none_of_the_above' && formData.high_risk_activities.length > 1 && !formData.high_risk_activities.includes('none_of_the_above')}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                />
                                                <span className="ml-2 block text-sm text-gray-700">
                                                    {activity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.high_risk_activities && (
                                        <p className="mt-1 text-sm text-red-600">{errors.high_risk_activities}</p>
                                    )}
                                </div>

                                {(!formData.high_risk_activities.includes('none_of_the_above') || formData.high_risk_activities.length > 1) && (
                                    <div className="sm:col-span-2">
                                        <label htmlFor="high_risk_activities_explanation" className="block text-sm font-medium text-gray-700">
                                            High Risk Activities Explanation *
                                        </label>
                                        <textarea
                                            id="high_risk_activities_explanation"
                                            rows={3}
                                            value={formData.high_risk_activities_explanation}
                                            onChange={(e) => handleChange('high_risk_activities_explanation', e.target.value)}
                                            className={`mt-1 block w-full border ${errors.high_risk_activities_explanation ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                        />
                                        {errors.high_risk_activities_explanation && (
                                            <p className="mt-1 text-sm text-red-600">{errors.high_risk_activities_explanation}</p>
                                        )}
                                    </div>
                                )}

                                <div className="sm:col-span-2">
                                    <label className="flex items-start">
                                        <input
                                            type="checkbox"
                                            checked={formData.conducts_money_services}
                                            onChange={(e) => handleChange('conducts_money_services', e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                                        />
                                        <div className="ml-2">
                                            <span className="block text-sm font-medium text-gray-700">
                                                This business offers money services, investment products, and/or other financial services
                                            </span>
                                            <p className="text-sm text-gray-500">Check this if your business provides financial services</p>
                                        </div>
                                    </label>
                                </div>

                                {formData.conducts_money_services && (
                                    <>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="conducts_money_services_description" className="block text-sm font-medium text-gray-700">
                                                Description of Money Services Offered *
                                            </label>
                                            <textarea
                                                id="conducts_money_services_description"
                                                rows={3}
                                                value={formData.conducts_money_services_description}
                                                onChange={(e) => handleChange('conducts_money_services_description', e.target.value)}
                                                className={`mt-1 block w-full border ${errors.conducts_money_services_description ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            />
                                            {errors.conducts_money_services_description && (
                                                <p className="mt-1 text-sm text-red-600">{errors.conducts_money_services_description}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label htmlFor="compliance_screening_explanation" className="block text-sm font-medium text-gray-700">
                                                Compliance Screening Explanation *
                                            </label>
                                            <textarea
                                                id="compliance_screening_explanation"
                                                rows={3}
                                                value={formData.compliance_screening_explanation}
                                                onChange={(e) => handleChange('compliance_screening_explanation', e.target.value)}
                                                className={`mt-1 block w-full border ${errors.compliance_screening_explanation ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                            />
                                            {errors.compliance_screening_explanation && (
                                                <p className="mt-1 text-sm text-red-600">{errors.compliance_screening_explanation}</p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="flex items-start">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.conducts_money_services_using_bridge}
                                                    onChange={(e) => handleChange('conducts_money_services_using_bridge', e.target.checked)}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                                                />
                                                <div className="ml-2">
                                                    <span className="block text-sm font-medium text-gray-700">
                                                        This business plans to conduct money services, investment products, and/or other financial services using its Bridge account
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label htmlFor="estimated_annual_revenue_usd" className="block text-sm font-medium text-gray-700">
                                        Estimated Annual Revenue (USD)
                                    </label>
                                    <select
                                        id="estimated_annual_revenue_usd"
                                        value={formData.estimated_annual_revenue_usd}
                                        onChange={(e) => handleChange('estimated_annual_revenue_usd', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value="">Select revenue range</option>
                                        {estimatedRevenueOptions.map(option => (
                                            <option key={option} value={option}>
                                                {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="expected_monthly_payments_usd" className="block text-sm font-medium text-gray-700">
                                        Expected Monthly Payments (USD)
                                    </label>
                                    <input
                                        type="number"
                                        id="expected_monthly_payments_usd"
                                        value={formData.expected_monthly_payments_usd}
                                        onChange={(e) => handleChange('expected_monthly_payments_usd', parseInt(e.target.value) || 0)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="operates_in_prohibited_countries" className="block text-sm font-medium text-gray-700">
                                        Operates in Prohibited Countries?
                                    </label>
                                    <select
                                        id="operates_in_prohibited_countries"
                                        value={formData.operates_in_prohibited_countries}
                                        onChange={(e) => handleChange('operates_in_prohibited_countries', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="ownership_threshold" className="block text-sm font-medium text-gray-700">
                                        Ownership Threshold
                                    </label>
                                    <select
                                        id="ownership_threshold"
                                        value={formData.ownership_threshold}
                                        onChange={(e) => handleChange('ownership_threshold', parseInt(e.target.value))}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        {[5, 10, 15, 20, 25].map(threshold => (
                                            <option key={threshold} value={threshold}>{threshold}%</option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-sm text-gray-500">The beneficial ownership threshold for associated persons</p>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.has_material_intermediary_ownership}
                                            onChange={(e) => handleChange('has_material_intermediary_ownership', e.target.checked)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 block text-sm text-gray-700">
                                            This business has at least one intermediate legal entity owner with 25% or more ownership
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'regulatory' && (
                        <div className="bg-white shadow sm:rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-6">Regulatory Information</h2>

                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label htmlFor="regulated_activities_description" className="block text-sm font-medium text-gray-700">
                                        Regulated Activities Description
                                    </label>
                                    <textarea
                                        id="regulated_activities_description"
                                        rows={3}
                                        value={formData.regulated_activity.regulated_activities_description}
                                        onChange={(e) => handleChange('regulated_activity', {
                                            ...formData.regulated_activity,
                                            regulated_activities_description: e.target.value
                                        })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="primary_regulatory_authority_country" className="block text-sm font-medium text-gray-700">
                                        Primary Regulatory Authority Country
                                    </label>
                                    <input
                                        type="text"
                                        id="primary_regulatory_authority_country"
                                        value={formData.regulated_activity.primary_regulatory_authority_country}
                                        onChange={(e) => handleChange('regulated_activity', {
                                            ...formData.regulated_activity,
                                            primary_regulatory_authority_country: e.target.value
                                        })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="3-letter code (e.g., USA)"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="primary_regulatory_authority_name" className="block text-sm font-medium text-gray-700">
                                        Primary Regulatory Authority Name
                                    </label>
                                    <input
                                        type="text"
                                        id="primary_regulatory_authority_name"
                                        value={formData.regulated_activity.primary_regulatory_authority_name}
                                        onChange={(e) => handleChange('regulated_activity', {
                                            ...formData.regulated_activity,
                                            primary_regulatory_authority_name: e.target.value
                                        })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="license_number" className="block text-sm font-medium text-gray-700">
                                        License Number
                                    </label>
                                    <input
                                        type="text"
                                        id="license_number"
                                        value={formData.regulated_activity.license_number}
                                        onChange={(e) => handleChange('regulated_activity', {
                                            ...formData.regulated_activity,
                                            license_number: e.target.value
                                        })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            {errors.regulated_activity && (
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                                    <p className="text-sm text-yellow-800">{errors.regulated_activity}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <DocumentsTab
                            formData={formData}
                            setFormData={setFormData}
                            documentPurposes={documentPurposes}
                        />
                    )}

                    {activeTab === 'identifying_information' && (
                        <IdentifyingInfoTab
                            formData={formData}
                            setFormData={setFormData}
                            idTypes={governmentIdTypes}
                        />
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isLoading ? 'Submitting...' : 'Submit Business Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
};

export default BusinessCustomerForm;































// // resources/js/Pages/CreateBusiness.tsx
// import { BusinessCustomerForm } from '@/components/BusinessCustomerForm';

// export default function CreateBusiness() {
//   return (
//     <div className="py-12">
//       <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
//         <BusinessCustomerForm />
//       </div>
//     </div>
//   );
// }