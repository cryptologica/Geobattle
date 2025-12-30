'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/lobby');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-6xl font-bold mb-4 text-white">GeoBattle</h1>
        <p className="text-2xl text-gray-300 mb-8">
          Claim, Attack, and Defend Territories Around the World
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">How to Play</h2>
          <ul className="text-left space-y-2 text-gray-700 dark:text-gray-300">
            <li>• Join up to 5 concurrent games</li>
            <li>• Use claim resources to take unclaimed territories</li>
            <li>• Use attack resources to contest enemy territories</li>
            <li>• Defend your territories from incoming attacks (free)</li>
            <li>• Resources reset daily at UTC midnight</li>
            <li>• Create custom games with your own rules</li>
          </ul>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => signIn('twitch', { callbackUrl: '/lobby' })}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
            Sign in with Twitch
          </button>
        </div>
      </div>
    </div>
  );
}
