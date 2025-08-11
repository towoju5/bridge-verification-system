import { AddressBlock } from "../shared/AddressBlock";

interface Props {
  registered: Address;
  physical: Address;
  onChangeRegistered: (field: keyof Address, value: string) => void;
  onChangePhysical: (field: keyof Address, value: string) => void;
  errors: Record<string, string>;
}
export const AddressesTab: React.FC<Props> = ({ registered, physical, onChangeRegistered, onChangePhysical, errors }) => (
  <div className="space-y-8">
    <AddressBlock
      title="Registered Address"
      address={registered}
      onChange={onChangeRegistered}
      errors={errors}
    />
    <AddressBlock
      title="Physical Address"
      address={physical}
      onChange={onChangePhysical}
      errors={errors}
    />
  </div>
);