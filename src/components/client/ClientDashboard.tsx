/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Grid3X3,
  Image as ImageIcon,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { ClientProject, Photo } from '../../types';
import { AppStorage } from '../../lib/storage';
import { exportSelectionToExcel, exportSelectionToTextList, downloadPhotosAsZip } from '../../lib/export';
import { BeforeAfterSlider } from '../common/BeforeAfterSlider';
import { StoryCollageStudio } from '../collage/StoryCollageStudio';

interface ClientDashboardProps {
  client: ClientProject;
  onRefresh: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ client, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'editing' | 'final' | 'collage' | 'activity'>('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<number>(0);

  // Comments in editing review
  const [activeReviewPhotoId, setActiveReviewPhotoId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentType, setCommentType] = useState<'APPROVED' | 'REQUEST_REVISION' | 'NEED_REVIEW' | 'COMMENT'>('APPROVED');

  // Selected count calculation
  const selectedPhotos = useMemo(() => client.photos.filter(p => p.selected), [client.photos]);
  const selectedCount = selectedPhotos.length;
  const quota = client.quotaMaxSelected || 25;

  // Filtered photos for gallery
  const filteredPhotos = useMemo(() => {
    return client.photos.filter(photo => {
      const matchesSearch =
        searchQuery === '' ||
        photo.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(photo.sequenceNumber).includes(searchQuery);

      if (filterMode === 'selected') {
        return matchesSearch && photo.selected;
      }
      return matchesSearch;
    });
  }, [client.photos, searchQuery, filterMode]);

  // Photos with edit process
  const editedPhotos = useMemo(() => {
    return client.photos.filter(p => p.editedUrl || p.stage === 'EDIT_PROCESS' || p.stage === 'FINAL');
  }, [client.photos]);

  // Final photos
  const finalPhotos = useMemo(() => {
    return client.photos.filter(p => p.stage === 'FINAL' || (p.editedUrl && p.approvalStatus === 'APPROVED'));
  }, [client.photos]);

  // Handle Select / Deselect photo
  const handleToggleSelect = (photoId: string) => {
    const res = AppStorage.togglePhotoSelection(client.id, photoId);
    if (!res.success && res.message) {
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      onRefresh();
    }
  };

  // Submit selection to admin
  const handleSubmitSelection = () => {
    if (selectedCount === 0) {
      setToastMessage('Pilih minimal 1 foto terlebih dahulu sebelum mengirim.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    AppStorage.submitSelection(client.id, submitNotes);
    setShowSubmitModal(false);
    onRefresh();
    setToastMessage(`Pilihan ${selectedCount} foto berhasil dikirimkan ke Wisuda by Tanthowi!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle photo comment submit
  const handleSendComment = (photoId: string) => {
    if (!commentInput.trim() && commentType === 'COMMENT') return;
    AppStorage.addPhotoComment(client.id, photoId, {
      authorName: client.name,
      authorRole: 'client',
      content: commentInput.trim() || (commentType === 'APPROVED' ? 'Foto sudah sesuai, disetujui!' : 'Mohon dilakukan revisi.'),
      statusType: commentType,
    });
    setCommentInput('');
    onRefresh();
  };

  // Download all final photos as ZIP
  const handleDownloadAllZip = async () => {
    const targetPhotos = finalPhotos.length > 0 ? finalPhotos : selectedPhotos;
    if (targetPhotos.length === 0) {
      setToastMessage('Belum ada foto yang tersedia untuk diunduh.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setIsZipping(true);
    try {
      await downloadPhotosAsZip(targetPhotos, `FOTO_WISUDA_${client.code}`, percent => {
        setZipProgress(Math.round(percent));
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  // Lightbox navigation
  const handleLightboxNav = (direction: 'prev' | 'next') => {
    if (!lightboxPhoto) return;
    const currentIndex = client.photos.findIndex(p => p.id === lightboxPhoto.id);
    if (currentIndex < 0) return;
    const nextIndex = direction === 'next' ? (currentIndex + 1) % client.photos.length : (currentIndex - 1 + client.photos.length) % client.photos.length;
    setLightboxPhoto(client.photos[nextIndex]);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 max-w-md bg-neutral-900 border border-amber-500/50 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">{toastMessage}</div>
          <button onClick={() => setToastMessage(null)} className="text-neutral-400 hover:text-white ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900/60 border border-neutral-800 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PORTAL KLIEN
              </span>
              <span className="text-xs text-neutral-400 font-mono">{client.code}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif-editorial text-white">
              {client.name}
            </h1>
            <p className="text-xs md:text-sm text-neutral-400">
              {client.faculty} • {client.university} — Acara: {new Date(client.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Quota & Status Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/40 border border-neutral-800 p-4 rounded-xl">
            <div>
              <div className="text-[11px] text-neutral-400 uppercase font-mono">Status Pekerjaan</div>
              <div className="text-sm font-semibold text-amber-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4" />
                {client.currentStatus.replace(/_/g, ' ')}
              </div>
            </div>
            <div className="h-8 w-px bg-neutral-800 hidden sm:block" />
            <div>
              <div className="text-[11px] text-neutral-400 uppercase font-mono">Foto Dipilih</div>
              <div className="text-base font-semibold text-white mt-0.5">
                <span className={selectedCount >= quota ? 'text-amber-400 font-bold' : ''}>
                  {selectedCount}
                </span>{' '}
                <span className="text-neutral-500 text-xs">/ {quota} Maksimal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Selection Progress Bar */}
        <div className="mt-6 space-y-1.5">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Progres Pemilihan Foto</span>
            <span className="font-mono">{Math.round((selectedCount / quota) * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                selectedCount >= quota ? 'bg-amber-400' : 'bg-white'
              }`}
              style={{ width: `${Math.min((selectedCount / quota) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'gallery'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          <span>Galeri Foto Original</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 text-neutral-300 font-mono">
            {client.photos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('editing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'editing'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Review Hasil Editing</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 text-neutral-300 font-mono">
            {editedPhotos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('final')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'final'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Foto Final & Download</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 text-neutral-300 font-mono">
            {finalPhotos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('collage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'collage'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span>Kolase Instagram Story</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition ${
            activeTab === 'activity'
              ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat Aktivitas</span>
        </button>
      </div>

      {/* TAB 1: GALLERY & SELECTION */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* Gallery Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
            {/* Search and Filter */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nomor foto atau DSC..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-md transition ${
                    filterMode === 'all' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Semua ({client.photos.length})
                </button>
                <button
                  onClick={() => setFilterMode('selected')}
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1 ${
                    filterMode === 'selected' ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  Terpilih ({selectedCount})
                </button>
              </div>
            </div>

            {/* Selection Actions & Submit Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => exportSelectionToExcel(client)}
                className="px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition flex items-center gap-1.5 border border-neutral-800"
                title="Download daftar pilihan dalam format Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unduh Excel</span>
              </button>

              <button
                onClick={() => exportSelectionToTextList(client)}
                className="px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition flex items-center gap-1.5 border border-neutral-800"
                title="Download daftar teks nama file"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Unduh List</span>
              </button>

              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Selection ({selectedCount}/{quota})</span>
              </button>
            </div>
          </div>

          {/* Photos Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="py-20 text-center text-neutral-400 bg-neutral-900/20 rounded-2xl border border-neutral-800">
              <ImageIcon className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-medium">Tidak ada foto yang cocok dengan pencarian.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                }}
                className="mt-3 text-xs text-amber-400 hover:underline"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredPhotos.map(photo => {
                const isSelected = !!photo.selected;
                return (
                  <div
                    key={photo.id}
                    className={`group relative rounded-xl overflow-hidden bg-neutral-950 border transition duration-200 ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10'
                        : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div
                      className="relative aspect-3/4 overflow-hidden cursor-pointer"
                      onClick={() => setLightboxPhoto(photo)}
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.originalName}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />

                      {/* Photo Sequence Badge */}
                      <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white border border-white/10">
                        #{String(photo.sequenceNumber).padStart(3, '0')}
                      </div>

                      {/* Enlarge Hint */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Footer Info & Select Button */}
                    <div className="p-2.5 bg-neutral-900/90 border-t border-neutral-800/80 flex items-center justify-between gap-1.5">
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-mono text-neutral-300 truncate" title={photo.originalName}>
                          {photo.originalName}
                        </p>
                      </div>

                      {/* Select Toggle Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleSelect(photo.id);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-400 text-black shadow-sm'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>PILIH</span>
                          </>
                        ) : (
                          <span>SELECT</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EDITING REVIEW & BEFORE/AFTER */}
      {activeTab === 'editing' && (
        <div className="space-y-6">
          <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Review Hasil Editing Studio (Before & After)</h2>
              <p className="text-xs text-neutral-400">
                Lihat detail retouching, setujui foto, atau berikan catatan revisi untuk tim editor Wisuda by Tanthowi.
              </p>
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              Total Foto dalam Proses: {editedPhotos.length}
            </div>
          </div>

          {editedPhotos.length === 0 ? (
            <div className="py-20 text-center text-neutral-400 bg-neutral-900/20 rounded-2xl border border-neutral-800">
              <Sparkles className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-medium">Belum ada foto yang masuk tahap editing.</p>
              <p className="text-xs text-neutral-500 mt-1">
                Kirimkan pilihan foto Anda terlebih dahulu pada tab Galeri Foto Original.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Photo Selector List (Left 4 cols) */}
              <div className="lg:col-span-4 space-y-3">
                <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block">
                  Daftar Foto Editing
                </span>
                <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                  {editedPhotos.map(photo => {
                    const isSelectedForReview = (activeReviewPhotoId || editedPhotos[0].id) === photo.id;
                    return (
                      <div
                        key={photo.id}
                        onClick={() => setActiveReviewPhotoId(photo.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                          isSelectedForReview
                            ? 'bg-neutral-800/90 border-amber-500 shadow-md shadow-amber-500/10'
                            : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <img
                          src={photo.thumbnailUrl}
                          alt=""
                          className="w-14 h-14 object-cover rounded-lg border border-neutral-800"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium text-white truncate">
                              #{photo.sequenceNumber} - {photo.originalName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase font-mono ${
                                photo.approvalStatus === 'APPROVED'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                  : photo.approvalStatus === 'REQUEST_REVISION'
                                  ? 'bg-red-950 text-red-400 border border-red-500/30'
                                  : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {photo.approvalStatus || 'NEED REVIEW'}
                            </span>
                            {photo.feedback && photo.feedback.length > 0 && (
                              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                                <MessageSquare className="w-3 h-3" />
                                {photo.feedback.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Before/After View & Comments (Right 8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {(() => {
                  const targetPhoto =
                    editedPhotos.find(p => p.id === (activeReviewPhotoId || editedPhotos[0]?.id)) ||
                    editedPhotos[0];
                  if (!targetPhoto) return null;

                  return (
                    <div className="space-y-6 bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-white">
                            Foto #{targetPhoto.sequenceNumber}: {targetPhoto.originalName}
                          </h3>
                          <span className="text-xs text-neutral-400">
                            Versi Revisi: v{targetPhoto.revisionVersion || 1}
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono font-medium uppercase ${
                            targetPhoto.approvalStatus === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : targetPhoto.approvalStatus === 'REQUEST_REVISION'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {targetPhoto.approvalStatus || 'NEED REVIEW'}
                        </span>
                      </div>

                      {/* Interactive Slider */}
                      <BeforeAfterSlider
                        originalUrl={targetPhoto.url}
                        editedUrl={targetPhoto.editedUrl || targetPhoto.url}
                        originalLabel="ORIGINAL (RAW)"
                        editedLabel="HASIL EDITING (V1)"
                      />

                      {/* Feedback & Revision Box */}
                      <div className="space-y-4 pt-4 border-t border-neutral-800">
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                          Beri Catatan & Feedback
                        </h4>

                        {/* Status Type Selector */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setCommentType('APPROVED')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                              commentType === 'APPROVED'
                                ? 'bg-emerald-600 text-white font-semibold'
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            APPROVED (Sudah Sesuai)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCommentType('REQUEST_REVISION')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                              commentType === 'REQUEST_REVISION'
                                ? 'bg-red-600 text-white font-semibold'
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            REQUEST REVISION (Minta Revisi)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCommentType('COMMENT')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                              commentType === 'COMMENT'
                                ? 'bg-amber-500 text-black font-semibold'
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            CATATAN TAMBAHAN
                          </button>
                        </div>

                        {/* Input Box */}
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            placeholder="Contoh: Tolong cerahkan wajah sedikit, kurangi tone kuning di bagian toga, atau rapikan rambut..."
                            value={commentInput}
                            onChange={e => setCommentInput(e.target.value)}
                            className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:border-amber-400 outline-none placeholder-neutral-500"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSendComment(targetPhoto.id)}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Kirim Feedback
                            </button>
                          </div>
                        </div>

                        {/* Comment Thread History */}
                        {targetPhoto.feedback && targetPhoto.feedback.length > 0 && (
                          <div className="space-y-3 pt-3">
                            <span className="text-[11px] text-neutral-400 font-mono uppercase block">
                              Riwayat Diskusi Revisi
                            </span>
                            <div className="space-y-2.5">
                              {targetPhoto.feedback.map(fb => (
                                <div
                                  key={fb.id}
                                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                                    fb.authorRole === 'admin'
                                      ? 'bg-neutral-900 border-amber-500/20'
                                      : 'bg-neutral-950 border-neutral-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-white">{fb.authorName}</span>
                                    <span className="text-[10px] text-neutral-500 font-mono">
                                      {new Date(fb.createdAt).toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                  <p className="text-neutral-300">{fb.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FINAL PHOTOS & DOWNLOAD */}
      {activeTab === 'final' && (
        <div className="space-y-6">
          <div className="bg-neutral-900/60 p-6 rounded-2xl border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h2 className="text-base font-semibold text-white">Foto Wisuda Final Siap Unduh</h2>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Kualitas foto asli resolusi penuh tanpa kompresi berlebihan. Siap untuk dicetak dan dibagikan.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadAllZip}
                disabled={isZipping}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                <span>{isZipping ? `Mengompres ${zipProgress}%...` : 'Download All (ZIP)'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {(finalPhotos.length > 0 ? finalPhotos : selectedPhotos).map(photo => (
              <div
                key={photo.id}
                className="group relative rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 hover:border-neutral-600 transition"
              >
                <div className="aspect-3/4 overflow-hidden">
                  <img
                    src={photo.editedUrl || photo.url}
                    alt={photo.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="p-3 bg-neutral-900/90 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-300 truncate">{photo.originalName}</span>
                  <a
                    href={photo.editedUrl || photo.url}
                    download={photo.originalName}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition"
                    title="Download foto resolusi tinggi"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INSTAGRAM STORY COLLAGE */}
      {activeTab === 'collage' && (
        <StoryCollageStudio
          client={client}
          availablePhotos={finalPhotos.length > 0 ? finalPhotos : selectedPhotos}
          isClientView={true}
        />
      )}

      {/* TAB 5: ACTIVITY LOG */}
      {activeTab === 'activity' && (
        <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800 space-y-4">
          <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
            Riwayat Aktivitas & Perubahan Status
          </h2>
          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-neutral-800">
            {client.activityLog.map(act => (
              <div key={act.id} className="relative flex items-start gap-4 pl-8 text-xs">
                <span className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-amber-400 ring-4 ring-neutral-950" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{act.actor}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {new Date(act.timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-neutral-300">{act.action}</p>
                  {act.detail && <p className="text-neutral-400 italic">"{act.detail}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white border-b border-neutral-800/80 pb-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-neutral-800 font-mono text-xs text-amber-400">
                #{String(lightboxPhoto.sequenceNumber).padStart(3, '0')}
              </span>
              <span className="text-xs sm:text-sm font-mono text-neutral-300 truncate max-w-xs sm:max-w-md">
                {lightboxPhoto.originalName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleSelect(lightboxPhoto.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  lightboxPhoto.selected
                    ? 'bg-amber-400 text-black'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                }`}
              >
                {lightboxPhoto.selected ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Terpilih</span>
                  </>
                ) : (
                  <span>Pilih Foto Ini</span>
                )}
              </button>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Image with Prev/Next Controls */}
          <div className="relative flex-1 flex items-center justify-center p-2 my-2 overflow-hidden">
            <button
              onClick={() => handleLightboxNav('prev')}
              className="absolute left-2 sm:left-6 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-neutral-700 text-white flex items-center justify-center transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.originalName}
              className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl"
            />

            <button
              onClick={() => handleLightboxNav('next')}
              className="absolute right-2 sm:right-6 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-neutral-700 text-white flex items-center justify-center transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Info Bar */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-3">
            <span>Gunakan tombol panah kiri / kanan untuk melihat foto berikutnya</span>
            <span className="font-mono">
              Status Kuota: {selectedCount} / {quota} foto
            </span>
          </div>
        </div>
      )}

      {/* CONFIRM SUBMIT SELECTION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-semibold text-white">Konfirmasi Pengiriman Pilihan Foto</h3>
              <button onClick={() => setShowSubmitModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300">
              <p>
                Anda akan mengirimkan <strong className="text-amber-400">{selectedCount} foto</strong> dari batas{' '}
                <strong>{quota} foto</strong> kepada tim Wisuda by Tanthowi untuk mulai diedit.
              </p>

              <div>
                <label className="block text-neutral-400 mb-1">Catatan Tambahan untuk Fotografer & Editor (Opsional):</label>
                <textarea
                  rows={3}
                  value={submitNotes}
                  onChange={e => setSubmitNotes(e.target.value)}
                  placeholder="Contoh: Tolong prioritaskan foto keluarga, perhatikan warna selempang, dll."
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400">
                Pilihan Anda akan dicatat lengkap dengan tanggal dan waktu pengiriman, serta dapat diunduh dalam format Excel (.xlsx).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitSelection}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/20"
              >
                Ya, Kirim Pilihan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
