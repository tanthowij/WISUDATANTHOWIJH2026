/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Columns2, Sliders, Sparkles } from 'lucide-react';

interface BeforeAfterSliderProps {
  originalUrl: string;
  editedUrl: string;
  originalLabel?: string;
  editedLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalUrl,
  editedUrl,
  originalLabel = 'ORIGINAL (RAW)',
  editedLabel = 'EDITED (FINAL)',
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'slider' | 'sideBySide'>('slider');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleInteractionStart = (clientX: number) => {
    setIsDragging(true);
    handleMove(clientX);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Controls */}
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium tracking-wide">Perbandingan Kualitas Studio</span>
        </div>
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-md">
          <button
            onClick={() => setViewMode('slider')}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              viewMode === 'slider' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            Slider Interaktif
          </button>
          <button
            onClick={() => setViewMode('sideBySide')}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              viewMode === 'sideBySide' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Columns2 className="w-3 h-3" />
            Berdampingan
          </button>
        </div>
      </div>

      {viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-black aspect-4/5">
            <img src={originalUrl} alt="Original" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-neutral-300 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-neutral-700">
              {originalLabel}
            </div>
          </div>
          <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-black aspect-4/5">
            <img src={editedUrl} alt="Edited" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-md text-black font-semibold text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded">
              {editedLabel}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          onMouseDown={e => handleInteractionStart(e.clientX)}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={e => handleInteractionStart(e.touches[0].clientX)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
          className="relative w-full aspect-4/5 md:aspect-3/2 max-h-[560px] rounded-lg overflow-hidden select-none cursor-ew-resize border border-neutral-800 bg-black shadow-2xl"
        >
          {/* Edited Image (Base Layer - Right) */}
          <img
            src={editedUrl}
            alt="Edited Photo"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* Original Image (Clipped Layer - Left) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={originalUrl}
              alt="Original Photo"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none max-w-none"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                height: '100%',
              }}
            />
          </div>

          {/* Split Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] pointer-events-none z-10"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg border-2 border-neutral-900 pointer-events-auto cursor-grab active:cursor-grabbing">
              <Sliders className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 pointer-events-none bg-black/75 backdrop-blur-md text-white text-[11px] font-mono tracking-wider px-2.5 py-1 rounded border border-white/10 z-20">
            {originalLabel}
          </div>
          <div className="absolute top-3 right-3 pointer-events-none bg-neutral-950/85 backdrop-blur-md text-amber-300 text-[11px] font-mono tracking-wider px-2.5 py-1 rounded border border-amber-500/30 z-20">
            {editedLabel}
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-black/60 backdrop-blur-sm text-neutral-300 text-[10px] px-3 py-1 rounded-full border border-white/5">
            Geser slider ke kiri / kanan untuk membandingkan
          </div>
        </div>
      )}
    </div>
  );
};
