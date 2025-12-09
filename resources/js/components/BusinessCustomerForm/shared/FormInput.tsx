interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}
export const FormInput: React.FC<Props> = ({ label, error, ...rest }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-white dark:text-white">{label}</label>
    <input {...rest} className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${error ? 'border-red-300' : 'border-gray-300'}`}/>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);