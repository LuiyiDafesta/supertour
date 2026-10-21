import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GalleryPhoto } from '../types/database';
import { downloadFileDirectly } from '../lib/downloader';
import { trackEvent } from '../lib/analytics';
import { toCdnUrl } from '../lib/cdn';
import { toast } from 'sonner';
import { 
  Download, 
  Share2, 
  Maximize2, 
  Columns, 
  Grid2X2, 
  Grid3X3, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  Copy,
  Sparkles,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';

interface PremiumGalleryProps {
  photos: GalleryPhoto[];
  schoolName: string;
}

export const PremiumGallery: React.FC<PremiumGalleryProps> = ({ photos, schoolName }) => {
  const [columnCount, setColumnCount] = useState<number>(3); // Default 3 columns
  
  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const photosPerPage = 24; // 24 photos per page

  // Multi-selection & Batch Download State
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const cancelDownloadRef = useRef<boolean>(false);

  // Reset page and selection when photo array changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedPhotoIds(new Set());
    setLightboxIndex(null);
  }, [photos]);

  const totalPhotos = photos.length;
  const totalPages = Math.ceil(totalPhotos / photosPerPage);
  const indexOfLastPhoto = currentPage * photosPerPage;
  const indexOfFirstPhoto = indexOfLastPhoto - photosPerPage;
  const currentPhotos = photos.slice(indexOfFirstPhoto, indexOfLastPhoto);

  // Handle Lightbox Navigation
  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null) return;
    setIsZoomed(false);
    setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null) return;
    setIsZoomed(false);
    setLightboxIndex(prev => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos]);

  // Copy photo link
  const copyPhotoLink = async (photoUrl: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const finalUrl = toCdnUrl(photoUrl);
      await navigator.clipboard.writeText(finalUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Could not copy text: ', err);
    }
  };

  // Share via WhatsApp
  const shareOnWhatsApp = (photoUrl: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const finalUrl = toCdnUrl(photoUrl);
    const text = encodeURIComponent(`¡Mirá esta foto del viaje de egresados de ${schoolName}! Descargala acá: ` + finalUrl);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };

  // Selection handlers
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedPhotoIds(new Set());
    } else {
      setSelectionMode(true);
    }
  };

  const togglePhotoSelection = (photoId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSelectCurrentPage = () => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      currentPhotos.forEach(p => next.add(p.id));
      return next;
    });
    toast.info(`${currentPhotos.length} fotos de esta página añadidas a la selección.`);
  };

  const handleSelectAll = () => {
    const next = new Set<string>();
    photos.forEach(p => next.add(p.id));
    setSelectedPhotoIds(next);
    toast.info(`Todas las ${photos.length} fotos del grupo seleccionadas.`);
  };

  const handleDeselectAll = () => {
    setSelectedPhotoIds(new Set());
  };

  // Sequential batch download engine
  const handleDownloadMultiple = async (targetPhotos: GalleryPhoto[], batchTitle: string) => {
    if (targetPhotos.length === 0) return;
    setIsDownloading(true);
    cancelDownloadRef.current = false;
    setDownloadProgress({ current: 0, total: targetPhotos.length });

    toast.info(`Iniciando descarga secuencial de ${targetPhotos.length} fotos...`);

    let count = 0;
    for (let i = 0; i < targetPhotos.length; i++) {
      if (cancelDownloadRef.current) {
        toast.warning('Descarga en lote cancelada.');
        break;
      }
      const photo = targetPhotos[i];
      const filename = `SuperTour-${schoolName}-${i + 1}.jpg`;
      const url = photo.url_hd || photo.url_web;

      try {
        await downloadFileDirectly(url, filename);
        count++;
        setDownloadProgress({ current: count, total: targetPhotos.length });
        trackEvent({
          event_type: 'photo_download',
          school_id: photo.school_id,
          metadata: { photo_id: photo.id, batch: batchTitle }
        });
      } catch (err) {
        console.error(`Error al descargar foto ${i + 1}:`, err);
      }

      // Small delay between downloads so the browser creates files without pop-up blocking
      if (i < targetPhotos.length - 1) {
        await new Promise(r => setTimeout(r, 350));
      }
    }

    if (!cancelDownloadRef.current) {
      toast.success(`¡Descarga finalizada! Se guardaron ${count} fotos.`);
    }

    setIsDownloading(false);
    setDownloadProgress(null);
  };

  const handleDownloadSelected = () => {
    const selected = photos.filter(p => selectedPhotoIds.has(p.id));
    handleDownloadMultiple(selected, 'seleccionadas');
  };

  // Return tailwind grid column classes based on count
  const getGridColsClass = () => {
    switch (columnCount) {
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 4: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 5: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
      case 3:
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    }
  };

  return (
    <div className="w-full py-12 select-none">
      {/* Gallery Controls (Batch Actions & Grid column switches) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-900">
        {/* Left: Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Button: Descargar Todas las Fotos */}
          <button
            type="button"
            disabled={isDownloading || totalPhotos === 0}
            onClick={() => handleDownloadMultiple(photos, `todas-${totalPhotos}`)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 hover:border-zinc-700 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            title="Descargar todas las fotos del viaje (no sólo las de esta página)"
          >
            <Download size={14} className="text-primary" />
            <span>Descargar Todas ({totalPhotos})</span>
          </button>

          {/* Toggle: Modo Selección */}
          <button
            type="button"
            onClick={toggleSelectionMode}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all border ${
              selectionMode 
                ? 'bg-primary text-black border-primary glow-yellow' 
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
            }`}
          >
            {selectionMode ? <X size={14} /> : <CheckSquare size={14} />}
            <span>{selectionMode ? 'Cerrar Selección' : 'Seleccionar Fotos'}</span>
          </button>
        </div>

        {/* Right: View toggles (Columns count selector) */}
        <div className="hidden sm:flex items-center gap-3 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 self-end sm:self-auto">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2.5">Columnas</span>
          <button
            onClick={() => setColumnCount(2)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              columnCount === 2 ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'
            }`}
            title="Ver en 2 columnas"
          >
            <Grid2X2 size={16} />
          </button>
          <button
            onClick={() => setColumnCount(3)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              columnCount === 3 ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'
            }`}
            title="Ver en 3 columnas"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setColumnCount(4)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              columnCount === 4 ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'
            }`}
            title="Ver en 4 columnas"
          >
            <Columns size={16} className="rotate-90" />
          </button>
          <button
            onClick={() => setColumnCount(5)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              columnCount === 5 ? 'bg-primary text-black' : 'text-zinc-400 hover:text-white'
            }`}
            title="Ver en 5 columnas"
          >
            <Columns size={16} />
          </button>
        </div>
      </div>

      {/* Sub-bar active during selection mode */}
      {selectionMode && (
        <div className="mb-8 p-4 rounded-2xl bg-zinc-950/90 border border-primary/40 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in shadow-xl">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <span className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-black text-xs uppercase tracking-wider">
              {selectedPhotoIds.size} de {totalPhotos} seleccionadas
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectCurrentPage}
                className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase transition-colors"
              >
                Página Actual ({currentPhotos.length})
              </button>
              <span className="text-zinc-600">•</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase transition-colors"
              >
                Todas ({totalPhotos})
              </button>
              <span className="text-zinc-600">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={selectedPhotoIds.size === 0 || isDownloading}
            onClick={handleDownloadSelected}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-widest transition-all glow-yellow disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <Download size={14} />
            <span>Descargar Seleccionadas ({selectedPhotoIds.size})</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 ? (
        <div className="text-center py-20 px-6 border border-zinc-900 bg-zinc-950/20 rounded-2xl">
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">
            No hay fotos en esta galería actualmente.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Dynamic Grid Layout */}
          <div className={`grid ${getGridColsClass()} gap-6 transition-all duration-500`}>
            {currentPhotos.map((photo) => {
              const originalIndex = photos.findIndex((p) => p.id === photo.id);
              const isSelected = selectedPhotoIds.has(photo.id);

              return (
                <div
                  key={photo.id}
                  onClick={(e) => {
                    if (selectionMode) {
                      togglePhotoSelection(photo.id, e);
                    } else {
                      setLightboxIndex(originalIndex);
                      trackEvent({
                        event_type: 'photo_click',
                        school_id: photo.school_id,
                        metadata: { photo_id: photo.id }
                      });
                    }
                  }}
                  className={`group relative aspect-square bg-zinc-900/50 rounded-xl overflow-hidden border transition-all duration-300 shadow-md ${
                    selectionMode 
                      ? (isSelected ? 'border-primary ring-2 ring-primary/60 scale-[0.98]' : 'border-zinc-800 opacity-80 hover:opacity-100 hover:border-zinc-600')
                      : 'border-zinc-900 cursor-zoom-in hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] hover:border-primary/20'
                  }`}
                >
                  {/* Selection Mode Checkbox Badge */}
                  {selectionMode && (
                    <div className="absolute top-3 left-3 z-30">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected 
                          ? 'bg-primary border-primary text-black shadow-lg shadow-primary/30' 
                          : 'bg-black/70 border-zinc-500 text-transparent backdrop-blur-sm group-hover:border-white'
                      }`}>
                        <Check size={14} strokeWidth={3} className={isSelected ? 'block' : 'opacity-0'} />
                      </div>
                    </div>
                  )}

                  {/* Image element */}
                  <img
                    src={toCdnUrl(photo.url_web)}
                    alt={`${schoolName} - Recuerdos`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Hover Dark Overlay Shield (only when not in selection mode) */}
                  {!selectionMode && (
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4" style={{ pointerEvents: 'auto' }}>
                      
                      {/* Top card bar (Brand watermark) */}
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black text-black bg-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider glow-yellow font-outfit">
                          SuperTour
                        </span>
                        
                        {/* Share action floating button */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => copyPhotoLink(photo.url_hd, photo.id, e)}
                            className="p-1.5 rounded-md bg-zinc-950/60 hover:bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700 transition-all"
                            title="Copiar Enlace"
                          >
                            {copiedId === photo.id ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                          </button>
                          <button
                            onClick={(e) => shareOnWhatsApp(photo.url_hd, e)}
                            className="p-1.5 rounded-md bg-zinc-950/60 hover:bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700 transition-all"
                            title="Compartir WhatsApp"
                          >
                            <Share2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom card bar (Expand / Download triggers) */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          Foto {originalIndex + 1}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFileDirectly(photo.url_hd, `SuperTour-${schoolName}-${originalIndex + 1}.jpg`);
                              trackEvent({
                                event_type: 'photo_download',
                                school_id: photo.school_id,
                                metadata: { photo_id: photo.id, size: 'HD' }
                              });
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-black text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                          >
                            <Download size={10} />
                            Descargar
                          </button>
                          <div className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 text-white border border-zinc-800 transition-colors">
                            <Maximize2 size={12} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Premium Gallery Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 mt-6 border-t border-zinc-900 select-none">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                Mostrando {indexOfFirstPhoto + 1} - {Math.min(indexOfLastPhoto, totalPhotos)} de {totalPhotos} recuerdos
              </span>

              <div className="flex items-center gap-1.5">
                {/* Prev Button */}
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      window.scrollTo({ top: document.getElementById('destinos')?.offsetTop || 350, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-20 disabled:hover:bg-zinc-900 text-white border border-zinc-850 hover:border-zinc-700 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isActive = currentPage === pageNum;

                  return (
                    <button
                      key={`gallery-page-${pageNum}`}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: document.getElementById('destinos')?.offsetTop || 350, behavior: 'smooth' });
                      }}
                      className={`w-9.5 h-9.5 rounded-xl text-xs font-black uppercase transition-all tracking-wider ${
                        isActive
                          ? 'bg-primary text-black border border-primary glow-yellow'
                          : 'bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      window.scrollTo({ top: document.getElementById('destinos')?.offsetTop || 350, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-20 disabled:hover:bg-zinc-900 text-white border border-zinc-850 hover:border-zinc-700 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FLOATING BATCH DOWNLOAD PROGRESS BAR */}
      {downloadProgress && (
        <div className="fixed bottom-6 right-6 z-[120] bg-zinc-950/95 border border-primary/40 p-4 rounded-2xl shadow-2xl backdrop-blur-md max-w-xs w-full animate-fade-in select-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-white flex items-center gap-2">
              <Download size={14} className="text-primary animate-bounce" />
              Descargando fotos
            </span>
            <span className="text-xs font-mono font-bold text-primary">
              {downloadProgress.current} / {downloadProgress.total}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden mb-3">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round((downloadProgress.current / downloadProgress.total) * 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => { cancelDownloadRef.current = true; }}
            className="w-full py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            Detener Descarga
          </button>
        </div>
      )}

      {/* FULL-SCREEN PREMIUM LIGHTBOX VIA PORTAL (ABOVE FIXED NAVBAR) */}
      {lightboxIndex !== null && photos[lightboxIndex] && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md select-none transition-all duration-300"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close trigger - elevated above any layout element */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 sm:top-6 sm:right-6 z-[100000] p-3 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 transition-all shadow-2xl active:scale-95 glow-yellow"
            title="Cerrar vista completa"
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>

          {/* Action header bar */}
          <div 
            className="absolute top-5 left-5 sm:top-6 sm:left-6 z-[100000] hidden sm:flex items-center gap-3 bg-zinc-900/80 border border-zinc-800/80 px-4 py-2 rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {schoolName} • Foto {lightboxIndex + 1} de {photos.length}
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> SuperTour
            </span>
          </div>

          {/* Controls Overlay bar */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100000] flex items-center gap-3 bg-zinc-900/90 border border-zinc-800/80 p-2.5 rounded-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Zoom toggles */}
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2.5 rounded-full bg-zinc-950/60 hover:bg-zinc-900 text-white transition-all"
              title="Zoom"
            >
              {isZoomed ? <ZoomOut size={16} className="text-primary" /> : <ZoomIn size={16} />}
            </button>
            <div className="w-[1px] h-5 bg-zinc-800" />

            {/* Share action */}
            <button
              onClick={(e) => copyPhotoLink(photos[lightboxIndex].url_hd, 'lightbox-copy', e)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950/60 hover:bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              {copiedId === 'lightbox-copy' ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
              <span>Enlace</span>
            </button>

            <button
              onClick={(e) => shareOnWhatsApp(photos[lightboxIndex].url_hd, e)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950/60 hover:bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Share2 size={12} />
              <span>WhatsApp</span>
            </button>
            <div className="w-[1px] h-5 bg-zinc-800" />

            {/* Download HD trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadFileDirectly(photos[lightboxIndex].url_hd, `SuperTour-${schoolName}-${lightboxIndex + 1}.jpg`);
                trackEvent({
                  event_type: 'photo_download',
                  school_id: photos[lightboxIndex].school_id,
                  metadata: { photo_id: photos[lightboxIndex].id, size: 'HD', context: 'lightbox' }
                });
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-black text-xs font-black uppercase tracking-wider transition-all glow-yellow"
            >
              <Download size={12} />
              Descargar Foto
            </button>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-4 sm:left-8 z-[100000] p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button
            onClick={handleNext}
            className="absolute right-4 sm:left-auto sm:right-8 z-[100000] p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-all"
          >
            <ChevronRight size={24} />
          </button>

          {/* Large Image container with dynamic scale for zoom */}
          <div
            className="w-full h-full flex items-center justify-center p-4 max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={toCdnUrl(photos[lightboxIndex].url_hd)}
              alt={`${schoolName} - Lightbox`}
              className={`max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
