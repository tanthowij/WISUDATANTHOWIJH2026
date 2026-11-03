/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClientProject, Photo, StoryCollagePage } from '../types';

// Curated high quality graduation photo samples from Unsplash
const GRADUATION_IMAGE_BASE = [
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1000&q=80',
];

// Curated edited versions for before/after comparison
const EDITED_IMAGE_BASE = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=90&sat=120&con=110',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=90&sat=115',
  'https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?auto=format&fit=crop&w=1200&q=90&con=115',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=90&sat=120',
];

export function generateClientPhotos(
  clientId: string,
  clientPrefix: string,
  totalCount = 250,
  preSelectedIndices: number[] = [2, 5, 8, 12, 17, 21, 28, 34, 45, 52, 60, 71, 88, 94, 105, 120, 138, 150] // exactly 18 selected initially
): Photo[] {
  const photos: Photo[] = [];

  for (let i = 1; i <= totalCount; i++) {
    const padNum = String(i).padStart(4, '0');
    const isSelected = preSelectedIndices.includes(i);
    const imageIndex = (i - 1) % GRADUATION_IMAGE_BASE.length;
    const baseImg = GRADUATION_IMAGE_BASE[imageIndex];
    // Add subtle unique query params for distinct visual feel
    const imgUrl = `${baseImg}&auto=format&fit=crop&w=1200&q=85&sig=${i}`;
    const thumbUrl = `${baseImg}&auto=format&fit=crop&w=400&q=70&sig=${i}`;

    // Some selected photos already have edit process data for rich demonstration
    const hasEdit = isSelected && i <= 35;
    const editedUrl = hasEdit ? EDITED_IMAGE_BASE[i % EDITED_IMAGE_BASE.length] : undefined;

    photos.push({
      id: `photo_${clientId}_${i}`,
      clientId,
      sequenceNumber: i,
      originalName: `DSC_${padNum}_${clientPrefix}.JPG`,
      url: imgUrl,
      thumbnailUrl: thumbUrl,
      stage: hasEdit ? 'EDIT_PROCESS' : isSelected ? 'SELECTED' : 'RAW',
      selected: isSelected,
      uploadedAt: '2026-10-28T09:30:00Z',
      driveFileId: `drive_file_${clientId}_${padNum}`,
      editedUrl,
      revisionVersion: hasEdit ? 1 : undefined,
      approvalStatus: hasEdit
        ? i === 2
          ? 'APPROVED'
          : i === 5
          ? 'REQUEST_REVISION'
          : 'NEED_REVIEW'
        : undefined,
      feedback: hasEdit
        ? i === 5
          ? [
              {
                id: 'fb_1',
                authorName: 'Annisa Rahmawati',
                authorRole: 'client',
                content: 'Tolong cerahkan wajah sedikit dan kurangi tone kuning di bagian toga.',
                statusType: 'REQUEST_REVISION',
                createdAt: '2026-10-30T14:20:00Z',
              },
              {
                id: 'fb_2',
                authorName: 'Admin Wisuda by Tanthowi',
                authorRole: 'admin',
                content: 'Baik kak Annisa, sudah kami sesuaikan tone skin dan saturasi toga di revisi v1.',
                statusType: 'COMMENT',
                createdAt: '2026-10-31T10:15:00Z',
              },
            ]
          : i === 2
          ? [
              {
                id: 'fb_3',
                authorName: 'Annisa Rahmawati',
                authorRole: 'client',
                content: 'Tone warnanya pas banget, suka pencahayaannya. Approved!',
                statusType: 'APPROVED',
                createdAt: '2026-10-30T11:00:00Z',
              },
            ]
          : []
        : [],
    });
  }

  return photos;
}

export const INITIAL_COLLAGE_PAGES: StoryCollagePage[] = [
  {
    id: 'page-1',
    title: 'Cover Story (Solo Hero)',
    templateId: 'template-1',
    photoUrls: [
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80',
    ],
    backgroundColor: '#0a0a0c',
    textColor: '#f9fafb',
    padding: 32,
    gap: 16,
    borderRadius: 8,
    fontFamily: 'serif',
    titleText: 'GRADUATION DAY',
    subtitleText: 'FAKULTAS KEDOKTERAN UNIVERSITAS INDONESIA',
    clientNameText: 'ANNISA RAHMAWATI, S.KED',
    dateText: '2026 • WISUDA BY TANTHOWI',
    showLogo: true,
    showOrnaments: true,
    ornamentType: 'laurel',
  },
  {
    id: 'page-2',
    title: 'Trio Editorial',
    templateId: 'template-3',
    photoUrls: [
      'https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
    ],
    backgroundColor: '#131418',
    textColor: '#ffffff',
    padding: 28,
    gap: 14,
    borderRadius: 6,
    fontFamily: 'signature',
    titleText: 'Memories of Graduation',
    subtitleText: 'A Journey Well Finished',
    clientNameText: 'Annisa Rahmawati',
    dateText: 'CLASS OF 2026',
    showLogo: true,
    showOrnaments: false,
    ornamentType: 'minimal',
  },
];

