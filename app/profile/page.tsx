'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import type { User } from '@supabase/supabase-js';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navigation />

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <p className="text-gray-400">Manage your account settings</p>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-2xl">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.email}</h2>
              <p className="text-gray-400 text-sm">
                Member since {new Date(user?.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Email</div>
              <div className="text-white">{user?.email}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">User ID</div>
              <div className="text-white font-mono text-sm">{user?.id.slice(0, 8)}...</div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Subscription</h3>

          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-emerald-400 font-semibold text-lg">Free Plan</div>
                <div className="text-gray-400 text-sm">Basic access to all features</div>
              </div>
              <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                Active
              </div>
            </div>

            <div className="text-sm text-gray-400 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-400">&#10003;</span> Real-time stock scanner
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-400">&#10003;</span> Seasonal analysis
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-400">&#10003;</span> Commodity correlations
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">&#10003;</span> Pattern library
              </div>
            </div>

            <button
              disabled
              className="w-full py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
            >
              Premium Plans Coming Soon
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Account Actions</h3>

          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
