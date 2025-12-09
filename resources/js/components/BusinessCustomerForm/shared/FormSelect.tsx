interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}
export const FormSelect: React.FC<Props> = ({ label, options, error, ...rest }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-white">{label}</label>
    <select {...rest} className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${error ? 'border-red-300' : 'border-gray-300'}`}>
      <option value="">Select...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);