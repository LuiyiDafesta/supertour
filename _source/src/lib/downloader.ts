import JSZip from 'jszip';
import { toCdnUrl } from './cdn';

/**
 * Descarga directamente un objeto Blob en el navegador,
 * asignándole un nombre de archivo y programando la liberación de memoria.
 */
export const downloadBlobDirectly = (blob: Blob, filename: string): void => {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;

  // Append dynamically to body, trigger and clean up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Damos 60 segundos de gracia antes de revocar el Blob
  // para permitir que el gestor de descargas del navegador termine de consumirlo
  setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 60000);
};

/**
 * Descarga un archivo de forma directa en el explorador (Downloads folder)
 * a través del CDN Cloudflare con caché perimetral y egress $0,
 * evitando que el navegador abra la imagen en una pestaña en blanco.
 * 
 * @param url La dirección URL absoluta del archivo/foto en alta resolución.
 * @param filename El nombre del archivo con el que se guardará en el explorador.
 */
export const downloadFileDirectly = async (url: string, filename: string): Promise<void> => {
  const targetUrl = toCdnUrl(url);
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    downloadBlobDirectly(blob, filename);
  } catch (error) {
    console.warn('Descarga por Blob falló debido a políticas CORS o de red, usando fallback clásico de pestaña:', error);
    // Fallback: abrir en una pestaña nueva
    window.open(targetUrl, '_blank');
  }
};

export interface ZipProgressInfo {
  current: number;
  total: number;
  percent: number;
  stage: 'fetching' | 'compressing';
}

/**
 * Descarga múltiples fotos y las empaqueta en un único archivo ZIP en el cliente.
 * Solución óptima para celulares y navegadores que bloquean descargas múltiples automáticas.
 */
export const downloadPhotosAsZip = async (
  items: { url: string; filename: string }[],
  zipFilename: string,
  onProgress?: (info: ZipProgressInfo) => void,
  shouldCancel?: () => boolean
): Promise<{ success: boolean; count: number }> => {
  const zip = new JSZip();
  let count = 0;
  const total = items.length;

  for (let i = 0; i < total; i++) {
    if (shouldCancel && shouldCancel()) {
      return { success: false, count };
    }

    const item = items[i];
    const targetUrl = toCdnUrl(item.url);

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      zip.file(item.filename, blob);
      count++;

      if (onProgress) {
        const percent = Math.round((count / total) * 85);
        onProgress({ current: count, total, percent, stage: 'fetching' });
      }
    } catch (err) {
      console.warn(`Error al descargar ${item.filename} para el ZIP:`, err);
    }
  }

  if (count === 0) {
    throw new Error('No se pudo descargar ninguna foto para comprimir.');
  }

  if (shouldCancel && shouldCancel()) {
    return { success: false, count };
  }

  if (onProgress) {
    onProgress({ current: count, total, percent: 88, stage: 'compressing' });
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 4 }
    },
    (metadata) => {
      if (onProgress) {
        const percent = 85 + Math.round(metadata.percent * 0.15);
        onProgress({
          current: count,
          total,
          percent: Math.min(percent, 99),
          stage: 'compressing'
        });
      }
    }
  );

  downloadBlobDirectly(zipBlob, zipFilename);

  if (onProgress) {
    onProgress({ current: count, total, percent: 100, stage: 'compressing' });
  }

  return { success: true, count };
};

/**
 * Descarga secuencial con intervalo controlado entre fotos individuales.
 */
export const downloadPhotosSequentially = async (
  items: { url: string; filename: string }[],
  delayMs = 900,
  onProgress?: (current: number, total: number) => void,
  shouldCancel?: () => boolean
): Promise<{ success: boolean; count: number }> => {
  let count = 0;
  const total = items.length;

  for (let i = 0; i < total; i++) {
    if (shouldCancel && shouldCancel()) {
      return { success: false, count };
    }

    const item = items[i];
    try {
      await downloadFileDirectly(item.url, item.filename);
      count++;
      if (onProgress) onProgress(count, total);
    } catch (err) {
      console.error(`Error en descarga secuencial de ${item.filename}:`, err);
    }

    if (i < total - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return { success: true, count };
};
