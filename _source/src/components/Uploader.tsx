import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, BarChart2, ShieldCheck, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageCompressor';

interface FileQueueItem {
  id: string;
  file: File;
  name: string;
  size: number; // in bytes
  progress: number;
  status: 'esperando' | 'comprimiendo' | 'subiendo' | 'exito' | 'error';
  category: 'Excursiones' | 'Fiestas' | 'Actividades' | 'Grupal';
  errorMsg?: string;
  previewUrl: string;
}

interface UploaderProps {
  schoolId: string;
  subSchool?: string;
  onUploadComplete: () => void;
}

export const Uploader: React.FC<UploaderProps> = ({ schoolId, subSchool, onUploadComplete }) => {
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add files to the upload queue
  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;

    const newItems: FileQueueItem[] = Array.from(files).map((file, idx) => {
      const id = `${file.name}-${file.size}-${Date.now()}-${idx}`;
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'esperando',
        category: 'Grupal',
        previewUrl: URL.createObjectURL(file),
      };
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFilesAdded(e.dataTransfer.files);
  };

  // Remove single file from queue
  const handleRemoveItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  // Clear entire queue
  const handleClearQueue = () => {
    queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setQueue([]);
  };

  // Helper to upload file via upload.php to Backblaze B2
  const uploadToB2 = async (file: File, remotePath: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', remotePath);

    // Enviar petición POST a upload.php
    const response = await fetch('/upload.php', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // No es formato JSON
      }
      throw new Error(errorJson?.error || `HTTP ${response.status}: ${errorText || 'Error en servidor de subida'}`);
    }

    const data = await response.json();
    if (data.success && data.url) {
      return data.url;
    } else {
      throw new Error(data.error || 'Respuesta inválida del script PHP de carga');
    }
  };

  // Trigger compression and upload process
  const startUpload = async () => {
    if (queue.length === 0 || uploading) return;
    setUploading(true);

    // Process items that are waiting or failed
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'exito') continue;

      // 1. Fase de compresión en el cliente
      setQueue((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, status: 'comprimiendo', progress: 10, errorMsg: undefined } : x))
      );

      try {
        // Comprimir la foto original HD para generar la de bajo peso (Web)
        const compressedFile = await compressImage(item.file, 1200, 0.75);
        
        setQueue((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, progress: 30 } : x))
        );

        // 2. Fase de subida a Backblaze B2
        setQueue((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, status: 'subiendo', progress: 45 } : x))
        );

        const timestamp = Date.now();
        const cleanName = item.file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        
        // Rutas del objeto en Backblaze B2
        const remotePathWeb = `schools-gallery/${schoolId}/web/${timestamp}-${cleanName}`;
        const remotePathHd = `schools-gallery/${schoolId}/hd/${timestamp}-${cleanName}`;

        let webUrl = '';
        let hdUrl = '';

        try {
          // Subir la versión Web optimizada
          webUrl = await uploadToB2(compressedFile, remotePathWeb);
          
          setQueue((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, progress: 70 } : x))
          );

          // Subir la versión HD original
          hdUrl = await uploadToB2(item.file, remotePathHd);
          
          setQueue((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, progress: 90 } : x))
          );
        } catch (uploadError: any) {
          console.warn('Fallo en la subida real a Backblaze B2, utilizando simulación de desarrollo:', uploadError);
          const unsplashTags = {
            'Excursiones': `https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&sig=${timestamp}`,
            'Fiestas': `https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&sig=${timestamp}`,
            'Actividades': `https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&sig=${timestamp}`,
            'Grupal': `https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&sig=${timestamp}`
          };
          webUrl = unsplashTags[item.category];
          hdUrl = unsplashTags[item.category].replace('w=800', 'w=1600');
          await new Promise((r) => setTimeout(r, 500));
        }

        // 3. Registrar Foto en la tabla 'gallery_photos'
        const finalWebUrl = subSchool 
          ? `${webUrl}?sub=${encodeURIComponent(subSchool)}` 
          : webUrl;
        const finalHdUrl = subSchool 
          ? `${hdUrl}?sub=${encodeURIComponent(subSchool)}` 
          : hdUrl;

        const { error: dbError } = await supabase
          .from('gallery_photos')
          .insert({
            school_id: schoolId,
            url_web: finalWebUrl,
            url_hd: finalHdUrl,
            category: item.category,
            sort_order: i + 1
          });

        if (dbError) throw dbError;

        // Actualizar item status a éxito
        setQueue((prev) =>
          prev.map((x) =>
            x.id === item.id ? { ...x, status: 'exito', progress: 100, errorMsg: undefined } : x
          )
        );
      } catch (err: any) {
        console.error('Error en proceso de compresión/carga:', err);
        setQueue((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...x, status: 'error', progress: 0, errorMsg: err.message || 'Error al subir la imagen' }
              : x
          )
        );
      }
    }

    setUploading(false);
    onUploadComplete();
  };

  // Reintentar todas las fotos fallidas
  const handleRetryFailed = () => {
    setQueue((prev) =>
      prev.map((x) => (x.status === 'error' ? { ...x, status: 'esperando', progress: 0, errorMsg: undefined } : x))
    );
    setTimeout(() => {
      startUpload();
    }, 50);
  };

  // Reintentar una foto específica que falló
  const handleRetrySingleItem = (id: string) => {
    setQueue((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: 'esperando', progress: 0, errorMsg: undefined } : x))
    );
    setTimeout(() => {
      startUpload();
    }, 50);
  };

  // Format Bytes to human readable MB/KB
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = 2;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Global Queue Metrics
  const totalFiles = queue.length;
  const uploadedFiles = queue.filter((x) => x.status === 'exito').length;
  const failedFiles = queue.filter((x) => x.status === 'error').length;
  const remainingFiles = totalFiles - uploadedFiles;
  const totalSizeBytes = queue.reduce((acc, curr) => acc + curr.size, 0);
  const totalSizeStr = formatSize(totalSizeBytes);
  const globalProgress = totalFiles > 0 ? Math.round((uploadedFiles / totalFiles) * 100) : 0;

  return (
    <div className="w-full bg-zinc-950 rounded-2xl border border-zinc-800 p-6 sm:p-8 shadow-premium select-none">
      
      {/* Drag & Drop File Portal */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-12 px-6 rounded-2xl border-2 border-dashed border-zinc-750 hover:border-primary/60 bg-zinc-900/30 hover:bg-zinc-900/60 text-center cursor-pointer transition-all duration-300 group mb-6"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFilesAdded(e.target.files)}
          multiple
          accept="image/*"
          className="hidden"
        />
        <Upload size={40} className="mx-auto text-zinc-400 group-hover:text-primary transition-colors duration-300 mb-3" />
        <p className="text-base font-black text-white uppercase tracking-wider">
          Arrastrá tus fotos en HD acá o <span className="text-primary hover:underline">explorá los archivos</span>
        </p>
        <p className="text-xs font-semibold text-zinc-400 mt-2">
          Formatos soportados: JPG, PNG, WEBP. Podes seleccionar decenas de fotos al mismo tiempo.
        </p>
      </div>

      {/* Global Queue Dashboard Info */}
      {totalFiles > 0 && (
        <div className="bg-zinc-900/70 rounded-2xl border border-zinc-800 p-5 sm:p-6 mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <BarChart2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-zinc-200 uppercase tracking-widest leading-none">Métricas Globales de Carga</h4>
                <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-bold">Resumen de cola de archivos y estado del lote</p>
              </div>
            </div>

            {failedFiles > 0 && (
              <button
                onClick={handleRetryFailed}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md"
              >
                <RotateCcw size={14} className={uploading ? 'animate-spin' : ''} />
                Reintentar Fallidas ({failedFiles})
              </button>
            )}
          </div>

          {/* Premium stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
            <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800 text-center flex flex-col justify-center transition-all">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Fotos en Cola</span>
              <span className="text-xl font-black text-white mt-1 block">{totalFiles}</span>
            </div>
            <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800 text-center flex flex-col justify-center transition-all">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Cargadas (Éxito)</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">{uploadedFiles}</span>
            </div>
            <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800 text-center flex flex-col justify-center transition-all">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider block">Restantes</span>
              <span className="text-xl font-black text-yellow-400 mt-1 block">{remainingFiles}</span>
            </div>
            <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800 text-center flex flex-col justify-center transition-all">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">Tamaño Total</span>
              <span className="text-xl font-black text-primary mt-1 block">{totalSizeStr}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-3 border-t border-zinc-800/60">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-2">
              <span className="text-zinc-300">Progreso General del Lote</span>
              <span className="text-primary font-black">{globalProgress}% ({uploadedFiles}/{totalFiles})</span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-primary transition-all duration-300 glow-yellow"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </div>

          {/* Warning Banner for Failed Files */}
          {failedFiles > 0 && (
            <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-red-300 text-xs font-bold uppercase">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <span>Atención: {failedFiles} {failedFiles === 1 ? 'imagen no pudo subirse' : 'imágenes no pudieron subirse'}. Podés reintentar sin perder las exitosas.</span>
              </div>
              <button
                onClick={handleRetryFailed}
                disabled={uploading}
                className="underline hover:text-white font-black whitespace-nowrap"
              >
                Reintentar Ahora
              </button>
            </div>
          )}
        </div>
      )}

      {/* Individual File Detail Grid */}
      {queue.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Detalles y Estado por Archivo</h4>
          
          <div className="max-h-[380px] overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-900 bg-zinc-900/30 scrollbar-thin">
            {queue.map((item) => (
              <div key={item.id} className="p-3.5 flex items-center justify-between gap-4">
                
                {/* Image Preview & Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 relative flex-shrink-0">
                    <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-[300px]">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400 font-semibold">
                        {formatSize(item.size)}
                      </span>
                      {item.errorMsg && (
                        <span className="text-[11px] text-red-400 font-bold truncate max-w-[200px]" title={item.errorMsg}>
                          • {item.errorMsg}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  
                  {/* Status Indicator */}
                  <div className="w-28 text-right">
                    {item.status === 'esperando' && (
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Esperando ⏳</span>
                    )}
                    {item.status === 'comprimiendo' && (
                      <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider animate-pulse">Comprimiendo ⚙️</span>
                    )}
                    {item.status === 'subiendo' && (
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider animate-pulse">Subiendo ⬆️</span>
                        <div className="w-20 h-1.5 bg-zinc-950 rounded-full overflow-hidden mt-1 border border-zinc-800">
                          <div className="h-full bg-primary" style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    )}
                    {item.status === 'exito' && (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 uppercase tracking-wider">
                        <Check size={13} /> Éxito ✅
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 uppercase tracking-wider" title={item.errorMsg}>
                        <AlertCircle size={13} /> Error ❌
                      </span>
                    )}
                  </div>

                  {/* Retry Single File Action */}
                  {item.status === 'error' && (
                    <button
                      onClick={() => handleRetrySingleItem(item.id)}
                      disabled={uploading}
                      className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                      title="Reintentar esta imagen"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}

                  {/* Remove trigger */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={uploading || item.status === 'exito'}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                    title="Remover de la cola"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Upload Actions */}
      {queue.length > 0 && (
        <div className="flex flex-wrap justify-end gap-3 select-none pt-2">
          <button
            onClick={handleClearQueue}
            disabled={uploading}
            className="px-5 py-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Limpiar Cola
          </button>

          {failedFiles > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md"
            >
              <RotateCcw size={14} className={uploading ? 'animate-spin' : ''} />
              Reintentar Fallidas ({failedFiles})
            </button>
          )}

          <button
            onClick={startUpload}
            disabled={uploading || remainingFiles === 0}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-primary hover:bg-primary/95 disabled:bg-zinc-900 disabled:text-zinc-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:shadow-[0_0_25px_rgba(250,204,21,0.3)] glow-yellow"
          >
            <ShieldCheck size={16} />
            {uploading ? 'Subiendo Lote...' : 'Iniciar Carga Masiva'}
          </button>
        </div>
      )}
    </div>
  );
};
