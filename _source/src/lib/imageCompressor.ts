/**
 * Comprime y redimensiona una imagen en el cliente utilizando HTML5 Canvas.
 * @param file El archivo original cargado por el usuario (en HD).
 * @param maxWidth Ancho/Alto máximo permitido para la versión optimizada (Web).
 * @param quality Calidad de compresión JPEG (de 0 a 1).
 * @returns Promesa que resuelve a un objeto File representando la imagen comprimida y optimizada.
 */
export const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Si no es una imagen, resolver de inmediato con el archivo original
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular dimensiones manteniendo la relación de aspecto (aspect ratio)
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto 2D del Canvas'));
          return;
        }

        // Dibujar la imagen original en el canvas con las nuevas dimensiones
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir Canvas a Blob en formato JPEG comprimido
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Convertimos a objeto File conservando el nombre original y tipo JPEG
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Error al generar el Blob de la imagen comprimida'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Error al cargar el objeto Image en memoria'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo con FileReader'));
  });
};
