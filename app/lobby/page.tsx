'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameWithCreator } from '@/lib/types';
import Link from 'next/link';
import Modal from '@/components/Modal';

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [myGames, setMyGames] = useState<GameWithCreator[]>([]);
  const [availableGames, setAvailableGames] = useState<GameWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'error' | 'success' | 'confirm';
    message: string;
    onConfirm?: () => void;
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

  useEffect(() => {
    if (session?.user?.id) {
      loadGames();
    }
  }, [session]);

  async function loadGames() {
    try {
      // Get user's games
      const { data: userGames } = await supabase
        .from('user_games')
        .select('game_id')
        .eq('user_id', session!.user.id);

      const userGameIds = userGames?.map((ug) => ug.game_id) || [];

      // Get all games with creator info
      const { data: allGames } = await supabase
        .from('games')
        .select(`
          *,
          creator:users!games_creator_id_fkey(id, name, image)
        `)
        .order('created_at', { ascending: false });

      if (allGames) {
        // Get player counts
        const { data: playerCounts } = await supabase
          .from('user_games')
          .select('game_id');

        const counts = playerCounts?.reduce((acc: Record<string, number>, ug) => {
          acc[ug.game_id] = (acc[ug.game_id] || 0) + 1;
          return acc;
        }, {}) || {};

        const gamesWithCounts = allGames.map((game) => ({
          ...game,
          player_count: counts[game.id] || 0,
        }));

        setMyGames(gamesWithCounts.filter((g) => userGameIds.includes(g.id)));
        setAvailableGames(gamesWithCounts.filter((g) => !userGameIds.includes(g.id)));
      }
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  }

  async function joinGame(gameId: string) {
    try {
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      if (response.ok) {
        loadGames();
      } else {
        const data = await response.json();
        setModal({
          isOpen: true,
          type: 'error',
          message: data.error || 'Failed to join game',
        });
      }
    } catch (error) {
      console.error('Error joining game:', error);
      setModal({
        isOpen: true,
        type: 'error',
        message: 'Failed to join game',
      });
    }
  }

  async function leaveGame(gameId: string) {
    try {
      // First attempt to leave (will check if confirmation needed)
      const response = await fetch(`/api/game/join?gameId=${gameId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        
        // If confirmation is required (last player), ask user
        if (data.requiresConfirmation) {
          setModal({
            isOpen: true,
            type: 'confirm',
            message: data.message + '\n\nAre you sure you want to leave and delete this game?',
            onConfirm: async () => {
              // Try again with deleteGame flag
              const confirmResponse = await fetch(`/api/game/join?gameId=${gameId}&deleteGame=true`, {
                method: 'DELETE',
              });
              
              if (confirmResponse.ok) {
                loadGames();
              } else {
                setModal({
                  isOpen: true,
                  type: 'error',
                  message: 'Failed to leave game',
                });
              }
            },
          });
        } else {
          // Normal leave, no confirmation needed
          loadGames();
        }
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          message: 'Failed to leave game',
        });
      }
    } catch (error) {
      console.error('Error leaving game:', error);
      setModal({
        isOpen: true,
        type: 'error',
        message: 'Failed to leave game',
      });
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Game Lobby</h1>
          <Link
            href="/lobby/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Create New Game
          </Link>
        </div>

        {/* My Games */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            My Games ({myGames.length}/5)
          </h2>
          {myGames.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              You haven't joined any games yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <h3 className="text-xl font-semibold mb-2">{game.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Created by {game.creator?.name || 'Unknown'}
                  </p>
                  <div className="text-sm space-y-1 mb-4">
                    <p>Players: {game.player_count}</p>
                    <p>Cooldown: {game.cooldown_hours}h</p>
                    <p>Defense Window: {game.defense_window_hours}h</p>
                    <p>Attacks/day: {game.attacks_per_day}</p>
                    <p>Claims/day: {game.claims_per_day}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/game/${game.id}`}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-center font-medium"
                    >
                      Play
                    </Link>
                    <button
                      onClick={() => leaveGame(game.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium"
                    >
                      Leave
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Available Games */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Available Games</h2>
          {availableGames.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No other games available. Create one!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <h3 className="text-xl font-semibold mb-2">{game.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Created by {game.creator?.name || 'Unknown'}
                  </p>
                  <div className="text-sm space-y-1 mb-4">
                    <p>Players: {game.player_count}</p>
                    <p>Cooldown: {game.cooldown_hours}h</p>
                    <p>Defense Window: {game.defense_window_hours}h</p>
                    <p>Attacks/day: {game.attacks_per_day}</p>
                    <p>Claims/day: {game.claims_per_day}</p>
                  </div>
                  <button
                    onClick={() => joinGame(game.id)}
                    disabled={myGames.length >= 5}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                  >
                    {myGames.length >= 5 ? 'Max Games Reached' : 'Join Game'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
}
