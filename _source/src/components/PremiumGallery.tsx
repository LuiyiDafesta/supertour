import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GalleryPhoto } from '../types/database';
import { 
  downloadFileDirectly, 
  downloadPhotosAsZip, 
  downloadPhotosSequentially 
} from '../lib/downloader';
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
  Loader2,
  FolderArchive,
  Layers
} from 'lucide-react';

interface PremiumGalleryProps {
  photos: GalleryPhoto[];
  schoolName: string;
  destination?: string;
}

export const PremiumGallery: React.FC<PremiumGalleryProps> = ({ photos, schoolName, destination }) => {
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
  const [downloadProgress, setDownloadProgress] = useState<{ 
    current: number; 
    total: number; 
    percent: number; 
    label: string; 
    isZip: boolean; 
  } | null>(null);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);
  const [targetBatchPhotos, setTargetBatchPhotos] = useState<GalleryPhoto[]>([]);
  const cancelDownloadRef = useRef<boolean>(false);
  const galleryContainerRef = useRef<HTMLDivElement>(null);

  // Scroll suave al inicio de la galería de fotos al paginar
  const scrollToGallery = () => {
    if (galleryContainerRef.current) {
      const topOffset = galleryContainerRef.current.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    } else {
      const section = document.getElementById('seccion-fotos') || document.getElementById('galeria-fotos-container');
      if (section) {
        const topOffset = section.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
      }
    }
  };

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

  // Open batch options modal or trigger direct single download
  const handleOpenDownloadOptions = (targetPhotos: GalleryPhoto[]) => {
    if (targetPhotos.length === 0) return;
    if (targetPhotos.length === 1) {
      const p = targetPhotos[0];
      downloadFileDirectly(p.url_hd || p.url_web, `SuperTour-${schoolName}-Foto.jpg`);
      toast.success('Iniciando descarga de la foto...');
      return;
    }
    setTargetBatchPhotos(targetPhotos);
    setDownloadModalOpen(true);
  };

  // ZIP batch download engine (Zero browser blocker, single reliable file)
  const startZipDownload = async (targetPhotos: GalleryPhoto[]) => {
    if (targetPhotos.length === 0) return;
    setDownloadModalOpen(false);
    setIsDownloading(true);
    cancelDownloadRef.current = false;

    setDownloadProgress({
      current: 0,
      total: targetPhotos.length,
      percent: 0,
      label: 'Preparando descarga...',
      isZip: true
    });

    toast.info(`Preparando archivo ZIP con ${targetPhotos.length} fotos...`);

    const items = targetPhotos.map((p, idx) => ({
      url: p.url_hd || p.url_web,
      filename: `SuperTour-${schoolName}-${idx + 1}.jpg`
    }));

    const sanitizedSchool = schoolName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const zipName = `SuperTour-${sanitizedSchool}-Fotos.zip`;

    try {
      const result = await downloadPhotosAsZip(
        items,
        zipName,
        (info) => {
          setDownloadProgress({
            current: info.current,
            total: info.total,
            percent: info.percent,
            label: info.stage === 'fetching'
              ? `Descargando foto ${info.current} de ${info.total}...`
              : 'Empaquetando archivo ZIP...',
            isZip: true
          });
        },
        () => cancelDownloadRef.current
      );

      if (result.success && !cancelDownloadRef.current) {
        toast.success(`¡Descarga lista! Se guardó el archivo ${zipName} con ${result.count} fotos.`);
        trackEvent({
          event_type: 'photo_download',
          school_id: targetPhotos[0]?.school_id,
          destination: destination || undefined,
          metadata: { count: result.count, type: 'zip' }
        });
      } else if (cancelDownloadRef.current) {
        toast.warning('Descarga de archivo ZIP cancelada.');
      }
    } catch (err) {
      if (!cancelDownloadRef.current) {
        console.error('Error al generar ZIP:', err);
        toast.error('Ocurrió un error al preparar el archivo ZIP.');
      }
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  // Sequential 1-by-1 download engine (controlled queue)
  const startSequentialDownload = async (targetPhotos: GalleryPhoto[]) => {
    if (targetPhotos.length === 0) return;
    setDownloadModalOpen(false);
    setIsDownloading(true);
    cancelDownloadRef.current = false;

    setDownloadProgress({
      current: 0,
      total: targetPhotos.length,
      percent: 0,
      label: 'Iniciando descargas en cola...',
      isZip: false
    });

    toast.info('Descargando fotos 1 por 1. Si tu navegador lo solicita, hacé clic en "Permitir descargas múltiples".');

    const items = targetPhotos.map((p, idx) => ({
      url: p.url_hd || p.url_web,
      filename: `SuperTour-${schoolName}-${idx + 1}.jpg`
    }));

    try {
      const result = await downloadPhotosSequentially(
        items,
        900,
        (current, total) => {
          setDownloadProgress({
            current,
            total,
            percent: Math.round((current / total) * 100),
            label: `Descargando foto ${current} de ${total}...`,
            isZip: false
          });
          trackEvent({
            event_type: 'photo_download',
            school_id: targetPhotos[current - 1]?.school_id,
            destination: destination || undefined,
            metadata: { photo_id: targetPhotos[current - 1]?.id, batch: 'sequential' }
          });
        },
        () => cancelDownloadRef.current
      );

      if (result.success && !cancelDownloadRef.current) {
        toast.success(`¡Descarga finalizada! Se guardaron ${result.count} fotos.`);
      } else if (cancelDownloadRef.current) {
        toast.warning('Descarga en cola cancelada.');
      }
    } catch (err) {
      console.error('Error en descarga secuencial:', err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDownloadSelected = () => {
    const selected = photos.filter(p => selectedPhotoIds.has(p.id));
    handleOpenDownloadOptions(selected);
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
    <div ref={galleryContainerRef} id="galeria-fotos-container" className="w-full py-12 select-none">
      {/* Gallery Controls (Batch Actions & Grid column switches) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-900">
        {/* Left: Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Button: Descargar Todas las Fotos */}
          <button
            type="button"
            disabled={isDownloading || totalPhotos === 0}
            onClick={() => handleOpenDownloadOptions(photos)}
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
                        destination: destination || undefined,
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
                                destination: destination || undefined,
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

              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 max-w-full">
                {/* Prev Button */}
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      scrollToGallery();
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
                        scrollToGallery();
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
                      scrollToGallery();
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
            <span className="text-xs font-black uppercase text-white flex items-center gap-2 truncate">
              {downloadProgress.isZip ? (
                <FolderArchive size={14} className="text-primary animate-pulse flex-shrink-0" />
              ) : (
                <Download size={14} className="text-primary animate-bounce flex-shrink-0" />
              )}
              <span className="truncate">
                {downloadProgress.isZip ? 'Preparando ZIP' : 'Descargando'}
              </span>
            </span>
            <span className="text-xs font-mono font-bold text-primary flex-shrink-0">
              {downloadProgress.current} / {downloadProgress.total}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mb-2 truncate">
            {downloadProgress.label}
          </p>
          <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden mb-3">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.max(5, downloadProgress.percent)}%` }}
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

      {/* MODAL DE OPCIONES DE DESCARGA EN PORTAL */}
      {downloadModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
          onClick={() => setDownloadModalOpen(false)}
        >
          <div
            className="relative max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
                  <Sparkles size={11} /> Descarga Múltiple
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                  Descargar {targetBatchPhotos.length} Fotos
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  {schoolName} • Elegí cómo preferís descargar tus recuerdos:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDownloadModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Opciones */}
            <div className="space-y-3.5">
              {/* Opción 1: ZIP (Recomendado) */}
              <div 
                onClick={() => startZipDownload(targetBatchPhotos)}
                className="group p-4 sm:p-5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border-2 border-primary/50 hover:border-primary transition-all duration-300 cursor-pointer shadow-lg relative overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0 text-primary glow-yellow group-hover:scale-105 transition-transform">
                    <FolderArchive size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black uppercase text-white tracking-tight">
                        Archivo ZIP Completo
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary text-black font-black text-[9px] uppercase tracking-wider">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                      Un solo archivo <strong className="text-zinc-200">.zip</strong> con todas las {targetBatchPhotos.length} fotos en máxima resolución. Evita bloqueos del navegador y es compatible con celulares y PC.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-widest transition-all glow-yellow flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  Descargar Paquete ZIP ({targetBatchPhotos.length} fotos)
                </button>
              </div>

              {/* Opción 2: Fotos Individuales en Cola */}
              <div
                onClick={() => startSequentialDownload(targetBatchPhotos)}
                className="group p-4 sm:p-5 rounded-2xl bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center flex-shrink-0 text-zinc-300 group-hover:text-white transition-colors">
                    <Layers size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black uppercase text-white tracking-tight">
                        Fotos Individuales (En cola)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                      Guarda cada foto como archivo .jpg separado en tu carpeta de descargas. Si tu navegador muestra un aviso de descargas múltiples, asegurate de hacer clic en <strong className="text-zinc-200">Permitir</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  Descargar Una por Una
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 text-center">
              Podés detener la descarga en cualquier momento desde el indicador inferior.
            </p>
          </div>
        </div>,
        document.body
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
                  destination: destination || undefined,
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
