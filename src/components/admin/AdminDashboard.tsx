/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  ExternalLink,
  MessageCircle,
  FolderTree,
  HardDrive,
  Trash2,
  Edit3,
  Upload,
  ArrowRight,
  Eye,
  Check,
  Send,
  X,
  Sparkles,
} from 'lucide-react';
import { ClientProject, Photo, WorkflowStatus } from '../../types';
import { AppStorage } from '../../lib/storage';
import { exportSelectionToExcel, exportSelectionToTextList } from '../../lib/export';
import { GoogleDriveService } from '../../lib/drive';
import {
  WHATSAPP_TEMPLATES,
  WhatsAppMessageType,
  openWhatsAppChat,
} from '../../lib/whatsapp';
import { BeforeAfterSlider } from '../common/BeforeAfterSlider';
import { StoryCollageStudio } from '../collage/StoryCollageStudio';

interface AdminDashboardProps {
  clients: ClientProject[];
  onRefresh: () => void;
  onSelectClientAsView?: (clientId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clients,
  onRefresh,
  onSelectClientAsView,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [clientDetailTab, setClientDetailTab] = useState<'overview' | 'selection' | 'editing' | 'collage' | 'drive'>('overview');
  const [searchClient, setSearchClient] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppClient, setWhatsAppClient] = useState<ClientProject | null>(null);
  const [selectedWaTemplate, setSelectedWaTemplate] = useState<WhatsAppMessageType>('GALLERY_READY');

