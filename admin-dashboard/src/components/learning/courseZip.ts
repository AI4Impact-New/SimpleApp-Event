// Turns a dropped course ZIP into an editable outline: modules → lectures → materials.
// Only the ZIP's central directory is read here, so multi-GB archives open instantly;
// file contents are extracted on demand (e.g. for a video preview).

export type MaterialKind = 'pdf' | 'slides' | 'doc' | 'sheet' | 'code' | 'image' | 'archive' | 'video' | 'other';

export interface ZipEntry {
  filename: string;
  directory: boolean;
  uncompressedSize: number;
  getData?: (writer: unknown) => Promise<Blob>;
}
export interface DraftMaterial { id: string; name: string; kind: MaterialKind; size: number; entry: ZipEntry }
export interface DraftLecture { id: string; title: string; video?: DraftMaterial; materials: DraftMaterial[] }
export interface DraftModule { id: string; title: string; lectures: DraftLecture[]; materials: DraftMaterial[] }
export interface CourseDraft { fileName: string; modules: DraftModule[]; ignored: string[] }

const VIDEO = /\.(mp4|m4v|mov|webm|mkv)$/i;
const KINDS: [RegExp, MaterialKind][] = [
  [/\.pdf$/i, 'pdf'], [/\.(pptx?|key|odp)$/i, 'slides'], [/\.(docx?|txt|md|rtf|odt)$/i, 'doc'],
  [/\.(xlsx?|csv|ods)$/i, 'sheet'], [/\.(py|ipynb|sql|js|ts|json|ya?ml|sh|scala|r)$/i, 'code'],
  [/\.(png|jpe?g|gif|svg|webp)$/i, 'image'], [/\.(zip|tar|gz|7z|rar)$/i, 'archive'], [VIDEO, 'video'],
];
const JUNK = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)|(^|\/)\.[^/]+$/;

let seq = 0;
const uid = () => `d${++seq}`;
const base = (name: string) => name.split('/').pop() || name;
const stem = (name: string) => base(name).replace(/\.[^.]+$/, '');
const order = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
/** Leading number used for ordering/matching: "01 - Intro.mp4" → "1". */
const prefix = (name: string) => stem(name).match(/^\s*(\d+)/)?.[1]?.replace(/^0+(?=\d)/, '');

export const kindOf = (name: string): MaterialKind => KINDS.find(([re]) => re.test(name))?.[1] ?? 'other';
/** "02_sql-basics" → "Sql basics"; "01 - Data Engineering Intro" → "Data Engineering Intro". */
export function cleanTitle(name: string): string {
  const text = stem(name).replace(/^\s*\d+\s*[-_.):]*\s*/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const value = text || stem(name);
  return value.charAt(0).toUpperCase() + value.slice(1);
}
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

const material = (entry: ZipEntry): DraftMaterial => ({ id: uid(), name: base(entry.filename), kind: kindOf(entry.filename), size: entry.uncompressedSize, entry });

/**
 * Supported layouts (any mix):
 *   Module folder/01 Intro.mp4 + Module folder/01 Intro notes.pdf   → notes attach to the lecture with the same number
 *   Module folder/01 Intro/<video + materials>                       → a folder per lecture
 *   Module folder/syllabus.pdf                                       → module-level material
 *   Loose files at the top level go into a "General" module.
 */
export function buildDraft(fileName: string, rawEntries: ZipEntry[]): CourseDraft {
  const ignored: string[] = [];
  const files = rawEntries.filter(entry => {
    if (entry.directory) return false;
    if (JUNK.test(entry.filename)) { ignored.push(entry.filename); return false; }
    return true;
  });

  // Strip one shared wrapper folder ("Azure Course/…"), which is what Finder/Explorer produce.
  const firstParts = new Set(files.map(entry => entry.filename.split('/')[0]));
  const wrapped = files.length > 0 && firstParts.size === 1 && files.every(entry => entry.filename.includes('/'));
  const rel = (entry: ZipEntry) => wrapped ? entry.filename.split('/').slice(1).join('/') : entry.filename;

  const groups = new Map<string, ZipEntry[]>();
  for (const entry of files) {
    const parts = rel(entry).split('/');
    const key = parts.length > 1 ? parts[0] : '';
    groups.set(key, [...(groups.get(key) || []), entry]);
  }

  const modules: DraftModule[] = [...groups.keys()].sort((a, b) => a === '' ? 1 : b === '' ? -1 : order(a, b)).map(key => {
    const entries = groups.get(key)!;
    const items: { key: string; lecture: DraftLecture }[] = [];
    const loose: ZipEntry[] = [];
    const lectureFolders = new Map<string, ZipEntry[]>();

    for (const entry of entries) {
      const inner = rel(entry).split('/').slice(key ? 1 : 0);
      if (inner.length > 1) lectureFolders.set(inner[0], [...(lectureFolders.get(inner[0]) || []), entry]);
      else loose.push(entry);
    }

    // Loose videos become lectures; loose files with a matching number prefix attach to them.
    for (const entry of loose.filter(e => VIDEO.test(e.filename))) {
      items.push({ key: base(entry.filename), lecture: { id: uid(), title: cleanTitle(entry.filename), video: material(entry), materials: [] } });
    }
    const moduleMaterials: DraftMaterial[] = [];
    for (const entry of loose.filter(e => !VIDEO.test(e.filename))) {
      const number = prefix(entry.filename);
      const owner = number ? items.find(item => prefix(item.key) === number)?.lecture : undefined;
      (owner ? owner.materials : moduleMaterials).push(material(entry));
    }

    // A sub-folder is one lecture: its first video is the recording, everything else is material.
    for (const [folder, folderEntries] of lectureFolders) {
      const sorted = [...folderEntries].sort((a, b) => order(a.filename, b.filename));
      const video = sorted.find(entry => VIDEO.test(entry.filename));
      items.push({ key: folder, lecture: {
        id: uid(),
        title: cleanTitle(folder),
        video: video && material(video),
        materials: sorted.filter(entry => entry !== video).map(material),
      } });
    }

    const lectures = items.sort((a, b) => order(a.key, b.key)).map(item => item.lecture);
    lectures.forEach(lecture => lecture.materials.sort((a, b) => order(a.name, b.name)));
    moduleMaterials.sort((a, b) => order(a.name, b.name));

    return { id: uid(), title: key ? cleanTitle(key) : 'General', lectures, materials: moduleMaterials };
  });

  return { fileName, modules: modules.filter(m => m.lectures.length || m.materials.length), ignored };
}

export async function readCourseZip(file: File) {
  const zip = await import('@zip.js/zip.js');
  zip.configure({ useWebWorkers: false });
  const reader = new zip.ZipReader(new zip.BlobReader(file));
  const entries = (await reader.getEntries()) as unknown as ZipEntry[];
  return { draft: buildDraft(file.name, entries), close: () => reader.close(), extract: async (entry: ZipEntry) => {
    if (!entry.getData) throw new Error('This file cannot be read from the ZIP.');
    return entry.getData(new zip.BlobWriter());
  } };
}
