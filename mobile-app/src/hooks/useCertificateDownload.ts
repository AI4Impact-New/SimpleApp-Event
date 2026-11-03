// Download an issued certificate's PDF (fresh five-minute signed URL) and hand it to the share sheet / browser.
import { useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { apiErrorMessage } from '@/services/apiErrors';
import type { MyCertificate } from '@/types/learning';
import { downloadAndSharePdf } from '@/utils/sharePdf';

export function useCertificateDownload() {
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = async (cert: MyCertificate) => {
    setDownloadingId(cert.id);
    try {
      // Five-minute signed URL; fetch it right before downloading
      const { url } = await api.getCertificateDownload(cert.id);
      await downloadAndSharePdf({
        url,
        fileName: `certificate-${cert.id}.pdf`,
        dialogTitle: cert.course_title ?? 'Certificate',
      });
    } catch (err: any) {
      if (err?.response?.status === 410) {
        Alert.alert('Certificate revoked', 'This certificate has been revoked and can no longer be downloaded.');
        queryClient.invalidateQueries({ queryKey: ['me', 'certificates'] });
      } else {
        Alert.alert('Download failed', apiErrorMessage(err, 'Could not download the certificate.'));
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return { download, downloadingId };
}
