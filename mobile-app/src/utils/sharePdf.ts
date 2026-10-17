// Download a PDF into the cache and open the native share sheet
// (on web: download it through the browser instead)
import { Alert, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

async function downloadPdfOnWeb(options: { url: string; fileName: string; headers?: Record<string, string> }) {
  const res = await fetch(options.url, { headers: options.headers });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blobUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = options.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}

export async function downloadAndSharePdf(options: {
  url: string;
  fileName: string;
  dialogTitle: string;
  headers?: Record<string, string>;
}) {
  if (Platform.OS === 'web') {
    await downloadPdfOnWeb(options);
    return;
  }
  const target = new File(Paths.cache, options.fileName);
  if (target.exists) target.delete();
  const file = await File.downloadFileAsync(options.url, target, { headers: options.headers });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: options.dialogTitle,
    });
  } else {
    Alert.alert('Downloaded', 'Sharing is not available on this device.');
  }
}
