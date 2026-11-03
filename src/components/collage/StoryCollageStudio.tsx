/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Share2,
  Plus,
  Trash2,
  Layout,
  Type,
  Palette,
  Image as ImageIcon,
  Check,
  Smartphone,
  Save,
  RotateCcw,
} from 'lucide-react';
import { ClientProject, CollageTemplateId, Photo, StoryCollagePage } from '../../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { AppStorage } from '../../lib/storage';

interface StoryCollageStudioProps {
  client: ClientProject;
  availablePhotos: Photo[];
  onSave?: (pages: StoryCollagePage[]) => void;
  isClientView?: boolean;
}

const TEMPLATE_CONFIGS: {
  id: CollageTemplateId;
  name: string;
  slots: number;
  description: string;
}[] = [
  { id: 'template-1', name: 'Hero Solo (1 Foto)', slots: 1, description: '1 foto utama besar portrait editorial' },
  { id: 'template-2', name: 'Duo Vertical (2 Foto)', slots: 2, description: '2 foto split bertumpuk atas-bawah' },
  { id: 'template-3', name: 'Trio Editorial (3 Foto)', slots: 3, description: '1 foto utama atas + 2 foto samping' },
  { id: 'template-4', name: 'Quad Grid 2x2 (4 Foto)', slots: 4, description: '4 foto tersusun rapi seimbang' },
  { id: 'template-5', name: 'Editorial 6 (6 Foto)', slots: 6, description: '6 foto gaya majalah graduation' },
  { id: 'template-6', name: 'Scrapbook Polaroids', slots: 4, description: 'Gaya polaroid estetik bertumpuk' },
];

const BG_PALETTES = [
  { name: 'Pure Obsidian', value: '#090a0d', text: '#ffffff' },
  { name: 'Studio Charcoal', value: '#16181d', text: '#f3f4f6' },
  { name: 'Warm Cream', value: '#f5f2eb', text: '#1a1917' },
  { name: 'Editorial White', value: '#ffffff', text: '#111827' },
  { name: 'Deep Emerald', value: '#0d1b15', text: '#e6f4ea' },
  { name: 'Midnight Navy', value: '#0b1324', text: '#e8f0fe' },
];

