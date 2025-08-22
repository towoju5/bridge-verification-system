import React, { useState } from 'react';
import axios from 'axios';

interface Person {
  first_name: string;
  last_name: string;
  birth_date: string;
  email: string;
  phone: string;
  title: string;
  ownership_percentage: number;
  relationship_established_at: string;
  residential_address: {
    street_line_1: string;
    street_line_2: string;
    city: string;
    subdivision: string;
    postal_code: string;
    country: string;
  };
  has_ownership: boolean;
  has_control: boolean;
  is_signer: boolean;
  is_director: boolean;
}


interface Country { code: string; name: string }

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  setActiveTab: (tab: string) => void;
  countries?: Country[];
}


export default function AssociatedPersons({ formData, setFormData, setActiveTab, countries = [] }: Props) {
  const [persons, setPersons] = useState<Person[]>(formData.associated_persons || []);

  const blankPerson = (): Person => ({
    first_name: '',
    last_name: '',
    birth_date: '',
    email: '',
    phone: '',
    title: '',
    ownership_percentage: 0,
    relationship_established_at: '',
    residential_address: {
      street_line_1: '',
      street_line_2: '',
      city: '',
      subdivision: '',
      postal_code: '',
      country: '',
    },
    has_ownership: false,
    has_control: false,
    is_signer: false,
    is_director: false,
  });

  const add = () => setPersons([...persons, blankPerson()]);
  const remove = (idx: number) => setPersons(persons.filter((_, i) => i !== idx));
  const update = (idx: number, field: string, val: any) => {
    const copy = [...persons];
    (copy[idx] as any)[field] = val;
    setPersons(copy);
  };
  const updateAddr = (idx: number, field: string, val: string) => {
    const copy = [...persons];
    (copy[idx].residential_address as any)[field] = val;
    setPersons(copy);
  };

  const next = async () => {
    await axios.post('/api/business-customer/step/3', { associated_persons: persons });
    setFormData((prev: any) => ({ ...prev, associated_persons: persons }));
    setActiveTab('financial');
  };

  return (
    <div className="bg-white shadow sm:rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Associated Persons</h2>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Add Person
        </button>
      </div>

      {persons.map((p, idx) => (
        <div key={idx} className="mb-6 p-4 border border-gray-200 rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-medium text-gray-900">Associated Person {idx + 1}</h3>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
            <div>
              <label>First Name *</label>
              <input
                value={p.first_name}
                onChange={(e) => update(idx, 'first_name', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
            </div>
            <div>
              <label>Last Name *</label>
              <input
                value={p.last_name}
                onChange={(e) => update(idx, 'last_name', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
            </div>
            <div>
              <label>Date of Birth *</label>
              <input
                type="date"
                value={p.birth_date}
                onChange={(e) => update(idx, 'birth_date', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
            </div>
            <div>
              <label>Email *</label>
              <input
                type="email"
                value={p.email}
                onChange={(e) => update(idx, 'email', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
            </div>
            <div>
              <label>Phone</label>
              <input
                type="tel"
                value={p.phone}
                onChange={(e) => update(idx, 'phone', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                placeholder="+12223334444"
              />
            </div>
            <div>
              <label>Title</label>
              <input
                value={p.title}
                onChange={(e) => update(idx, 'title', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
            </div>
            <div>
              <label>Ownership %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={p.ownership_percentage}
                onChange={(e) => update(idx, 'ownership_percentage', parseInt(e.target.value) || 0)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
            </div>
            <div>
              <label>Relationship Established</label>
              <input
                type="date"
                value={p.relationship_established_at}
                onChange={(e) => update(idx, 'relationship_established_at', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              />
            </div>

            {/* Residential Address */}
            <div className="sm:col-span-2">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Residential Address *</h4>
              <div className="grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label>Street Line 1 *</label>
                  <input
                    value={p.residential_address.street_line_1}
                    onChange={(e) => updateAddr(idx, 'street_line_1', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label>Street Line 2</label>
                  <input
                    value={p.residential_address.street_line_2}
                    onChange={(e) => updateAddr(idx, 'street_line_2', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label>City *</label>
                  <input
                    value={p.residential_address.city}
                    onChange={(e) => updateAddr(idx, 'city', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label>State/Province</label>
                  <input
                    value={p.residential_address.subdivision}
                    onChange={(e) => updateAddr(idx, 'subdivision', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                    placeholder="e.g., NY"
                  />
                </div>
                <div>
                  <label>Postal Code</label>
                  <input
                    value={p.residential_address.postal_code}
                    onChange={(e) => updateAddr(idx, 'postal_code', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label>Country *</label>
                  {(countries || []).length ? (
                    <select
                      value={p.residential_address.country}
                      onChange={(e) => updateAddr(idx, 'country', e.target.value)}
                      className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                    >
                      <option value="">Select country</option>
                      {(countries || []).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  ) : (
                    <input
                      value={p.residential_address.country}
                      onChange={(e) => updateAddr(idx, 'country', e.target.value)}
                      className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                      placeholder="3-letter code (e.g., USA)"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Roles */}
            <div className="sm:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={p.has_ownership}
                    onChange={(e) => update(idx, 'has_ownership', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 block text-sm text-gray-700">Has ownership (≥25%)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={p.has_control}
                    onChange={(e) => update(idx, 'has_control', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 block text-sm text-gray-700">Has control</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={p.is_signer}
                    onChange={(e) => update(idx, 'is_signer', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 block text-sm text-gray-700">Is signer</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={p.is_director}
                    onChange={(e) => update(idx, 'is_director', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 block text-sm text-gray-700">Is director</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}

      {persons.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No associated persons added. Click “Add Person” to begin.</p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={next}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}