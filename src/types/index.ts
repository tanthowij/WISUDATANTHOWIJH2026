/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'client';

export type WorkflowStatus =
  | 'WAITING_FOR_SELECTION'
  | 'SELECTION_SUBMITTED'
  | 'WAITING_FOR_EDITING'
  | 'EDITING_IN_PROGRESS'
  | 'WAITING_FOR_CLIENT_REVIEW'
  | 'REVISION_REQUESTED'
  | 'REVISION_IN_PROGRESS'
  | 'APPROVED'
  | 'FINAL_READY'
  | 'COMPLETED';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  email?: string;
  clientId?: string;
  passwordHash?: string;
}

export type FeedbackStatus = 'APPROVED' | 'REQUEST_REVISION' | 'NEED_REVIEW' | 'COMMENT';

export interface PhotoComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  statusType: FeedbackStatus;
  createdAt: string;
}

export interface Photo {
  id: string;
  clientId: string;
  sequenceNumber: number;
  originalName: string;
  url: string;
  thumbnailUrl: string;
  stage: 'RAW' | 'SELECTED' | 'EDIT_PROCESS' | 'REVISION' | 'FINAL';
  selected?: boolean;
  uploadedAt: string;
  driveFileId?: string;
  
  // Editing & Comparison
  editedUrl?: string;
  revisionVersion?: number;
  approvalStatus?: FeedbackStatus;
  feedback?: PhotoComment[];
  notes?: string;
}

export interface DriveFolderStructure {
  rootFolderId?: string;
  clientFolderId?: string;
  rawPhotosFolderId?: string;
  selectedPhotosFolderId?: string;
  editProcessFolderId?: string;
  revisionFolderId?: string;
  finalPhotosFolderId?: string;
  collageFolderId?: string;
  downloadFolderId?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
}

export type CollageTemplateId =
  | 'template-1' // 1 Hero Photo
  | 'template-2' // 2 Photos Vertical Split
  | 'template-3' // 3 Photos Editorial
  | 'template-4' // 4 Photos 2x2 Grid
  | 'template-5' // 6 Photos Editorial Magazine
  | 'template-6'; // Freeform / Scrapbook

export interface StoryCollagePage {
  id: string;
  title: string;
  templateId: CollageTemplateId;
  photoUrls: (string | null)[];
  backgroundColor: string;
  textColor: string;
  padding: number;
  gap: number;
  borderRadius: number;
  fontFamily: 'serif' | 'sans' | 'signature';
  titleText: string;
  subtitleText: string;
  clientNameText: string;
  dateText: string;
  showLogo: boolean;
  showOrnaments: boolean;
  ornamentType: 'laurel' | 'minimal' | 'stars' | 'frame';
}

export interface ClientProject {
  id: string;
  code: string; // e.g. CLIENT_001_ANNISA
  name: string;
  username: string;
  passwordHash: string;
  phone: string;
  email: string;
  eventDate: string;
  university: string;
  faculty: string;
  packageType: string;
  quotaMaxSelected: number; // default 25
  currentStatus: WorkflowStatus;
  selectionSubmittedAt?: string;
  clientNotes?: string;
  googleDriveUrl?: string;
  googleDriveFolders: DriveFolderStructure;
  activityLog: ActivityLogEntry[];
  photos: Photo[];
  collagePages?: StoryCollagePage[];
}
