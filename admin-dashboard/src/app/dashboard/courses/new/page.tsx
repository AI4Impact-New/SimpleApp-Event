'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateCourse } from '@/hooks/useCourses';
import { CourseForm } from '@/components/CourseForm';
import { ArrowLeft } from 'lucide-react';

export default function CourseNewPage() {
  const router = useRouter();
  const createCourse = useCreateCourse();

  const handleSubmit = async (data: Parameters<typeof CourseForm>[0]['initial']) => {
    if (!data) return;
    const result = await createCourse.mutateAsync(data as any);
    const id = result?.id;
    if (id) router.push(`/dashboard/courses/${id}`);
    else router.push('/dashboard/courses');
  };

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
        <span className="text-sm font-semibold text-gray-900">New course</span>
      </div>

      <CourseForm
        initial={null}
        onSubmit={handleSubmit}
        isSubmitting={createCourse.isPending}
        submitLabel="Create course"
        cancelHref="/dashboard/courses"
      />
    </div>
  );
}