  // New Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientUsername, setNewClientUsername] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('08');
  const [newClientUniversity, setNewClientUniversity] = useState('Universitas Indonesia');
  const [newClientFaculty, setNewClientFaculty] = useState('Fakultas Ekonomi & Bisnis');
  const [newClientPackage, setNewClientPackage] = useState('Paket Signature Wisuda (25 Foto Edit + All RAW + Kolase IG)');
  const [newClientQuota, setNewClientQuota] = useState(25);
  const [newClientDriveUrl, setNewClientDriveUrl] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Google Drive Per-Client Link Management States
  const [driveFolderInput, setDriveFolderInput] = useState('');
  const [rawFolderInput, setRawFolderInput] = useState('');
  const [selectedFolderInput, setSelectedFolderInput] = useState('');
  const [editFolderInput, setEditFolderInput] = useState('');
  const [finalFolderInput, setFinalFolderInput] = useState('');
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncPhotoCount, setSyncPhotoCount] = useState<number>(250);
  const [showBatchLinksModal, setShowBatchLinksModal] = useState(false);
  const [batchLinksText, setBatchLinksText] = useState('');

  // Upload Simulation / Real
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Active selected client object
  const activeClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || clients[0];
  }, [clients, selectedClientId]);

  // Sync inputs when active client changes
  React.useEffect(() => {
    if (activeClient) {
      setDriveFolderInput(activeClient.googleDriveUrl || '');
      setRawFolderInput(activeClient.googleDriveFolders?.rawPhotosFolderUrl || '');
      setSelectedFolderInput(activeClient.googleDriveFolders?.selectedPhotosFolderUrl || '');
      setEditFolderInput(activeClient.googleDriveFolders?.editProcessFolderUrl || '');
      setFinalFolderInput(activeClient.googleDriveFolders?.finalPhotosFolderUrl || '');
    }
  }, [activeClient]);

  // High level metrics
  const metrics = useMemo(() => {
    const totalClients = clients.length;
    let totalPhotos = 0;
    let waitingSelection = 0;
    let selectionSubmitted = 0;
    let inEditing = 0;
    let revisionWaiting = 0;
    let completed = 0;

    clients.forEach(c => {
      totalPhotos += c.photos.length;
      if (c.currentStatus === 'WAITING_FOR_SELECTION') waitingSelection++;
      else if (c.currentStatus === 'SELECTION_SUBMITTED') selectionSubmitted++;
      else if (c.currentStatus === 'EDITING_IN_PROGRESS' || c.currentStatus === 'WAITING_FOR_EDITING') inEditing++;
      else if (c.currentStatus === 'REVISION_REQUESTED' || c.currentStatus === 'REVISION_IN_PROGRESS') revisionWaiting++;
      else if (c.currentStatus === 'FINAL_READY' || c.currentStatus === 'COMPLETED' || c.currentStatus === 'APPROVED') completed++;
    });

    return {
      totalClients,
      totalPhotos,
      waitingSelection,
      selectionSubmitted,
      inEditing,
      revisionWaiting,
      completed,
    };
  }, [clients]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchClient.toLowerCase()) ||
        c.code.toLowerCase().includes(searchClient.toLowerCase()) ||
        c.university.toLowerCase().includes(searchClient.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.currentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, searchClient, statusFilter]);

  // Handle Create Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientUsername) return;

    setIsCreatingClient(true);
    try {
      const codeNum = String(clients.length + 1).padStart(3, '0');
      const cleanName = newClientName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
      const clientCode = `CLIENT_${codeNum}_${cleanName}`;

      // Create Google Drive standardized folder structure
      const driveFolders = await GoogleDriveService.createClientFolderHierarchy(clientCode);

      // If admin pasted a custom Google Drive link for this client
      const finalDriveUrl = newClientDriveUrl.trim() || driveFolders.clientFolderUrl;

      const newProject: ClientProject = {
        id: `client_${Date.now()}`,
        code: clientCode,
        name: newClientName,
        username: newClientUsername.toLowerCase().trim(),
        passwordHash: 'default_hash', // Default Wisudabytanthowijh
        phone: newClientPhone,
        email: `${newClientUsername.toLowerCase().trim()}@wisudatanthowi.com`,
        eventDate: new Date().toISOString().split('T')[0],
        university: newClientUniversity,
        faculty: newClientFaculty,
        packageType: newClientPackage,
        quotaMaxSelected: newClientQuota,
        currentStatus: 'WAITING_FOR_SELECTION',
        googleDriveUrl: finalDriveUrl,
        googleDriveFolders: {
          ...driveFolders,
          clientFolderUrl: finalDriveUrl,
        },
        activityLog: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: 'Admin Studio',
            action: `Akun klien ${newClientName} dibuat. Folder Google Drive terhubung: ${finalDriveUrl}`,
          },
        ],
        photos: [], // Start clean or let admin upload / sync
      };

      // If link was provided, auto-sync photos right away
      if (newClientDriveUrl.trim()) {
        try {
          const syncRes = await GoogleDriveService.fetchPhotosFromDriveFolder(
            newClientDriveUrl.trim(),
            newProject.id,
            cleanName,
            250
          );
          newProject.photos = syncRes.photos;
        } catch (e) {
          console.warn('Auto sync on create skipped', e);
        }
      }

      AppStorage.addClient(newProject);
      setShowCreateClientModal(false);
      setSelectedClientId(newProject.id);
      onRefresh();

      // Reset form
      setNewClientName('');
      setNewClientUsername('');
      setNewClientDriveUrl('');
      setUploadNotice(`Klien ${newClientName} berhasil dibuat dengan folder Google Drive.`);
      setTimeout(() => setUploadNotice(null), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Save custom Google Drive folder links for active client
  const handleSaveDriveUrls = () => {
    if (!activeClient) return;
    const cleanMain = driveFolderInput.trim();
    const folderId = GoogleDriveService.extractDriveFolderId(cleanMain);

    activeClient.googleDriveUrl = cleanMain || activeClient.googleDriveUrl;
    activeClient.googleDriveFolders = {
      ...activeClient.googleDriveFolders,
      clientFolderUrl: cleanMain || activeClient.googleDriveFolders?.clientFolderUrl,
      rawPhotosFolderUrl: rawFolderInput.trim() || activeClient.googleDriveFolders?.rawPhotosFolderUrl,
      selectedPhotosFolderUrl: selectedFolderInput.trim() || activeClient.googleDriveFolders?.selectedPhotosFolderUrl,
      editProcessFolderUrl: editFolderInput.trim() || activeClient.googleDriveFolders?.editProcessFolderUrl,
      finalPhotosFolderUrl: finalFolderInput.trim() || activeClient.googleDriveFolders?.finalPhotosFolderUrl,
      clientFolderId: folderId || activeClient.googleDriveFolders?.clientFolderId,
    };

    activeClient.activityLog.unshift({
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin Studio',
      action: 'Link folder Google Drive klien diperbarui',
      detail: cleanMain,
    });

    AppStorage.updateClient(activeClient);
    setUploadNotice('Link Google Drive klien berhasil disimpan!');
    setTimeout(() => setUploadNotice(null), 3000);
    onRefresh();
  };

  // Sync / Import Photos directly from Google Drive Folder Link
  const handleSyncPhotosFromDrive = async () => {
    if (!activeClient) return;
    const targetFolderLink = rawFolderInput.trim() || driveFolderInput.trim() || activeClient.googleDriveUrl;
    if (!targetFolderLink) {
      alert('Silakan masukkan Link Folder Google Drive terlebih dahulu.');
      return;
    }

    setIsSyncingDrive(true);
    try {
      const cleanPrefix = activeClient.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
      const result = await GoogleDriveService.fetchPhotosFromDriveFolder(
        targetFolderLink,
        activeClient.id,
        cleanPrefix,
        syncPhotoCount
      );

      // Preserve existing selected state if names match
      const existingSelectedNames = new Set(
        activeClient.photos.filter(p => p.selected).map(p => p.originalName)
      );

      const mergedPhotos = result.photos.map(p => ({
        ...p,
        selected: existingSelectedNames.has(p.originalName),
        stage: existingSelectedNames.has(p.originalName) ? ('SELECTED' as const) : ('RAW' as const),
      }));

      activeClient.photos = mergedPhotos;
      activeClient.googleDriveUrl = result.folderUrl;
      if (!activeClient.googleDriveFolders) {
        activeClient.googleDriveFolders = {};
      }
      activeClient.googleDriveFolders.clientFolderUrl = result.folderUrl;
      activeClient.googleDriveFolders.rawPhotosFolderUrl = targetFolderLink;

      activeClient.activityLog.unshift({
        id: `act_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: 'Admin Studio',
        action: `Sinkronisasi ${mergedPhotos.length} foto dari Google Drive: ${targetFolderLink}`,
      });

      AppStorage.updateClient(activeClient);
      setUploadNotice(`Berhasil sinkronisasi ${mergedPhotos.length} foto dari Google Drive ke galeri klien!`);
      setTimeout(() => setUploadNotice(null), 4000);
      onRefresh();
    } catch (err: any) {
      alert(`Gagal sinkronisasi dari Google Drive: ${err.message}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Import batch pasted links
  const handleImportBatchLinks = () => {
    if (!activeClient || !batchLinksText.trim()) return;
    const cleanPrefix = activeClient.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const startSeq = activeClient.photos.length + 1;
    const parsed = GoogleDriveService.parseBatchDriveLinks(
      activeClient.id,
      batchLinksText,
      cleanPrefix,
      startSeq
    );

    activeClient.photos = [...activeClient.photos, ...parsed];
    activeClient.activityLog.unshift({
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin Studio',
      action: `Menambahkan ${parsed.length} foto dari link Google Drive batch`,
    });

    AppStorage.updateClient(activeClient);
    setShowBatchLinksModal(false);
    setBatchLinksText('');
    setUploadNotice(`Berhasil menambahkan ${parsed.length} foto dari batch link Google Drive!`);
    setTimeout(() => setUploadNotice(null), 3000);
    onRefresh();
  };

  // Open WhatsApp Modal
  const handleOpenWhatsApp = (client: ClientProject) => {
    setWhatsAppClient(client);
    setShowWhatsAppModal(true);
  };

  // Send WhatsApp message
  const handleTriggerWhatsApp = () => {
    if (!whatsAppClient) return;
    const template = WHATSAPP_TEMPLATES.find(t => t.id === selectedWaTemplate);
    if (!template) return;
    const text = template.generateText(whatsAppClient, window.location.origin);
    openWhatsAppChat(whatsAppClient.phone, text);
    setShowWhatsAppModal(false);
  };

  // Update Status
  const handleUpdateStatus = (newStatus: WorkflowStatus) => {
    if (!activeClient) return;
    AppStorage.updateWorkflowStatus(activeClient.id, newStatus, 'Admin Wisuda by Tanthowi');
    onRefresh();
  };

  // Upload Batch Original Photos to Client
  const handleUploadRawPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeClient) return;
    setIsUploadingPhoto(true);

    const files = Array.from(e.target.files);
    const startNum = activeClient.photos.length + 1;

    setTimeout(() => {
      const newPhotos: Photo[] = files.map((file, idx) => {
        const seq = startNum + idx;
        const fakeUrl = URL.createObjectURL(file);
        return {
          id: `photo_${activeClient.id}_${Date.now()}_${idx}`,
          clientId: activeClient.id,
          sequenceNumber: seq,
          originalName: file.name,
          url: fakeUrl,
          thumbnailUrl: fakeUrl,
          stage: 'RAW',
          uploadedAt: new Date().toISOString(),
        };
      });

      activeClient.photos = [...activeClient.photos, ...newPhotos];
      activeClient.activityLog.unshift({
        id: `act_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: 'Admin Studio',
        action: `Mengunggah ${files.length} foto original JPEG ke folder 01_RAW_PHOTOS`,
      });

      AppStorage.updateClient(activeClient);
      setIsUploadingPhoto(false);
      setUploadNotice(`Berhasil menambahkan ${files.length} foto ke galeri klien.`);
      setTimeout(() => setUploadNotice(null), 3000);
      onRefresh();
    }, 800);
  };

  // Upload Edited Photo for a specific selected photo
  const handleUploadEditedPhoto = (photoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !activeClient) return;
    const file = e.target.files[0];
    const editedUrl = URL.createObjectURL(file);

    const targetPhoto = activeClient.photos.find(p => p.id === photoId);
    if (targetPhoto) {
      targetPhoto.editedUrl = editedUrl;
      targetPhoto.stage = 'EDIT_PROCESS';
      targetPhoto.revisionVersion = (targetPhoto.revisionVersion || 0) + 1;
      targetPhoto.approvalStatus = 'NEED_REVIEW';

      activeClient.currentStatus = 'WAITING_FOR_CLIENT_REVIEW';
      activeClient.activityLog.unshift({
        id: `act_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: 'Admin Studio',
        action: `Hasil edit diunggah untuk foto #${targetPhoto.sequenceNumber} (${file.name})`,
      });

      AppStorage.updateClient(activeClient);
      setUploadNotice(`Hasil edit untuk foto #${targetPhoto.sequenceNumber} berhasil diunggah.`);
      setTimeout(() => setUploadNotice(null), 3000);
      onRefresh();
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Alert */}
      {uploadNotice && (
        <div className="fixed top-20 right-6 z-50 max-w-md bg-neutral-900 border border-emerald-500/50 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">{uploadNotice}</div>
        </div>
      )}

      {/* Admin Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              DASHBOARD PUSAT ADMIN
            </span>
            <span className="text-xs text-neutral-400 font-mono">WISUDA BY TANTHOWI STUDIO</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif-editorial text-white mt-1">
            Manajemen Klien & Pengiriman Foto
          </h1>
          <p className="text-xs text-neutral-400">
            Kelola alur pemilihan foto wisuda, integrasi folder Google Drive, editing, revisi, dan ekspor.
          </p>
        </div>

        {/* Global Admin Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCreateClientModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Klien Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Total Klien</div>
          <div className="text-xl font-bold text-white mt-1">{metrics.totalClients}</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Total Foto Upload</div>
          <div className="text-xl font-bold text-white mt-1">{metrics.totalPhotos}</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Belum Memilih</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{metrics.waitingSelection}</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Pilihan Masuk</div>
          <div className="text-xl font-bold text-blue-400 mt-1">{metrics.selectionSubmitted}</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Proses Editing</div>
          <div className="text-xl font-bold text-purple-400 mt-1">{metrics.inEditing}</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Menunggu Revisi</div>
          <div className="text-xl font-bold text-red-400 mt-1">{metrics.revisionWaiting}</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-xl">
          <div className="text-[10px] font-mono text-neutral-400 uppercase">Foto Selesai</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.completed}</div>
        </div>
      </div>

      {/* Main Grid: Client List (Left) & Client Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Client Directory Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-neutral-900/40 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Users className="w-4 h-4 text-amber-400" />
              Daftar Klien ({clients.length})
            </h2>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, kode, universitas..."
              value={searchClient}
              onChange={e => setSearchClient(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Client List Cards */}
          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {filteredClients.map(client => {
              const isSelected = activeClient?.id === client.id;
              const selectedCount = client.photos.filter(p => p.selected).length;

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                    isSelected
                      ? 'bg-neutral-800/90 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono text-neutral-400">{client.code}</div>
                      <h3 className="text-xs font-semibold text-white mt-0.5">{client.name}</h3>
                      <p className="text-[11px] text-neutral-400">{client.university}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase shrink-0 ${
                        client.currentStatus === 'WAITING_FOR_SELECTION'
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                          : client.currentStatus === 'SELECTION_SUBMITTED'
                          ? 'bg-blue-950/80 text-blue-400 border border-blue-500/30'
                          : client.currentStatus === 'FINAL_READY'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {client.currentStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>
                      Pilihan: <strong className="text-white">{selectedCount}</strong> / {client.quotaMaxSelected}
                    </span>
                    <span>Total: {client.photos.length} Foto</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Client Workspace Panel (8 Cols) */}
        {activeClient && (
          <div className="lg:col-span-8 space-y-6 bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800">
            {/* Header Client Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-400">{activeClient.code}</span>
                  <span className="text-xs text-neutral-500">•</span>
                  <span className="text-xs text-neutral-400">Username: {activeClient.username}</span>
                  <span className="text-xs text-neutral-500">•</span>
                  <span className="text-xs text-neutral-400">Password: Wisudabytanthowijh</span>
                </div>
                <h2 className="text-xl font-serif-editorial text-white mt-1">
                  {activeClient.name}
                </h2>
                <p className="text-xs text-neutral-400">
                  {activeClient.faculty} • {activeClient.university} • WA: {activeClient.phone}
                </p>
              </div>

              {/* Action Buttons for this client */}
              <div className="flex items-center gap-2 flex-wrap">
                {activeClient.googleDriveUrl && (
                  <a
                    href={activeClient.googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-mono transition flex items-center gap-1.5 border border-neutral-700"
                    title="Buka Folder Google Drive Klien"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Folder GDrive</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </a>
                )}

                <button
                  onClick={() => handleOpenWhatsApp(activeClient)}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1.5 shadow"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Kirim WhatsApp
                </button>

                {onSelectClientAsView && (
                  <button
                    onClick={() => onSelectClientAsView(activeClient.id)}
                    className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition flex items-center gap-1.5 border border-neutral-700"
                    title="Buka tampilan seperti yang dilihat oleh klien ini"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    Lihat Mode Klien
                  </button>
                )}
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto text-xs">
              <button
                onClick={() => setClientDetailTab('overview')}
                className={`px-3 py-2 rounded-lg font-medium transition ${
                  clientDetailTab === 'overview'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Ikhtisar & Status
              </button>
              <button
                onClick={() => setClientDetailTab('selection')}
                className={`px-3 py-2 rounded-lg font-medium transition ${
                  clientDetailTab === 'selection'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Pilihan Foto ({activeClient.photos.filter(p => p.selected).length}) & Ekspor Excel
              </button>
              <button
                onClick={() => setClientDetailTab('editing')}
                className={`px-3 py-2 rounded-lg font-medium transition ${
                  clientDetailTab === 'editing'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Upload Edit & Revisi
              </button>
              <button
                onClick={() => setClientDetailTab('collage')}
                className={`px-3 py-2 rounded-lg font-medium transition ${
                  clientDetailTab === 'collage'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Studio Kolase IG Story
              </button>
              <button
                onClick={() => setClientDetailTab('drive')}
                className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  clientDetailTab === 'drive'
                    ? 'bg-neutral-800 text-amber-400 border border-amber-500/50'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                Link Google Drive & Tarik Foto
              </button>
            </div>

            {/* SUBTAB 1: OVERVIEW & STATUS CONTROL */}
            {clientDetailTab === 'overview' && (
              <div className="space-y-6">
                {/* Workflow Status Selector */}
                <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-neutral-400">
                      Ubah Status Workflow Klien Ini
                    </span>
                    <span className="text-xs text-amber-400 font-semibold font-mono">
                      Saat ini: {activeClient.currentStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {[
                      'WAITING_FOR_SELECTION',
                      'SELECTION_SUBMITTED',
                      'EDITING_IN_PROGRESS',
                      'WAITING_FOR_CLIENT_REVIEW',
                      'REVISION_REQUESTED',
                      'REVISION_IN_PROGRESS',
                      'APPROVED',
                      'FINAL_READY',
                      'COMPLETED',
                    ].map(st => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st as WorkflowStatus)}
                        className={`p-2 rounded-lg text-[10px] font-mono uppercase transition border ${
                          activeClient.currentStatus === st
                            ? 'bg-amber-500 text-black font-bold border-amber-400'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        {st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload RAW Photos Section */}
                <div className="p-5 bg-neutral-900 rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-white uppercase font-mono">
                        Unggah Foto Original (01_RAW_PHOTOS)
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Total {activeClient.photos.length} foto tersedia untuk dipilih oleh klien.
                      </p>
                    </div>

                    <label className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium cursor-pointer transition flex items-center gap-1.5 border border-neutral-700">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isUploadingPhoto ? 'Mengunggah...' : 'Upload Foto JPEG'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleUploadRawPhotos}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase text-neutral-400">Log Aktivitas Klien</h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {activeClient.activityLog.map(act => (
                      <div key={act.id} className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{act.actor}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {new Date(act.timestamp).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-neutral-300">{act.action}</p>
                        {act.detail && <p className="text-neutral-400 italic">"{act.detail}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: SELECTION & EXPORTS */}
            {clientDetailTab === 'selection' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                  <div>
                    <h3 className="text-xs font-semibold text-white uppercase font-mono">
                      Daftar Foto Pilihan Klien ({activeClient.photos.filter(p => p.selected).length} / {activeClient.quotaMaxSelected})
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Diunduh untuk proses import Lightroom / Capture One.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportSelectionToExcel(activeClient)}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Download Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => exportSelectionToTextList(activeClient)}
                      className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition flex items-center gap-1.5 border border-neutral-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Download List (.txt)
                    </button>
                  </div>
                </div>

                {/* Selected Photos Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {activeClient.photos
                    .filter(p => p.selected)
                    .map(photo => (
                      <div
                        key={photo.id}
                        className="rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800"
                      >
                        <div className="aspect-3/4 overflow-hidden relative">
                          <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-amber-400">
                            #{photo.sequenceNumber}
                          </div>
                        </div>
                        <div className="p-2 text-[10px] font-mono text-neutral-300 truncate">
                          {photo.originalName}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* SUBTAB 3: EDITING & REVISION */}
            {clientDetailTab === 'editing' && (
              <div className="space-y-6">
                <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-white uppercase font-mono">
                      Unggah Hasil Edit (03_EDIT_PROCESS & 04_REVISION)
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Pilih foto yang ingin diunggah hasil retouchingnya.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {activeClient.photos
                    .filter(p => p.selected)
                    .slice(0, 10)
                    .map(photo => (
                      <div
                        key={photo.id}
                        className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={photo.thumbnailUrl}
                            alt=""
                            className="w-16 h-16 object-cover rounded-lg border border-neutral-800"
                          />
                          <div>
                            <span className="text-xs font-mono font-bold text-white">
                              #{photo.sequenceNumber} - {photo.originalName}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                                  photo.approvalStatus === 'APPROVED'
                                    ? 'bg-emerald-950 text-emerald-400'
                                    : photo.approvalStatus === 'REQUEST_REVISION'
                                    ? 'bg-red-950 text-red-400'
                                    : 'bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {photo.approvalStatus || 'Belum Ada Edit'}
                              </span>
                              {photo.revisionVersion && (
                                <span className="text-[10px] text-neutral-400">
                                  Versi: v{photo.revisionVersion}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 border border-neutral-700">
                            <Upload className="w-3.5 h-3.5 text-amber-400" />
                            <span>Upload Hasil Edit</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => handleUploadEditedPhoto(photo.id, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* SUBTAB 4: COLLAGE CREATOR */}
            {clientDetailTab === 'collage' && (
              <StoryCollageStudio
                client={activeClient}
                availablePhotos={
                  activeClient.photos.filter(p => p.stage === 'FINAL' || p.selected)
                }
                isClientView={false}
              />
            )}

            {/* SUBTAB 5: GOOGLE DRIVE LINK & PHOTO SYNC */}
            {clientDetailTab === 'drive' && (
              <div className="space-y-6">
                {/* Section 1: Main GDrive Link & One-Click Photo Pull */}
                <div className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          Sumber Foto dari Link Google Drive Klien
                        </h3>
                        <p className="text-xs text-neutral-400">
                          Masukkan URL folder Google Drive klien untuk menarik foto-foto wisuda ke galeri pemilihan.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDriveFolderInput(`https://drive.google.com/drive/folders/1Tanthowi_${activeClient.code}`);
                          setRawFolderInput(`https://drive.google.com/drive/folders/1Tanthowi_${activeClient.code}_01_RAW`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono transition"
                        title="Isi dengan contoh URL Google Drive"
                      >
                        Contoh Link Preset
                      </button>
                      {activeClient.googleDriveUrl && (
                        <a
                          href={activeClient.googleDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium flex items-center gap-1.5 border border-neutral-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                          <span>Buka di Google Drive</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Form Inputs for Google Drive Link */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-neutral-300">
                          Link Folder Utama Klien di Google Drive
                        </label>
                        <span className="text-[11px] text-amber-400 font-mono">
                          ID: {GoogleDriveService.extractDriveFolderId(driveFolderInput) || 'Belum diisi'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz..."
                          value={driveFolderInput}
                          onChange={e => setDriveFolderInput(e.target.value)}
                          className="flex-1 px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:border-amber-400 outline-none font-mono"
                        />
                        <button
                          onClick={handleSaveDriveUrls}
                          className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition border border-neutral-700 shrink-0"
                        >
                          Simpan Link
                        </button>
                      </div>
                    </div>

                    {/* Pull Photos Action Box */}
                    <div className="p-4 bg-neutral-950/80 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-semibold text-white">
                            Tarik Foto dari Link Folder Google Drive ke Galeri Klien
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Sistem akan mengambil foto dari link di atas dan menampilkannya di halaman klien untuk dipilih.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={syncPhotoCount}
                          onChange={e => setSyncPhotoCount(Number(e.target.value))}
                          className="px-2.5 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs font-mono outline-none"
                        >
                          <option value={50}>50 Foto</option>
                          <option value={100}>100 Foto</option>
                          <option value={250}>250 Foto (Standar)</option>
                        </select>

                        <button
                          onClick={handleSyncPhotosFromDrive}
                          disabled={isSyncingDrive}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition shadow flex items-center gap-1.5 shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isSyncingDrive ? 'Menarik Foto...' : 'Tarik Foto Sekarang'}</span>
                        </button>

                        <button
                          onClick={() => setShowBatchLinksModal(true)}
                          className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition border border-neutral-700 shrink-0"
                        >
                          Batch Link Text
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Subfolder Links Management */}
                <div className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
                        Link Spesifik Subfolder per Kategori
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        Atur link langsung ke masing-masing subfolder di Google Drive.
                      </p>
                    </div>
                    <button
                      onClick={handleSaveDriveUrls}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition border border-neutral-700"
                    >
                      Simpan Semua Subfolder
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-neutral-400 block mb-1 font-mono text-[11px]">
                        📁 01_RAW_PHOTOS (Foto Kamera Asli):
                      </label>
                      <input
                        type="text"
                        placeholder="Link folder RAW..."
                        value={rawFolderInput}
                        onChange={e => setRawFolderInput(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-[11px] focus:border-amber-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-neutral-400 block mb-1 font-mono text-[11px]">
                        📁 02_SELECTED_PHOTOS (Pilihan Klien):
                      </label>
                      <input
                        type="text"
                        placeholder="Link folder Selected..."
                        value={selectedFolderInput}
                        onChange={e => setSelectedFolderInput(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-[11px] focus:border-amber-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-neutral-400 block mb-1 font-mono text-[11px]">
                        📁 03_EDIT_PROCESS (Proses Retouch):
                      </label>
                      <input
                        type="text"
                        placeholder="Link folder Edit..."
                        value={editFolderInput}
                        onChange={e => setEditFolderInput(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-[11px] focus:border-amber-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-neutral-400 block mb-1 font-mono text-[11px]">
                        📁 05_FINAL_PHOTOS (Hasil Final):
                      </label>
                      <input
                        type="text"
                        placeholder="Link folder Final..."
                        value={finalFolderInput}
                        onChange={e => setFinalFolderInput(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-[11px] focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Folder Hierarchy Visualizer */}
                <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3 font-mono text-xs">
                  <div className="text-amber-400 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4" />
                      STRUKTUR RESMI GOOGLE DRIVE
                    </span>
                    <span className="text-[10px] text-neutral-400 uppercase font-sans">
                      Terisolasi per Klien (Tidak Dicampur)
                    </span>
                  </div>

                  <div className="pl-4 border-l border-neutral-800 space-y-1.5 text-neutral-300">
                    <div>📁 WISUDA BY TANTHOWI /</div>
                    <div className="pl-4 border-l border-neutral-800 space-y-1">
                      <div className="text-white font-semibold">📁 {activeClient.code}</div>
                      <div className="pl-4 border-l border-neutral-800 space-y-1 text-neutral-400 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span>📁 01_RAW_PHOTOS ({activeClient.photos.length} foto)</span>
                          {rawFolderInput && (
                            <a href={rawFolderInput} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                              Buka GDrive ↗
                            </a>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span>📁 02_SELECTED_PHOTOS ({activeClient.photos.filter(p => p.selected).length} dipilih)</span>
                          {selectedFolderInput && (
                            <a href={selectedFolderInput} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                              Buka GDrive ↗
                            </a>
                          )}
                        </div>
                        <div>📁 03_EDIT_PROCESS</div>
                        <div>📁 04_REVISION / REVISION_01</div>
                        <div>📁 05_FINAL_PHOTOS</div>
                        <div>📁 06_COLLAGE</div>
                        <div>📁 07_DOWNLOAD</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE CLIENT */}
      {showCreateClientModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-semibold text-white">Buat Akun Klien Baru</h3>
              <button onClick={() => setShowCreateClientModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-300 block mb-1">Nama Lengkap Klien & Gelar</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Hidayat, S.H."
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 block mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    placeholder="klien_rian"
                    value={newClientUsername}
                    onChange={e => setNewClientUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 block mb-1">Password Awal (Default)</label>
                  <input
                    type="text"
                    disabled
                    value="Wisudabytanthowijh"
                    className="w-full px-3 py-2 bg-neutral-900/80 border border-neutral-800 rounded-lg text-neutral-400 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 block mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="08123456789"
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 block mb-1">Kuota Maksimal Pilihan</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newClientQuota}
                    onChange={e => setNewClientQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 block mb-1">Universitas</label>
                  <input
                    type="text"
                    value={newClientUniversity}
                    onChange={e => setNewClientUniversity(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 block mb-1">Fakultas</label>
                  <input
                    type="text"
                    value={newClientFaculty}
                    onChange={e => setNewClientFaculty(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 block mb-1">Paket Wisuda</label>
                <input
                  type="text"
                  value={newClientPackage}
                  onChange={e => setNewClientPackage(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-neutral-300 block mb-1">
                  Link Folder Google Drive Klien (Bisa diisi link folder yang sudah ada):
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={newClientDriveUrl}
                  onChange={e => setNewClientDriveUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none font-mono"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Jika diisi, sistem akan otomatis menautkan folder dan menyinkronkan foto dari Google Drive tersebut.
                </span>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400">
                Sistem akan secara otomatis membuat folder Google Drive khusus:
                <br />
                <code className="text-amber-400">WISUDA BY TANTHOWI / CLIENT_XXX / 01_RAW ... 07_DOWNLOAD</code>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClientModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClient}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/20"
                >
                  {isCreatingClient ? 'Membuat Akun & Folder...' : 'Simpan Akun Klien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INPUT BATCH LINK GOOGLE DRIVE */}
      {showBatchLinksModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Input Batch Link Foto Google Drive</h3>
              </div>
              <button onClick={() => setShowBatchLinksModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Tempel daftar URL Google Drive foto (satu link per baris). Sistem akan otomatis mengubahnya menjadi foto pilihan galeri klien.
            </p>

            <textarea
              rows={8}
              placeholder={`https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view\nhttps://drive.google.com/file/d/2BcDeFgHiJkLmNoPqRsTuVwXyZa/view`}
              value={batchLinksText}
              onChange={e => setBatchLinksText(e.target.value)}
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-mono text-[11px] focus:border-amber-400 outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowBatchLinksModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleImportBatchLinks}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow"
              >
                Tambahkan ke Galeri Klien
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: WHATSAPP NOTIFICATION SENDER */}
      {showWhatsAppModal && whatsAppClient && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Kirim WhatsApp ke Klien</h3>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-mono">Tujuan</span>
                  <strong className="text-white text-sm">{whatsAppClient.name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-neutral-400 block text-[10px] uppercase font-mono">Nomor WhatsApp</span>
                  <span className="text-emerald-400 font-mono">{whatsAppClient.phone}</span>
                </div>
              </div>

              {/* Template selector */}
              <div>
                <label className="text-neutral-300 block mb-1.5 font-medium">Pilih Template Notifikasi:</label>
                <div className="space-y-1.5">
                  {WHATSAPP_TEMPLATES.map(tpl => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedWaTemplate(tpl.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition ${
                        selectedWaTemplate === tpl.id
                          ? 'bg-neutral-800 border-emerald-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span>{tpl.label}</span>
                        {selectedWaTemplate === tpl.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{tpl.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message Preview */}
              <div>
                <label className="text-neutral-300 block mb-1 font-medium">Pratinjau Pesan yang Dikirim:</label>
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl whitespace-pre-wrap font-sans text-neutral-300 max-h-48 overflow-y-auto">
                  {WHATSAPP_TEMPLATES.find(t => t.id === selectedWaTemplate)?.generateText(
                    whatsAppClient,
                    window.location.origin
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium"
              >
                Tutup
              </button>
              <button
                onClick={handleTriggerWhatsApp}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Buka & Kirim WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
