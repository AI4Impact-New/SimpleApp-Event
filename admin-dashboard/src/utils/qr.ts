// QR Code utility
import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

export function getEventJoinUrl(eventId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/join/${eventId}`;
}

export function getEventQRUrl(eventId: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com';
  return `${apiUrl}/events/${eventId}`;
}
