// Download a PDF into the cache and open the native share sheet
import { Alert, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function downloadAndSharePdf(options: {
  url: string;
  fileName: string;
  dialogTitle: string;
  headers?: Record<string, string>;
}) {
  if (Platform.OS === 'web') {
    const response = await fetch(options.url, { headers: options.headers });
    if (!response.ok) throw new Error('PDF download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

/** Write text (e.g. an .ics calendar) to the cache and open the share sheet so calendar apps can import it. */
export async function shareTextFile(options: {
  text: string;
  fileName: string;
  mimeType: string;
  UTI?: string;
  dialogTitle: string;
}) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([options.text], { type: options.mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = options.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const target = new File(Paths.cache, options.fileName);
  if (target.exists) target.delete();
  target.create();
  target.write(options.text);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(target.uri, { mimeType: options.mimeType, UTI: options.UTI, dialogTitle: options.dialogTitle });
  } else {
    Alert.alert('Saved', 'Sharing is not available on this device.');
  }
}
