// Download a PDF into the cache and open the native share sheet
import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function downloadAndSharePdf(options: {
  url: string;
  fileName: string;
  dialogTitle: string;
  headers?: Record<string, string>;
}) {
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
