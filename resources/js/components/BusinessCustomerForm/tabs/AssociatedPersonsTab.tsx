import { AssociatedPerson } from "../types/business.types";

interface Props {
	persons: AssociatedPerson[];
	onAdd: () => void;
	onRemove: (idx: number) => void;
	onChange: (idx: number, field: string, value: any) => void;
	errors: Record<string, string>;
}
export const AssociatedPersonsTab: React.FC<Props> = ({ persons, onAdd, onRemove, onChange, errors }) => (
	<div>
		<div className="flex justify-between items-center mb-4">
			<h2 className="text-lg font-medium text-gray-900">Associated Persons</h2>
			<button onClick={onAdd} className="btn-primary">Add Person</button>
		</div>
		{persons.map((p, i) => (
			<AssociatedPersonCard
				key={i}
				person={p}
				index={i}
				onChange={onChange}
				onRemove={onRemove}
				errors={errors}
			/>
		))}
	</div>
);