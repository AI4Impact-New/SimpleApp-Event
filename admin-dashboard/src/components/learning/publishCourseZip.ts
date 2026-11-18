import axios from 'axios';
import api from '@/services/api';
import { videoDuration } from '@/services/learning';
import type { CourseDraft, DraftMaterial, ZipEntry } from './courseZip';

type Upload = { id: string; url: string; fields: Record<string, string> };
type FileData = { id: string; name: string; size: number; duration_seconds?: number };
type Extract = (entry: ZipEntry) => Promise<Blob>;

export async function prepareCourseImport(draft: CourseDraft, extract: Extract) {
  const files = new Map<string, DraftMaterial>();
  const metadata = (item: DraftMaterial): FileData => {
    if (files.size >= 40) throw new Error('Import up to 40 files at a time.');
    if (!item.size || item.size > (item.kind === 'video' ? 2147483648 : 104857600))
      throw new Error(`File size is outside the allowed range for ${item.name}.`);
    const id = crypto.randomUUID();
    files.set(id, item);
    return { id, name: item.name, size: item.size };
  };
  const modules = [];
  for (const module of draft.modules) {
    const resources = module.materials.map(metadata);
    const lectures = [];
    for (const lecture of module.lectures) {
      let video: FileData | null = null;
      if (lecture.video) {
        if (!/\.mp4$/i.test(lecture.video.name)) throw new Error(`Convert ${lecture.video.name} to MP4 before publishing.`);
        video = metadata(lecture.video);
        const blob = await extract(lecture.video.entry);
        video.duration_seconds = await videoDuration(new File([blob], video.name, { type: 'video/mp4' }));
      }
      lectures.push({ title: lecture.title, resources: lecture.materials.map(metadata), video });
    }
    modules.push({ title: module.title, resources, lectures });
  }
  return { id: crypto.randomUUID(), manifest: { modules }, files, uploaded: new Set<string>() };
}

export async function publishCourseImport(
  courseId: string,
  prepared: Awaited<ReturnType<typeof prepareCourseImport>>,
  extract: Extract,
  onProgress: (text: string) => void,
) {
  const path = `/admin/courses/${courseId}/content-imports/${prepared.id}`;
  const staged = await api.learningRequest<{ status: string; uploads: Upload[] }>('PUT', path, prepared.manifest);
  if (staged.status === 'published') return;
  for (const upload of staged.uploads) {
    if (prepared.uploaded.has(upload.id)) continue;
    const item = prepared.files.get(upload.id);
    if (!item) throw new Error('The upload does not match the reviewed ZIP.');
    onProgress(`Uploading ${prepared.uploaded.size + 1} of ${prepared.files.size}: ${item.name}`);
    try {
      const file = await extract(item.entry);
      const form = new FormData();
      Object.entries(upload.fields).forEach(([key, value]) => form.append(key, value));
      form.append('file', file, item.name);
      await axios.post(upload.url, form);
      prepared.uploaded.add(upload.id);
    } catch {
      throw new Error(`Could not upload ${item.name}. Select Publish content to retry.`);
    }
  }
  onProgress('Verifying and publishing…');
  try {
    await api.learningRequest('POST', path, {});
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) prepared.uploaded.clear();
    throw error;
  }
}
