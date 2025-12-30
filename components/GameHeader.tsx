'use client';

import { Swords, Star } from 'lucide-react';
import Link from 'next/link';
import { UserGameResources } from '@/lib/types';

interface GameHeaderProps {
  gameName: string;
  gameId: string;
  resources: UserGameResources | null;
}

export function GameHeader({ gameName, gameId, resources }: GameHeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/lobby"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Lobby
          </Link>
          <h1 className="text-2xl font-bold">{gameName}</h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Attack Resources */}
          <div className="flex items-center gap-2 group relative">
            <Swords className="w-5 h-5 text-red-600" />
            <span className="font-semibold">
              {resources?.available_attacks ?? 0}
            </span>
            <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Attack resources reset daily at UTC midnight
            </div>
          </div>

          {/* Claim Resources */}
          <div className="flex items-center gap-2 group relative">
            <Star className="w-5 h-5 text-blue-600 fill-blue-600" />
            <span className="font-semibold">
              {resources?.available_claims ?? 0}
            </span>
            <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Claim resources reset daily at UTC midnight
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
