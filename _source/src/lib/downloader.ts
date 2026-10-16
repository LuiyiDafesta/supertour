import { toCdnUrl } from './cdn';

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
      mode: 'cors', // Asegura petición CORS
      credentials: 'omit' // No envía credenciales/cookies
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    
    // Append dynamically to body, trigger and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke resource URL
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.warn('Descarga por Blob falló debido a políticas CORS o de red, usando fallback clásico de pestaña:', error);
    // Fallback: abrir en una pestaña nueva
    window.open(targetUrl, '_blank');
  }
};
