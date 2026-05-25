/**
 * Descarga un archivo de forma directa en el explorador (Downloads folder)
 * evitando que el navegador abra la imagen en una pestaña en blanco,
 * incluso si proviene de un origen diferente (cross-origin) como Backblaze B2.
 * 
 * @param url La dirección URL absoluta del archivo/foto en alta resolución.
 * @param filename El nombre del archivo con el que se guardará en el explorador.
 */
export const downloadFileDirectly = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors', // Asegura petición CORS
      credentials: 'omit' // No envía credenciales/cookies a B2
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
    // Fallback: abrir en una pestaña nueva si CORS falla (ej. si no está configurado wildcard en B2)
    window.open(url, '_blank');
  }
};