export const INITIAL_CLIENTS: ClientProject[] = [
  {
    id: 'client_001',
    code: 'CLIENT_001_ANNISA',
    name: 'Annisa Rahmawati, S.Ked',
    username: 'klien_annisa',
    passwordHash: 'default_hash', // Accepts Wisudabytanthowijh
    phone: '6281234567890',
    email: 'annisa.kedokteran@ui.ac.id',
    eventDate: '2026-10-26',
    university: 'Universitas Indonesia',
    faculty: 'Fakultas Kedokteran',
    packageType: 'Paket Signature Wisuda (25 Foto Edit + All RAW + Kolase IG)',
    quotaMaxSelected: 25,
    currentStatus: 'WAITING_FOR_CLIENT_REVIEW',
    selectionSubmittedAt: '2026-10-29T15:30:00Z',
    clientNotes: 'Fokuskan editing pada pencahayaan indoor balairung UI dan detail toga hijau kuning.',
    googleDriveUrl: 'https://drive.google.com/drive/u/0/my-drive',
    googleDriveFolders: {
      rootFolderId: 'root_wisuda_by_tanthowi',
      clientFolderId: 'folder_client_001_annisa',
      rawPhotosFolderId: 'folder_01_raw_annisa',
      selectedPhotosFolderId: 'folder_02_selected_annisa',
      editProcessFolderId: 'folder_03_edit_annisa',
      revisionFolderId: 'folder_04_revision_annisa',
      finalPhotosFolderId: 'folder_05_final_annisa',
      collageFolderId: 'folder_06_collage_annisa',
      downloadFolderId: 'folder_07_download_annisa',
    },
    activityLog: [
      {
        id: 'act_1',
        timestamp: '2026-10-28T09:30:00Z',
        actor: 'Admin',
        action: 'Akun dibuat & 250 Foto RAW diunggah ke Google Drive',
      },
      {
        id: 'act_2',
        timestamp: '2026-10-29T15:30:00Z',
        actor: 'Annisa Rahmawati',
        action: 'Klien mengirimkan pilihan 18 foto untuk proses editing',
      },
      {
        id: 'act_3',
        timestamp: '2026-10-30T10:00:00Z',
        actor: 'Admin',
        action: 'Admin mengunggah hasil editing v1 ke folder 03_EDIT_PROCESS',
      },
    ],
    photos: generateClientPhotos('client_001', 'WISUDA_UI_ANNISA', 250),
    collagePages: INITIAL_COLLAGE_PAGES,
  },
  {
    id: 'client_002',
    code: 'CLIENT_002_DIMAS',
    name: 'Dimas Pratama, S.T.',
    username: 'klien_dimas',
    passwordHash: 'default_hash', // Accepts Wisudabytanthowijh
    phone: '6281987654321',
    email: 'dimas.itb@alumni.itb.ac.id',
    eventDate: '2026-10-27',
    university: 'Institut Teknologi Bandung',
    faculty: 'Teknik Sipil & Lingkungan',
    packageType: 'Paket Platinum Graduation (25 Foto Edit + Cetak + Kolase)',
    quotaMaxSelected: 25,
    currentStatus: 'WAITING_FOR_SELECTION',
    googleDriveUrl: 'https://drive.google.com/drive/u/0/my-drive',
    googleDriveFolders: {
      rootFolderId: 'root_wisuda_by_tanthowi',
      clientFolderId: 'folder_client_002_dimas',
      rawPhotosFolderId: 'folder_01_raw_dimas',
      selectedPhotosFolderId: 'folder_02_selected_dimas',
      editProcessFolderId: 'folder_03_edit_dimas',
      revisionFolderId: 'folder_04_revision_dimas',
      finalPhotosFolderId: 'folder_05_final_dimas',
      collageFolderId: 'folder_06_collage_dimas',
      downloadFolderId: 'folder_07_download_dimas',
    },
    activityLog: [
      {
        id: 'act_d1',
        timestamp: '2026-10-29T11:00:00Z',
        actor: 'Admin',
        action: 'Akun dibuat & 250 Foto RAW diunggah',
      },
      {
        id: 'act_d2',
        timestamp: '2026-10-29T11:15:00Z',
        actor: 'Admin',
        action: 'Notifikasi WhatsApp link galeri dikirim ke klien',
      },
    ],
    photos: generateClientPhotos('client_002', 'WISUDA_ITB_DIMAS', 250, [1, 4, 9]),
    collagePages: INITIAL_COLLAGE_PAGES,
  },
];
