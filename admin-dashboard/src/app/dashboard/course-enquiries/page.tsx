'use client';

import { useState } from 'react';
import { WebsiteEnquiries } from '@/components/learning/WebsiteEnquiries';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/services/api';
import { Loader2, MessageCircle, User, BookOpen } from 'lucide-react';

export default function CourseEnquiriesPage() {
  const [tab, setTab] = useState<'website' | 'app'>('website');
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ['course-enquiries'],
    queryFn: () => api.getCourseEnquiries({ status: 'interested' }),
    enabled: tab === 'app',
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Course Enquiries</h1>
        <p className="mt-1 text-sm text-gray-500">Website leads and signed-in students who showed course interest.</p>
      </header>

      <nav aria-label="Enquiry sources" className="flex gap-5 border-b"><button className={`border-b-2 px-1 py-3 text-sm ${tab==='website'?'border-primary-600 text-primary-700':'border-transparent text-gray-500'}`} onClick={()=>setTab('website')}>Website enquiries</button><button className={`border-b-2 px-1 py-3 text-sm ${tab==='app'?'border-primary-600 text-primary-700':'border-transparent text-gray-500'}`} onClick={()=>setTab('app')}>Student app interest</button></nav>
      {tab === 'website' ? <WebsiteEnquiries /> : isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      ) : enquiries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-900">No enquiries yet</h2>
          <p className="mt-1 text-sm text-gray-500">When users tap &quot;I&apos;m Interested&quot; on a course in the app, they will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Course</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Notes</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {enquiries.map((row: any) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/courses/${row.course_id}`} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium">
                      <BookOpen size={14} />
                      {row.course_title ?? 'Course'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.name ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.email ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.user_type ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{row.notes ?? '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/courses/${row.course_id}#registrations`}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      View / Update
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
