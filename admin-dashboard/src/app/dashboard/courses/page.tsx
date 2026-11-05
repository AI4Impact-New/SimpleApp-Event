'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCourses, useDeleteCourse } from '@/hooks/useCourses';
import { Plus, Loader2, BookOpen, Eye, Pencil, Trash2 } from 'lucide-react';
import { Course } from '@/types/course';

export default function CoursesPage() {
  const { data: courses, isLoading } = useCourses();
  const deleteCourse = useDeleteCourse();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (course: Course) => {
    if (!confirm(`Delete course "${course.title}"? This cannot be undone.`)) return;
    setDeletingId(course.id);
    try {
      await deleteCourse.mutateAsync(course.id);
    } finally {
      setDeletingId(null);
    }
  };

  const list = Array.isArray(courses) ? courses : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Courses</h1>
          <p className="mt-1 text-sm text-gray-500">Manage Samagyaan Data solutions courses and programs</p>
        </div>
        <Link
          href="/dashboard/courses/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Plus size={18} aria-hidden />
          Add Course
        </Link>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20 shadow-sm">
          <Loader2 className="animate-spin text-primary-500" size={32} aria-hidden />
        </div>
      ) : list.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {list.map((course: Course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{course.title}</span>
                    {course.short_description && (
                      <p className="mt-0.5 max-w-md truncate text-sm text-gray-500">{course.short_description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        course.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {course.status}
                    </span>
                    {(course as any).delivery_modes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {((course as any).delivery_modes as string[]).map((m: string) => (
                          <span key={m} className="inline-flex rounded px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 capitalize">
                            {String(m).replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{course.display_order ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/courses/${course.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                      <Link
                        href={`/dashboard/courses/${course.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil size={16} />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(course)}
                        disabled={deletingId === course.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === course.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-b from-primary-50/80 to-white px-8 py-14 sm:px-12 sm:py-16">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100">
                <BookOpen size={40} className="text-primary-600" aria-hidden />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">No courses yet</h2>
              <p className="mt-3 text-gray-600">
                Add courses and programs to display in the app. You can manage highlights, phases, benefits, and more.
              </p>
              <Link
                href="/dashboard/courses/new"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                <Plus size={20} aria-hidden />
                Add your first course
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
