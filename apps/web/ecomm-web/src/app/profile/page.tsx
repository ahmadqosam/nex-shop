"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';

export default function ProfilePage() {
  const { user, logout, isAuthLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading) {
    return <div className="container mx-auto px-4 py-20 text-center">Loading...</div>;
  }

  if (!user) {
    return null; // Redirecting
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="container mx-auto px-4 py-20 pt-32">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 max-w-md">
        <div className="mb-6">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Email</p>
          <p className="font-medium text-lg">{user.email}</p>
        </div>
        <div className="mb-6">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Member Since</p>
          <p className="font-medium text-lg">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 rounded-lg transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