export const StoryCollageStudio: React.FC<StoryCollageStudioProps> = ({
  client,
  availablePhotos,
  onSave,
  isClientView = false,
}) => {
  const [pages, setPages] = useState<StoryCollagePage[]>(
    client.collagePages && client.collagePages.length > 0
      ? client.collagePages
      : [
          {
            id: 'page_1',
            title: 'Halaman 1',
            templateId: 'template-1',
            photoUrls: [
              availablePhotos[0]?.editedUrl || availablePhotos[0]?.url || null,
            ],
            backgroundColor: '#090a0d',
            textColor: '#ffffff',
            padding: 40,
            gap: 20,
            borderRadius: 8,
            fontFamily: 'serif',
            titleText: 'GRADUATION DAY',
            subtitleText: `${client.university.toUpperCase()} • ${client.faculty.toUpperCase()}`,
            clientNameText: client.name.toUpperCase(),
            dateText: 'CLASS OF 2026',
            showLogo: true,
            showOrnaments: true,
            ornamentType: 'laurel',
          },
        ]
  );

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'template' | 'photos' | 'style' | 'text'>('template');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentPage = pages[activePageIndex] || pages[0];

  // Helper to update current active page
  const updateCurrentPage = (partial: Partial<StoryCollagePage>) => {
    setPages(prev => {
      const updated = [...prev];
      updated[activePageIndex] = { ...updated[activePageIndex], ...partial };
      return updated;
    });
  };

  // Switch template
  const handleSelectTemplate = (templateId: CollageTemplateId) => {
    const config = TEMPLATE_CONFIGS.find(t => t.id === templateId)!;
    const newPhotos = [...currentPage.photoUrls];
    while (newPhotos.length < config.slots) {
      const nextPhoto = availablePhotos[newPhotos.length % availablePhotos.length];
      newPhotos.push(nextPhoto ? nextPhoto.editedUrl || nextPhoto.url : null);
    }
    updateCurrentPage({
      templateId,
      photoUrls: newPhotos.slice(0, config.slots),
    });
  };

  // Add new page
  const handleAddPage = () => {
    const newIndex = pages.length + 1;
    const newPage: StoryCollagePage = {
      id: `page_${Date.now()}`,
      title: `Halaman ${newIndex}`,
      templateId: 'template-3',
      photoUrls: availablePhotos
        .slice(0, 3)
        .map(p => p.editedUrl || p.url),
      backgroundColor: '#16181d',
      textColor: '#ffffff',
      padding: 36,
      gap: 16,
      borderRadius: 8,
      fontFamily: 'serif',
      titleText: 'MOMENTS',
      subtitleText: client.university,
      clientNameText: client.name,
      dateText: 'WISUDA BY TANTHOWI',
      showLogo: true,
      showOrnaments: false,
      ornamentType: 'minimal',
    };
    setPages([...pages, newPage]);
    setActivePageIndex(pages.length);
  };

  // Delete page
  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) return;
    const filtered = pages.filter((_, i) => i !== index);
    setPages(filtered);
    setActivePageIndex(Math.max(0, activePageIndex - 1));
  };

  // Assign photo to selected slot
  const handleAssignPhotoToSlot = (photoUrl: string) => {
    const newPhotos = [...currentPage.photoUrls];
    newPhotos[selectedSlotIndex] = photoUrl;
    updateCurrentPage({ photoUrls: newPhotos });
    // Auto advance slot
    const maxSlots = TEMPLATE_CONFIGS.find(t => t.id === currentPage.templateId)?.slots || 1;
    setSelectedSlotIndex((selectedSlotIndex + 1) % maxSlots);
  };

  // Save changes to storage
  const handleSaveDesign = () => {
    client.collagePages = pages;
    AppStorage.updateClient(client);
    if (onSave) onSave(pages);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  /**
   * High-resolution 1080 x 1920 Canvas Renderer
   */
  const renderCanvas = useCallback(
    async (page: StoryCollagePage, targetCanvas: HTMLCanvasElement): Promise<void> => {
      const width = 1080;
      const height = 1920;
      targetCanvas.width = width;
      targetCanvas.height = height;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw Background
      ctx.fillStyle = page.backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Subtle textured border or vignette
      ctx.strokeStyle = page.textColor === '#ffffff' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // 2. Header / Branding
      const isDarkBg = page.backgroundColor === '#090a0d' || page.backgroundColor === '#16181d' || page.backgroundColor === '#0d1b15' || page.backgroundColor === '#0b1324';
      ctx.fillStyle = page.textColor;
      ctx.textAlign = 'center';

      if (page.showLogo) {
        ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
        ctx.letterSpacing = '6px';
        ctx.fillText('WISUDA BY TANTHOWI', width / 2, 90);
        ctx.font = '400 15px "Plus Jakarta Sans", sans-serif';
        ctx.letterSpacing = '3px';
        ctx.fillStyle = isDarkBg ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
        ctx.fillText('PHOTOGRAPHY • STUDIO SELECTION', width / 2, 116);
      }

      // 3. Define Photo Layout Bounding Box
      const topOffset = page.showLogo ? 160 : 100;
      const bottomOffset = 260; // Space reserved for client name, degree, and typography
      const galleryWidth = width - page.padding * 2;
      const galleryHeight = height - topOffset - bottomOffset;

      // Helper function to draw image with cover fit and rounded corners
      const drawCoverImage = (img: HTMLImageElement, x: number, y: number, w: number, h: number, radius: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();

        // Calculate aspect fill
        const imgRatio = img.width / img.height;
        const targetRatio = w / h;
        let renderW = w;
        let renderH = h;
        let renderX = x;
        let renderY = y;

        if (imgRatio > targetRatio) {
          renderW = h * imgRatio;
          renderX = x - (renderW - w) / 2;
        } else {
          renderH = w / imgRatio;
          renderY = y - (renderH - h) / 2;
        }

        ctx.drawImage(img, renderX, renderY, renderW, renderH);

        // Subtle inner shadow / border
        ctx.restore();
        ctx.strokeStyle = isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      };

      // Load images
      const loadedImages: (HTMLImageElement | null)[] = await Promise.all(
        page.photoUrls.map(url => {
          if (!url) return Promise.resolve(null);
          return new Promise<HTMLImageElement | null>(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
          });
        })
      );

      // 4. Draw Layout Templates
      const p = page.padding;
      const g = page.gap;
      const r = page.borderRadius;

      switch (page.templateId) {
        case 'template-1': {
          // 1 Large Hero Photo
          const img = loadedImages[0];
          if (img) {
            drawCoverImage(img, p, topOffset, galleryWidth, galleryHeight, r);
          }
          break;
        }
        case 'template-2': {
          // 2 Vertical Stacked Photos
          const slotHeight = (galleryHeight - g) / 2;
          if (loadedImages[0]) drawCoverImage(loadedImages[0], p, topOffset, galleryWidth, slotHeight, r);
          if (loadedImages[1]) drawCoverImage(loadedImages[1], p, topOffset + slotHeight + g, galleryWidth, slotHeight, r);
          break;
        }
        case 'template-3': {
          // 1 Big Top + 2 Bottom Side-by-side
          const topH = galleryHeight * 0.58;
          const botH = galleryHeight - topH - g;
          const botW = (galleryWidth - g) / 2;

          if (loadedImages[0]) drawCoverImage(loadedImages[0], p, topOffset, galleryWidth, topH, r);
          if (loadedImages[1]) drawCoverImage(loadedImages[1], p, topOffset + topH + g, botW, botH, r);
          if (loadedImages[2]) drawCoverImage(loadedImages[2], p + botW + g, topOffset + topH + g, botW, botH, r);
          break;
        }
        case 'template-4': {
          // 2x2 Grid
          const colW = (galleryWidth - g) / 2;
          const rowH = (galleryHeight - g) / 2;

          if (loadedImages[0]) drawCoverImage(loadedImages[0], p, topOffset, colW, rowH, r);
          if (loadedImages[1]) drawCoverImage(loadedImages[1], p + colW + g, topOffset, colW, rowH, r);
          if (loadedImages[2]) drawCoverImage(loadedImages[2], p, topOffset + rowH + g, colW, rowH, r);
          if (loadedImages[3]) drawCoverImage(loadedImages[3], p + colW + g, topOffset + rowH + g, colW, rowH, r);
          break;
        }
        case 'template-5': {
          // 6 Editorial Magazine Grid (2 columns x 3 rows)
          const colW = (galleryWidth - g) / 2;
          const rowH = (galleryHeight - g * 2) / 3;

          for (let i = 0; i < 6; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = p + col * (colW + g);
            const y = topOffset + row * (rowH + g);
            if (loadedImages[i]) {
              drawCoverImage(loadedImages[i]!, x, y, colW, rowH, r);
            }
          }
          break;
        }
        case 'template-6': {
          // Polaroid / Scrapbook Style
          const polaroidW = galleryWidth * 0.62;
          const polaroidH = galleryHeight * 0.48;

          // Background card 1
          if (loadedImages[0]) {
            ctx.save();
            ctx.translate(p + 40, topOffset + 40);
            ctx.rotate(-0.06);
            drawCoverImage(loadedImages[0], 0, 0, polaroidW, polaroidH, 4);
            ctx.restore();
          }

          // Foreground card 2
          if (loadedImages[1]) {
            ctx.save();
            ctx.translate(width - p - polaroidW - 20, topOffset + galleryHeight * 0.42);
            ctx.rotate(0.05);
            drawCoverImage(loadedImages[1], 0, 0, polaroidW, polaroidH, 4);
            ctx.restore();
          }
          break;
        }
      }

      // 5. Draw Bottom Editorial Typography
      const footerY = height - 170;
      ctx.textAlign = 'center';

      // Title
      ctx.fillStyle = page.textColor;
      if (page.fontFamily === 'serif') {
        ctx.font = '600 42px "Playfair Display", Georgia, serif';
        ctx.letterSpacing = '4px';
      } else if (page.fontFamily === 'signature') {
        ctx.font = 'italic 46px "Cormorant Garamond", Georgia, serif';
        ctx.letterSpacing = '2px';
      } else {
        ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
        ctx.letterSpacing = '5px';
      }
      ctx.fillText(page.titleText, width / 2, footerY);

      // Client Name
      ctx.font = '500 28px "Playfair Display", serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(page.clientNameText, width / 2, footerY + 44);

      // Subtitle / Faculty
      ctx.font = '400 18px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillStyle = isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
      ctx.fillText(page.subtitleText, width / 2, footerY + 80);

      // Date badge / Ornaments
      if (page.showOrnaments) {
        ctx.fillStyle = '#f59e0b'; // Gold accent
        ctx.fillText('✦  ' + page.dateText + '  ✦', width / 2, footerY + 115);
      } else {
        ctx.fillText(page.dateText, width / 2, footerY + 115);
      }
    },
    []
  );

  // Redraw canvas whenever current page updates
  useEffect(() => {
    if (canvasRef.current && currentPage) {
      renderCanvas(currentPage, canvasRef.current);
    }
  }, [currentPage, renderCanvas]);

  // Export single page to JPG or PNG
  const handleDownload = (format: 'image/jpeg' | 'image/png') => {
    if (!canvasRef.current) return;
    const ext = format === 'image/jpeg' ? 'jpg' : 'png';
    canvasRef.current.toBlob(blob => {
      if (blob) {
        saveAs(blob, `STORY_${client.code}_${currentPage.title.replace(/\s+/g, '_')}.${ext}`);
      }
    }, format, 0.95);
  };

  // Export all pages bundled in ZIP
  const handleDownloadAllPages = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`KOLASE_STORY_${client.code}`);

      // Temporary offscreen canvas
      const offscreen = document.createElement('canvas');

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        await renderCanvas(page, offscreen);
        const blob = await new Promise<Blob | null>(res => offscreen.toBlob(res, 'image/jpeg', 0.95));
        if (blob) {
          folder?.file(`STORY_PAGE_${i + 1}_${page.title.replace(/\s+/g, '_')}.jpg`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `KOLASE_INSTAGRAM_STORY_${client.code}.zip`);
    } catch (e) {
      console.error('Failed to export all collage pages', e);
    } finally {
      setIsExporting(false);
    }
  };

  // Web Share API for native Instagram Stories / WhatsApp share on mobile
  const handleShare = async () => {
    if (!canvasRef.current) return;
    if (navigator.share) {
      canvasRef.current.toBlob(async blob => {
        if (!blob) return;
        const file = new File([blob], `story_${client.code}.jpg`, { type: 'image/jpeg' });
        try {
          await navigator.share({
            title: `Wisuda Story - ${client.name}`,
            text: `Graduation story portrait by Wisuda by Tanthowi`,
            files: [file],
          });
        } catch (e) {
          console.warn('Share cancelled or not supported', e);
        }
      }, 'image/jpeg', 0.95);
    } else {
      // Fallback
      handleDownload('image/jpeg');
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              1080 x 1920 (9:16)
            </span>
            <span className="text-xs text-neutral-400">Instagram Story & WhatsApp Status</span>
          </div>
          <h2 className="text-xl font-serif-editorial text-white mt-1">
            Studio Kolase Wisuda
          </h2>
          <p className="text-xs text-neutral-400">
            Desain story multi-halaman elegan dengan logo resmi Wisuda by Tanthowi.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSaveDesign}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition flex items-center gap-1.5 border border-neutral-700"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Desain
          </button>
          <button
            onClick={() => handleDownload('image/jpeg')}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition flex items-center gap-1.5 border border-neutral-700"
          >
            <Download className="w-3.5 h-3.5" />
            Download JPG
          </button>
          <button
            onClick={() => handleDownload('image/png')}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition flex items-center gap-1.5 border border-neutral-700"
          >
            <Download className="w-3.5 h-3.5" />
            Download PNG
          </button>
          <button
            onClick={handleDownloadAllPages}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Memproses ZIP...' : `Download Semua (${pages.length} Hal)`}
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition flex items-center gap-1.5 border border-neutral-800"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Story
            </button>
          )}
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          Desain kolase berhasil disimpan ke sistem!
        </div>
      )}

      {/* Page Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800/80">
        {pages.map((p, idx) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer border ${
              activePageIndex === idx
                ? 'bg-neutral-800 text-white border-neutral-600 font-medium'
                : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            onClick={() => setActivePageIndex(idx)}
          >
            <span>Halaman {idx + 1}</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              ({TEMPLATE_CONFIGS.find(t => t.id === p.templateId)?.slots} foto)
            </span>
            {pages.length > 1 && !isClientView && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleDeletePage(idx);
                }}
                className="text-neutral-500 hover:text-red-400 p-0.5"
                title="Hapus Halaman"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {!isClientView && (
          <button
            onClick={handleAddPage}
            className="px-3 py-1.5 rounded-lg text-xs bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-dashed border-neutral-700 transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Halaman
          </button>
        )}
      </div>

      {/* Workspace Grid: Preview on Left, Toolpanel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Story Phone Bezel Simulator (Left) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-full max-w-[340px] aspect-9/16 rounded-[36px] p-3 bg-neutral-950 border-4 border-neutral-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Top Phone Camera Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-neutral-900 rounded-full z-30" />

            {/* Live Canvas Element */}
            <div className="w-full h-full rounded-[26px] overflow-hidden bg-black relative">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-neutral-500 font-mono">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Resolusi Asli Ekspor: 1080 x 1920 piksel</span>
          </div>
        </div>

        {/* Customization Controls (Right) */}
        <div className="lg:col-span-7 space-y-6 bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800">
          {/* Navigation Sub-Tabs */}
          <div className="grid grid-cols-4 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('template')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                activeTab === 'template' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              Template
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                activeTab === 'photos' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Pilih Foto
            </button>
            <button
              onClick={() => setActiveTab('style')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                activeTab === 'style' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Warna & Layout
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                activeTab === 'text' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Teks & Brand
            </button>
          </div>

          {/* TAB 1: TEMPLATE SELECTOR */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Pilih Template Tata Letak (1080 x 1920)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMPLATE_CONFIGS.map(t => {
                  const isSelected = currentPage.templateId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTemplate(t.id)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                        isSelected
                          ? 'bg-neutral-800/90 border-amber-500 shadow-md shadow-amber-500/10'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-xs text-white">{t.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2">{t.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PHOTOS ASSIGNMENT */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Pasang Foto ke Slot Halaman</h3>
                  <p className="text-xs text-neutral-400">
                    Klik salah satu slot di bawah, lalu pilih foto dari galeri klien.
                  </p>
                </div>
              </div>

              {/* Slot Indicator */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {currentPage.photoUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlotIndex(idx)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition ${
                      selectedSlotIndex === idx
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-medium'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>Slot #{idx + 1}</span>
                    {url ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-neutral-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Available photos picker */}
              <div className="space-y-2">
                <span className="text-xs text-neutral-400">Pilih foto untuk Slot #{selectedSlotIndex + 1}:</span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                  {availablePhotos.map(photo => {
                    const src = photo.editedUrl || photo.url;
                    const isAssigned = currentPage.photoUrls.includes(src);
                    return (
                      <div
                        key={photo.id}
                        onClick={() => handleAssignPhotoToSlot(src)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border group ${
                          isAssigned ? 'border-amber-500/80' : 'border-neutral-800 hover:border-neutral-600'
                        }`}
                      >
                        <img src={photo.thumbnailUrl || src} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[9px] font-mono text-white">
                          #{photo.sequenceNumber}
                        </div>
                        {isAssigned && (
                          <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STYLING & BACKGROUND */}
          {activeTab === 'style' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-2">Pilihan Warna Latar Belakang</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {BG_PALETTES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => updateCurrentPage({ backgroundColor: p.value, textColor: p.text })}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col items-center gap-1.5 transition ${
                        currentPage.backgroundColor === p.value
                          ? 'border-amber-400 ring-1 ring-amber-400'
                          : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                      style={{ backgroundColor: p.value }}
                    >
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: p.value }} />
                      <span className="text-[10px] font-medium" style={{ color: p.text }}>
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Padding Frame</span>
                    <span className="text-neutral-500 font-mono">{currentPage.padding}px</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="64"
                    value={currentPage.padding}
                    onChange={e => updateCurrentPage({ padding: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Jarak Foto (Gap)</span>
                    <span className="text-neutral-500 font-mono">{currentPage.gap}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="40"
                    value={currentPage.gap}
                    onChange={e => updateCurrentPage({ gap: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Sudut Melengkung</span>
                    <span className="text-neutral-500 font-mono">{currentPage.borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={currentPage.borderRadius}
                    onChange={e => updateCurrentPage({ borderRadius: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TYPOGRAPHY & BRANDING */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Judul Story</label>
                  <input
                    type="text"
                    value={currentPage.titleText}
                    onChange={e => updateCurrentPage({ titleText: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Nama Klien / Gelar</label>
                  <input
                    type="text"
                    value={currentPage.clientNameText}
                    onChange={e => updateCurrentPage({ clientNameText: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Subjudul / Kampus & Fakultas</label>
                  <input
                    type="text"
                    value={currentPage.subtitleText}
                    onChange={e => updateCurrentPage({ subtitleText: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Tanggal / Tahun Angkatan</label>
                  <input
                    type="text"
                    value={currentPage.dateText}
                    onChange={e => updateCurrentPage({ dateText: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white text-xs focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2 border-t border-neutral-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                  <input
                    type="checkbox"
                    checked={currentPage.showLogo}
                    onChange={e => updateCurrentPage({ showLogo: e.target.checked })}
                    className="accent-amber-400 rounded"
                  />
                  <span>Logo Watermark WISUDA BY TANTHOWI</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                  <input
                    type="checkbox"
                    checked={currentPage.showOrnaments}
                    onChange={e => updateCurrentPage({ showOrnaments: e.target.checked })}
                    className="accent-amber-400 rounded"
                  />
                  <span>Ornamen Minimalis Bintang / Laurel</span>
                </label>
              </div>

              {/* Font Style Selection */}
              <div>
                <label className="text-xs text-neutral-400 block mb-1.5">Gaya Tipografi Judul</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateCurrentPage({ fontFamily: 'serif' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-serif border ${
                      currentPage.fontFamily === 'serif' ? 'bg-neutral-800 text-white border-amber-400' : 'text-neutral-400 border-neutral-800'
                    }`}
                  >
                    Playfair Editorial
                  </button>
                  <button
                    onClick={() => updateCurrentPage({ fontFamily: 'signature' })}
                    className={`px-3 py-1.5 rounded-lg text-xs italic font-serif border ${
                      currentPage.fontFamily === 'signature' ? 'bg-neutral-800 text-white border-amber-400' : 'text-neutral-400 border-neutral-800'
                    }`}
                  >
                    Cormorant Signature
                  </button>
                  <button
                    onClick={() => updateCurrentPage({ fontFamily: 'sans' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-sans uppercase tracking-wider border ${
                      currentPage.fontFamily === 'sans' ? 'bg-neutral-800 text-white border-amber-400' : 'text-neutral-400 border-neutral-800'
                    }`}
                  >
                    Jakarta Sans Clean
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
