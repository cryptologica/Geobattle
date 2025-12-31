'use client';

import { AttackWithDetails } from '@/lib/types';
import { Shield } from 'lucide-react';
import { useState } from 'react';
import Modal from './Modal';

interface AttackNotificationsProps {
  attacks: AttackWithDetails[];
  onDefend: () => void;
}

export function AttackNotifications({ attacks, onDefend }: AttackNotificationsProps) {
  const [defending, setDefending] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'error' | 'success';
    message: string;
  }>({
    isOpen: false,
    type: 'error',
    message: '',
  });

  function getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Expired';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  async function handleDefend(attackId: string, gameId: string, territoryId: string) {
    setDefending(attackId);

    try {
      const response = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          territoryId,
          action: 'defend',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onDefend();
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          message: data.error || 'Failed to defend',
        });
      }
    } catch (error) {
      console.error('Defend error:', error);
      setModal({
        isOpen: true,
        type: 'error',
        message: 'Failed to defend',
      });
    } finally {
      setDefending(null);
    }
  }

  if (attacks.length === 0) {
    return (
      <aside className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-auto">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Active Attacks
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No active attacks on your territories.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-auto">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-red-600" />
        Active Attacks ({attacks.length})
      </h2>

      <div className="space-y-3">
        {attacks.map((attack) => (
          <div
            key={attack.id}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 animate-pulse-red"
          >
            <div className="mb-2">
              <p className="font-semibold text-sm">{attack.territory?.name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                in {attack.game?.name}
              </p>
            </div>

            <div className="mb-3 text-sm">
              <p>
                <span className="text-gray-600 dark:text-gray-400">Attacker:</span>{' '}
                <span className="font-medium">{attack.attacker?.name}</span>
              </p>
              <p className="text-red-600 dark:text-red-400 font-medium">
                {getTimeRemaining(attack.expires_at)} remaining
              </p>
            </div>

            <button
              onClick={() => handleDefend(attack.id, attack.game_id, attack.territory_id)}
              disabled={defending === attack.id}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm font-medium"
            >
              {defending === attack.id ? 'Defending...' : 'Defend (Free)'}
            </button>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        message={modal.message}
        type={modal.type}
      />
    </aside>
  );
}
