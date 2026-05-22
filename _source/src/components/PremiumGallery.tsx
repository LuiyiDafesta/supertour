import React, { useState, useEffect } from 'react';
import { GalleryPhoto } from '../types/database';
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
  Layers
} from 'lucide-react';

interface PremiumGalleryProps {
  photos: GalleryPhoto[];
  schoolName: string;
}

export const PremiumGallery: React.FC<PremiumGalleryProps> = ({ photos, schoolName }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [columnCount, setColumnCount] = useState<number>(3); // Default 3 columns
  const [filteredPhotos, setFilteredPhotos] = useState<GalleryPhoto[]>(photos);
  
  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  // Sync / Filter photos
  useEffect(() => {
    if (activeCategory === 'Todos') {
      setFilteredPhotos(photos);
    } else {
      setFilteredPhotos(photos.filter(photo => photo.category === activeCategory));
    }
  }, [activeCategory, photos]);

  const categories = ['Todos', 'Grupal', 'Excursiones', 'Fiestas', 'Actividades'];

  // Handle Lightbox Navigation
  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null) return;
    setIsZoomed(false);
    setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null) return;
    setIsZoomed(false);
    setLightboxIndex(prev => (prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0));
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
  }, [lightboxIndex, filteredPhotos]);

  // Copy photo link
  const copyPhotoLink = async (photoUrl: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(photoUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Could not copy text: ', err);
    }
  };

  // Share via WhatsApp
  const shareOnWhatsApp = (photoUrl: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const text = encodeURIComponent(`¡Mirá esta foto del viaje de egresados de ${schoolName}! Descargala acá: ` + photoUrl);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
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
      {/* Gallery Controls (Category Filters & Grid column switches) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 pb-6 border-b border-zinc-900">
        
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 md:pb-0 scrollbar-none max-w-full">
          <Layers size={16} className="text-zinc-500 mr-1 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex-shrink-0 ${
                activeCategory === cat
                  ? 'bg-primary text-black font-black shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                  : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/80 hover:bg-zinc-900 hover:text-white hover:border-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View toggles (Columns count selector) */}
        <div className="hidden sm:flex items-center gap-3 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60">
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

      {/* Empty State */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-20 px-6 border border-zinc-900 bg-zinc-950/20 rounded-2xl">
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">
            No hay fotos en esta categoría actualmente.
          </p>
        </div>
      ) : (
        /* Dynamic Grid Layout */
        <div className={`grid ${getGridColsClass()} gap-6 transition-all duration-500`}>
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => setLightboxIndex(index)}
              className="group relative aspect-square bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-900 cursor-zoom-in shadow-md hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] hover:border-primary/20 transition-all duration-300"
            >
              {/* Blur-up wrapper */}
              <img
                src={photo.url_web}
                alt={`${schoolName} - ${photo.category}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Hover Dark Overlay Shield */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4" style={{ pointerEvents: 'auto' }}>
                
                {/* Top card bar (Category badge) */}
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-black bg-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider glow-yellow font-outfit">
                    {photo.category}
                  </span>
                  
                  {/* Share action floating button */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => copyPhotoLink(photo.url_hd, photo.id, e)}
                      className="p-1.5 rounded-md bg-zinc-950/60 hover:bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700 transition-all"
                      title="Copiar Enlace HD"
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
                    Foto {index + 1}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={photo.url_hd}
                      download={`SuperTour-${schoolName}-${index + 1}.jpg`}
                      onClick={(e) => e.stopPropagation()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-black text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                    >
                      <Download size={10} />
                      Descargar HD
                    </a>
                    <div className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 text-white border border-zinc-800 transition-colors">
                      <Maximize2 size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL-SCREEN PREMIUM LIGHTBOX */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md select-none transition-all duration-300"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close trigger */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 z-[110] p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all shadow-lg"
          >
            <X size={20} />
          </button>

          {/* Action header bar */}
          <div 
            className="absolute top-6 left-6 z-[110] hidden sm:flex items-center gap-3 bg-zinc-900/80 border border-zinc-800/80 px-4 py-2 rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {schoolName} • Foto {lightboxIndex + 1} de {filteredPhotos.length}
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {filteredPhotos[lightboxIndex].category}
            </span>
          </div>

          {/* Controls Overlay bar */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 bg-zinc-900/90 border border-zinc-800/80 p-2.5 rounded-full shadow-2xl"
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
              onClick={(e) => copyPhotoLink(filteredPhotos[lightboxIndex].url_hd, 'lightbox-copy', e)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950/60 hover:bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              {copiedId === 'lightbox-copy' ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
              <span>Enlace</span>
            </button>

            <button
              onClick={(e) => shareOnWhatsApp(filteredPhotos[lightboxIndex].url_hd, e)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950/60 hover:bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Share2 size={12} />
              <span>WhatsApp</span>
            </button>
            <div className="w-[1px] h-5 bg-zinc-800" />

            {/* Download HD trigger */}
            <a
              href={filteredPhotos[lightboxIndex].url_hd}
              download={`SuperTour-${schoolName}-${lightboxIndex + 1}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-black text-xs font-black uppercase tracking-wider transition-all glow-yellow"
            >
              <Download size={12} />
              Descargar HD
            </a>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-4 sm:left-8 z-[110] p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button
            onClick={handleNext}
            className="absolute right-4 sm:right-8 z-[110] p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-all"
          >
            <ChevronRight size={24} />
          </button>

          {/* Large Image container with dynamic scale for zoom */}
          <div
            className="w-full h-full flex items-center justify-center p-4 max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={filteredPhotos[lightboxIndex].url_hd}
              alt={`${schoolName} - Lightbox`}
              className={`max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
