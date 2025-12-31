'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { WORLD_COUNTRIES } from '@/lib/mapData';
import Link from 'next/link';
import Modal from '@/components/Modal';

export default function CreateGamePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [cooldownHours, setCooldownHours] = useState(12);
  const [defenseWindowHours, setDefenseWindowHours] = useState(72);
  const [attacksPerDay, setAttacksPerDay] = useState(1);
  const [claimsPerDay, setClaimsPerDay] = useState(1);
  const [enabledCountries, setEnabledCountries] = useState<string[]>([]);
  const [useUSStates, setUseUSStates] = useState(false);
  const [useAUStates, setUseAUStates] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'error' | 'success';
    message: string;
  }>({
    isOpen: false,
    type: 'error',
    message: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const filteredCountries = WORLD_COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function toggleCountry(countryId: string) {
    setEnabledCountries((prev) =>
      prev.includes(countryId)
        ? prev.filter((id) => id !== countryId)
        : [...prev, countryId]
    );
  }

  function selectAll() {
    setEnabledCountries(WORLD_COUNTRIES.map((c) => c.id));
  }

  function deselectAll() {
    setEnabledCountries([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (enabledCountries.length === 0) {
      setModal({
        isOpen: true,
        type: 'error',
        message: 'Please select at least one country',
      });
      return;
    }

    setCreating(true);

    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          cooldownHours,
          defenseWindowHours,
          attacksPerDay,
          claimsPerDay,
          enabledCountries,
          useUSStates,
          useAUStates,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/game/${data.game.id}`);
      } else {
        const data = await response.json();
        setModal({
          isOpen: true,
          type: 'error',
          message: data.error || 'Failed to create game',
        });
        setCreating(false);
      }
    } catch (error) {
      console.error('Error creating game:', error);
      setModal({
        isOpen: true,
        type: 'error',
        message: 'Failed to create game',
      });
      setCreating(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link
            href="/lobby"
            className="text-blue-600 hover:text-blue-700 mr-4"
          >
            ← Back to Lobby
          </Link>
          <h1 className="text-3xl font-bold">Create New Game</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Settings</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Game Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="My Awesome Game"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cooldown (hours)
                </label>
                <input
                  type="number"
                  value={cooldownHours}
                  onChange={(e) => setCooldownHours(parseInt(e.target.value))}
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Defense Window (hours)
                </label>
                <input
                  type="number"
                  value={defenseWindowHours}
                  onChange={(e) => setDefenseWindowHours(parseInt(e.target.value))}
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Attacks per Day
                </label>
                <input
                  type="number"
                  value={attacksPerDay}
                  onChange={(e) => setAttacksPerDay(parseInt(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Claims per Day
                </label>
                <input
                  type="number"
                  value={claimsPerDay}
                  onChange={(e) => setClaimsPerDay(parseInt(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Territory Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Territory Selection</h2>

            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useUSStates}
                  onChange={(e) => setUseUSStates(e.target.checked)}
                  disabled={!enabledCountries.includes('840')}
                  className="w-4 h-4"
                />
                <span>Use US States (instead of USA as one territory)</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAUStates}
                  onChange={(e) => setUseAUStates(e.target.checked)}
                  disabled={!enabledCountries.includes('036')}
                  className="w-4 h-4"
                />
                <span>Use Australian States (instead of Australia as one territory)</span>
              </label>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search countries..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Deselect All
              </button>
              <span className="ml-auto self-center text-sm">
                {enabledCountries.length} selected
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredCountries.map((country) => (
                  <label
                    key={country.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={enabledCountries.includes(country.id)}
                      onChange={() => toggleCountry(country.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{country.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Link
              href="/lobby"
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-center font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
            >
              {creating ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </form>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
}
