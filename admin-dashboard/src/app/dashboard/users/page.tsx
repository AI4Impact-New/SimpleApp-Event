'use client';

import { useMemo, useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Loader2 } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { CognitoUser } from '@/types/user';

const ACCESS_OPTIONS = ['All', 'App Users', 'Admins'] as const;
const TYPE_OPTIONS = ['All', 'Student', 'Working Professional', 'Admin'] as const;

function getDisplayName(user: CognitoUser) {
  return [user.given_name, user.family_name].filter(Boolean).join(' ') || user.name || '—';
}

function getAccessRole(user: CognitoUser) {
  return user.access_role === 'admin' || (user.groups || []).includes('Admins') ? 'Admin' : 'App User';
}

function getProfileType(user: CognitoUser) {
  if (getAccessRole(user) === 'Admin') return 'Admin';
  if (user.user_type === 'professional') return 'Working Professional';
  if (user.user_type === 'student') return 'Student';
  return 'Unspecified';
}

export default function UsersPage() {
  const [accessFilter, setAccessFilter] = useState<(typeof ACCESS_OPTIONS)[number]>('All');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>('All');
  const { data, isLoading } = useUsers('All');
  const users = useMemo(() => {
    let base = data?.users || [];

    if (accessFilter === 'Admins') {
      base = base.filter((user: CognitoUser) => getAccessRole(user) === 'Admin');
    } else if (accessFilter === 'App Users') {
      base = base.filter((user: CognitoUser) => getAccessRole(user) === 'App User');
    }

    if (typeFilter === 'All') return base;
    return base.filter((user: CognitoUser) => getProfileType(user) === typeFilter);
  }, [accessFilter, data?.users, typeFilter]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">View admins, students, and working professionals in one place</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Access Filter</label>
            <Select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as (typeof ACCESS_OPTIONS)[number])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              {ACCESS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Profile Type</label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as (typeof TYPE_OPTIONS)[number])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
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
                    <th className="py-2 pr-4 font-medium">Access</th>
                    <th className="py-2 pr-4 font-medium">Profile Type</th>
                    <th className="py-2 pr-4 font-medium">Detail</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Groups</th>
                    <th className="py-2 pr-0 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: CognitoUser) => (
                    <tr key={user.username} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 text-gray-900">{user.email || user.username}</td>
                      <td className="py-3 pr-4 text-gray-700">
                        {getDisplayName(user)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {getAccessRole(user) === 'Admin' ? (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            App User
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {getProfileType(user) === 'Working Professional' ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            Working Professional
                          </span>
                        ) : getProfileType(user) === 'Student' ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Student
                          </span>
                        ) : getProfileType(user) === 'Admin' ? (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
                            Admin
                          </span>
                        ) : (
                          <span className="text-gray-400">Unspecified</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {getAccessRole(user) === 'Admin'
                          ? (user.designation || user.company || 'Dashboard access')
                          : user.user_type === 'professional'
                          ? (user.company || user.designation || '—')
                          : user.user_type === 'student'
                            ? (user.university || user.course || '—')
                            : '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{user.status || '—'}</td>
                      <td className="py-3 pr-4 text-gray-700">{(user.groups || []).join(', ') || '—'}</td>
                      <td className="py-3 pr-0 text-gray-700">
                        {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="py-8 text-center text-gray-500">No users found for the selected filters</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
