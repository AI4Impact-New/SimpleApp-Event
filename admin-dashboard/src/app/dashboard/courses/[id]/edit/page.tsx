'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCourse, useUpdateCourse } from '@/hooks/useCourses';
import { CourseForm } from '@/components/CourseForm';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function CourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: course, isLoading, error } = useCourse(id);
  const updateCourse = useUpdateCourse();

  const handleSubmit = async (data: Parameters<typeof CourseForm>[0]['initial']) => {
    if (!data) return;
    await updateCourse.mutateAsync({ id, data: data as any });
    router.push(`/dashboard/courses/${id}`);
  };

  if (isLoading || !course) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20 shadow-sm">
        <Loader2 className="animate-spin text-primary-500" size={32} aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load course. <Link href="/dashboard/courses" className="underline">Back to courses</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Courses
        </Link>
        <span className="text-gray-300">/</span>
        <Link href={`/dashboard/courses/${id}`} className="text-sm font-medium text-gray-600 hover:text-gray-900">
          {course.title}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">Edit</span>
      </div>

      <CourseForm
        initial={course as any}
        onSubmit={handleSubmit}
        isSubmitting={updateCourse.isPending}
        submitLabel="Save changes"
        cancelHref={`/dashboard/courses/${id}`}
      />
    </div>
  );
}
