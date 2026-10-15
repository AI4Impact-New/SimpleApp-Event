'use client';

import {MarketingAccess} from '@/components/MarketingAccess';
import { useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useAdminUsers, useCreateAdminUser } from '@/hooks/useUsers';
import { CognitoUser } from '@/types/user';

export default function AdminUsersPage() {
  const { data, isLoading } = useAdminUsers();
  const createAdminUser = useCreateAdminUser();
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const adminUsers = useMemo(() => data?.users || [], [data?.users]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const result = await createAdminUser.mutateAsync({
        email: email.trim(),
        temp_password: tempPassword,
        given_name: givenName.trim() || undefined,
        family_name: familyName.trim() || undefined,
      });

      setSuccess(result?.message || 'Admin user created successfully.');
      setEmail('');
      setTempPassword('');
      setGivenName('');
      setFamilyName('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create admin user');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Users</h1>
        <p className="mt-1 text-sm text-gray-500">Create and manage dashboard admin accounts from Cognito</p>
      </header>

      <MarketingAccess/>
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Admin User</h2>
        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              required
            />
            <input
              type="text"
              placeholder="Temporary Password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              required
            />
            <input
              type="text"
              placeholder="First Name (optional)"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="text"
              placeholder="Last Name (optional)"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={createAdminUser.isPending || !email.trim() || !tempPassword.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {createAdminUser.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Create Admin User
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Current Admin Users</h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary-500" size={28} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Profile Type</th>
                    <th className="py-2 pr-4 font-medium">Detail</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Groups</th>
                    <th className="py-2 pr-0 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user: CognitoUser) => (
                    <tr key={user.username} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 text-gray-900">{user.email || user.username}</td>
                      <td className="py-3 pr-4 text-gray-700">
                        {[user.given_name, user.family_name].filter(Boolean).join(' ') || user.name || '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {user.user_type === 'professional' ? 'Working Professional' : user.user_type === 'student' ? 'Student' : 'Admin'}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{user.designation || user.company || user.university || '—'}</td>
                      <td className="py-3 pr-4 text-gray-700">{user.status || '—'}</td>
                      <td className="py-3 pr-4 text-gray-700">{(user.groups || []).join(', ') || '—'}</td>
                      <td className="py-3 pr-0 text-gray-700">
                        {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminUsers.length === 0 && (
                <p className="py-8 text-center text-gray-500">No admin users found</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
