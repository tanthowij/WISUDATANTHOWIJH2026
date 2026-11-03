/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClientProject } from '../types';

export type WhatsAppMessageType =
  | 'GALLERY_READY'
  | 'SELECTION_RECEIVED'
  | 'EDITING_READY'
  | 'REVISION_COMPLETED'
  | 'FINAL_DOWNLOAD_READY';

export interface WhatsAppTemplate {
  id: WhatsAppMessageType;
  label: string;
  description: string;
  generateText: (client: ClientProject, appUrl: string) => string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'GALLERY_READY',
    label: 'Galeri Foto Tersedia',
    description: 'Pemberitahuan kepada klien bahwa 250 foto original sudah diunggah dan siap dipilih.',
    generateText: (client, appUrl) =>
      `Halo Kak *${client.name}*! 🎓✨\n\n` +
      `Kabar gembira! Foto wisuda Kakak dari acara di *${client.university}* sudah selesai diunggah ke sistem *WISUDA BY TANTHOWI*.\n\n` +
      `📸 *Total Foto Tersedia:* ${client.photos.length} foto original\n` +
      `🎯 *Maksimal Pilihan Edit:* ${client.quotaMaxSelected} foto terbaik\n\n` +
      `Silakan login untuk memilih foto:\n` +
      `🔗 *Link:* ${appUrl}\n` +
      `👤 *Username:* ${client.username}\n` +
      `🔑 *Password:* Wisudabytanthowijh\n\n` +
      `Setelah memilih maksimal ${client.quotaMaxSelected} foto, jangan lupa klik tombol *SUBMIT SELECTION* ya Kak. Terima kasih! 🙏`,
  },
  {
    id: 'SELECTION_RECEIVED',
    label: 'Pilihan Foto Diterima',
    description: 'Konfirmasi bahwa admin telah menerima daftar foto pilihan klien dan proses editing dimulai.',
    generateText: (client) => {
      const selectedCount = client.photos.filter(p => p.selected).length;
      return (
        `Halo Kak *${client.name}*! 🎓\n\n` +
        `Kami ingin mengonfirmasi bahwa pilihan *${selectedCount} foto wisuda* Kakak telah berhasil kami terima di sistem *WISUDA BY TANTHOWI*.\n\n` +
        `Sekarang tim editing kami sedang memproses retouching warna, pencahayaan, dan detail foto Kakak.\n` +
        `Kami akan memberi kabar segera setelah hasil editing v1 selesai untuk direview.\n\n` +
        `Salam hangat,\n*Wisuda by Tanthowi Photography*`
      );
    },
  },
  {
    id: 'EDITING_READY',
    label: 'Hasil Editing Siap Direview',
    description: 'Notifikasi bahwa hasil editing v1 sudah diunggah dan siap diperiksa klien.',
    generateText: (client, appUrl) =>
      `Halo Kak *${client.name}*! 🎨✨\n\n` +
      `Hasil editing foto wisuda Kakak sudah siap direview di website *WISUDA BY TANTHOWI*!\n\n` +
      `Kakak dapat melihat perbandingan *BEFORE & AFTER*, menyetujui foto (Approved), atau memberikan catatan revisi jika ada yang perlu disesuaikan.\n\n` +
      `🔗 *Review di sini:* ${appUrl}\n\n` +
      `Silakan cek dan berikan feedback Kakak ya. Terima kasih! 🎓`,
  },
  {
    id: 'REVISION_COMPLETED',
    label: 'Revisi Selesai Diperbarui',
    description: 'Notifikasi bahwa revisi sesuai catatan klien telah selesai dikerjakan.',
    generateText: (client, appUrl) =>
      `Halo Kak *${client.name}*! 🛠️\n\n` +
      `Revisi foto wisuda sesuai catatan Kakak telah selesai diperbarui oleh tim editor *WISUDA BY TANTHOWI*.\n\n` +
      `Silakan cek hasil revisi terbaru pada menu *Review Editing*:\n` +
      `🔗 *Link:* ${appUrl}\n\n` +
      `Jika sudah sesuai, Kakak bisa langsung klik *APPROVED* ya. Terima kasih!`,
  },
  {
    id: 'FINAL_DOWNLOAD_READY',
    label: 'Link Download Foto Final',
    description: 'Mengirimkan tautan pengunduhan seluruh foto final resolusi tinggi (ZIP).',
    generateText: (client, appUrl) =>
      `Selamat Kak *${client.name}*! 🎓🎉💐\n\n` +
      `Seluruh foto wisuda final berkualitas resolusi tinggi (High-Res Original) dan Desain Kolase Instagram Story Kakak sudah siap diunduh!\n\n` +
      `🔗 *Tautan Download:* ${appUrl}\n\n` +
      `Di website Kakak dapat mengunduh:\n` +
      `1. Seluruh foto dalam format *ZIP (Download All)*\n` +
      `2. Desain Kolase Instagram Story 9:16 (1080x1920) untuk diposting di media sosial\n\n` +
      `Terima kasih banyak telah mempercayakan momen wisuda bersejarah Kakak bersama *WISUDA BY TANTHOWI*! Semoga sukses selalu dalam karir dan cita-cita! 🌟`,
  },
];

/**
 * Format phone number to international WhatsApp format (e.g. 08123... -> 628123...)
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 5) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Generate a WhatsApp Click to Chat URL with pre-filled message
 */
export function getWhatsAppClickToChatUrl(
  phone: string,
  message: string
): string {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

/**
 * Open WhatsApp with prefilled message
 */
export function openWhatsAppChat(phone: string, message: string): void {
  const url = getWhatsAppClickToChatUrl(phone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
}
