import { FormInput } from "./FormInput";

interface Props {
  title: string;
  address: Address;
  onChange: (field: keyof Address, value: string) => void;
  errors?: Record<string, string>;
}
export const AddressBlock: React.FC<Props> = ({ title, address, onChange, errors }) => (
  <div>
    <h3 className="text-md font-medium text-gray-900 mb-2">{title} *</h3>
    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
      <FormInput
        label="Street Line 1 *"
        value={address.street_line_1}
        onChange={e => onChange('street_line_1', e.target.value)}
        error={errors?.street_line_1}
      />
      <FormInput
        label="Street Line 2"
        value={address.street_line_2}
        onChange={e => onChange('street_line_2', e.target.value)}
      />
      <FormInput
        label="City *"
        value={address.city}
        onChange={e => onChange('city', e.target.value)}
        error={errors?.city}
      />
      <FormInput
        label="State/Province"
        value={address.subdivision}
        onChange={e => onChange('subdivision', e.target.value)}
      />
      <FormInput
        label="Postal Code"
        value={address.postal_code}
        onChange={e => onChange('postal_code', e.target.value)}
      />
      <FormInput
        label="Country (3-letter) *"
        value={address.country}
        onChange={e => onChange('country', e.target.value)}
        error={errors?.country}
      />
    </div>
  </div>
);