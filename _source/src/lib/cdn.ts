/**
 * Utilidades de CDN para SuperTourChannel
 * Enruta todas las solicitudes de multimedia a través del CDN Cloudflare en:
 * https://media.supertourchannel.com.ar/SupertourLow/...
 * 
 * Beneficios:
 * 1. Cache en el Edge de Cloudflare (nodo Ezeiza / Buenos Aires, tiempo de respuesta <15ms).
 * 2. Egress $0 / Gratis garantizado por la Bandwidth Alliance entre Cloudflare y Backblaze B2.
 * 3. Descarga de fotos HD a máxima velocidad sin sobrecargar el bucket de origen.
 */

export const CDN_DOMAIN = 'https://media.supertourchannel.com.ar';

/**
 * Transforma cualquier URL de origen directo de Backblaze B2 en su correspondiente ruta CDN Cloudflare.
 * Si la URL ya utiliza el CDN, o es un enlace externo (ej. Unsplash, demo), la mantiene intacta.
 */
export const toCdnUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (trimmed === '') return '';

  // Si ya apunta a nuestro CDN, mantenerlo tal cual
  if (trimmed.includes('media.supertourchannel.com.ar')) {
    return trimmed;
  }

  // 1. Caso S3 Virtual-Host style de Backblaze:
  // Ej: https://SupertourLow.s3.us-west-004.backblazeb2.com/schools-gallery/123/web/img.jpg?sub=Colegio
  const b2VirtualHostRegex = /^https?:\/\/([a-zA-Z0-9\-_]+)\.s3\.[a-zA-Z0-9\-_]+\.backblazeb2\.com\/(.*)$/i;
  const matchVirtual = trimmed.match(b2VirtualHostRegex);
  if (matchVirtual) {
    const bucket = matchVirtual[1];
    const pathAndQuery = matchVirtual[2];
    return `${CDN_DOMAIN}/${bucket}/${pathAndQuery}`;
  }

  // 2. Caso S3 Path style de Backblaze:
  // Ej: https://s3.us-west-004.backblazeb2.com/SupertourLow/schools-gallery/...
  const b2PathStyleRegex = /^https?:\/\/s3\.[a-zA-Z0-9\-_]+\.backblazeb2\.com\/(.*)$/i;
  const matchPath = trimmed.match(b2PathStyleRegex);
  if (matchPath) {
    const pathAndQuery = matchPath[1];
    return `${CDN_DOMAIN}/${pathAndQuery}`;
  }

  // 3. Caso Endpoint Nativo B2:
  // Ej: https://f004.backblazeb2.com/file/SupertourLow/schools-gallery/...
  const b2NativeRegex = /^https?:\/\/f[0-9]+\.backblazeb2\.com\/file\/([a-zA-Z0-9\-_]+)\/(.*)$/i;
  const matchNative = trimmed.match(b2NativeRegex);
  if (matchNative) {
    const bucket = matchNative[1];
    const pathAndQuery = matchNative[2];
    return `${CDN_DOMAIN}/${bucket}/${pathAndQuery}`;
  }

  return trimmed;
};

/**
 * Normaliza un objeto School asegurando que todas sus fotos y videos usen el CDN.
 */
export const normalizeSchoolWithCdn = <T extends {
  group_photo_web?: string;
  group_photo_hd?: string;
  multimedia_url?: string;
  school_items?: any[];
  videos?: any[];
}>(school: T): T => {
  if (!school) return school;

  let normalizedMultimediaUrl = school.multimedia_url;
  if (normalizedMultimediaUrl && typeof normalizedMultimediaUrl === 'string') {
    const trimmed = normalizedMultimediaUrl.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          normalizedMultimediaUrl = JSON.stringify(parsed.map(v => ({ ...v, url: toCdnUrl(v.url) })));
        }
      } catch {}
    } else {
      normalizedMultimediaUrl = toCdnUrl(trimmed);
    }
  }

  return {
    ...school,
    group_photo_web: school.group_photo_web ? toCdnUrl(school.group_photo_web) : school.group_photo_web,
    group_photo_hd: school.group_photo_hd ? toCdnUrl(school.group_photo_hd) : school.group_photo_hd,
    multimedia_url: normalizedMultimediaUrl,
    videos: Array.isArray(school.videos)
      ? school.videos.map((v) => ({
          ...v,
          url: toCdnUrl(v.url)
        }))
      : school.videos,
    school_items: Array.isArray(school.school_items)
      ? school.school_items.map((item) => ({
          ...item,
          group_photo_web: item.group_photo_web ? toCdnUrl(item.group_photo_web) : item.group_photo_web,
          group_photo_hd: item.group_photo_hd ? toCdnUrl(item.group_photo_hd) : item.group_photo_hd,
          multimedia_url: item.multimedia_url ? toCdnUrl(item.multimedia_url) : item.multimedia_url,
        }))
      : school.school_items,
  };
};

/**
 * Normaliza un objeto GalleryPhoto asegurando que sus versiones Web y HD usen el CDN.
 */
export const normalizeGalleryPhotoWithCdn = <T extends {
  url_web?: string;
  url_hd?: string;
}>(photo: T): T => {
  if (!photo) return photo;

  return {
    ...photo,
    url_web: photo.url_web ? toCdnUrl(photo.url_web) : photo.url_web,
    url_hd: photo.url_hd ? toCdnUrl(photo.url_hd) : photo.url_hd,
  };
};

/**
 * Obtiene la lista completa de videos del grupo (videos JSONB o multimedia_url legacy/JSON),
 * normalizando cada enlace a través del CDN Cloudflare.
 */
export const getSchoolVideos = (school?: { videos?: any[]; multimedia_url?: string; created_at?: string; school_items?: any[] } | null): { id: string; title: string; url: string; created_at?: string }[] => {
  if (!school) return [];

  // 1. Array de videos nativo (columna JSONB)
  if (Array.isArray(school.videos) && school.videos.length > 0) {
    return school.videos
      .filter((v: any) => v && v.url && typeof v.url === 'string' && !v.url.includes('demo.backblaze.com'))
      .map((v, i) => ({
        id: v.id || `video-${i}`,
        title: v.title || `Video #${i + 1}`,
        url: toCdnUrl(v.url),
        created_at: v.created_at || school.created_at,
      }));
  }

  // 2. Columna multimedia_url (soporta array serializado en JSON o URL directa)
  if (school.multimedia_url && typeof school.multimedia_url === 'string' && school.multimedia_url.trim() !== '') {
    const trimmed = school.multimedia_url.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((v: any) => v && v.url && typeof v.url === 'string' && !v.url.includes('demo.backblaze.com'))
            .map((v: any, i: number) => ({
              id: v.id || `video-${i}`,
              title: v.title || `Video #${i + 1}`,
              url: toCdnUrl(v.url),
              created_at: v.created_at || school.created_at,
            }));
        }
      } catch {
        // Fallback abajo si falla parseo JSON
      }
    }
    if (!trimmed.includes('demo.backblaze.com')) {
      const fileName = trimmed.split('/').pop()?.split('?')[0] || '';
      const cleanTitle = fileName.replace(/^\d+[-_]/, '').replace(/\.[^/.]+$/, '').replace(/[_+]/g, ' ');
      return [{
        id: 'primary-video',
        title: cleanTitle ? cleanTitle : 'Video Oficial del Viaje',
        url: toCdnUrl(trimmed),
        created_at: school.created_at,
      }];
    }
  }

  // 3. Fallback: Inspeccionar school_items por si se asignó multimedia_url en algún sub-colegio
  if (Array.isArray(school.school_items) && school.school_items.length > 0) {
    const itemVideos: { id: string; title: string; url: string; created_at?: string }[] = [];
    school.school_items.forEach((item, idx) => {
      if (item.multimedia_url && typeof item.multimedia_url === 'string' && item.multimedia_url.trim() !== '') {
        const itemTrimmed = item.multimedia_url.trim();
        if (itemTrimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(itemTrimmed);
            if (Array.isArray(parsed)) {
              parsed
                .filter((v: any) => v && v.url && typeof v.url === 'string' && !v.url.includes('demo.backblaze.com'))
                .forEach((v: any, vi: number) => {
                  itemVideos.push({
                    id: v.id || `sub-vid-${idx}-${vi}`,
                    title: v.title || `${item.name || 'Colegio'} - Video #${vi + 1}`,
                    url: toCdnUrl(v.url),
                    created_at: school.created_at
                  });
                });
              return;
            }
          } catch {}
        }
        if (!itemTrimmed.includes('demo.backblaze.com')) {
          itemVideos.push({
            id: `sub-vid-${idx}`,
            title: `Video - ${item.name || 'Grupo'}`,
            url: toCdnUrl(itemTrimmed),
            created_at: school.created_at
          });
        }
      }
    });
    if (itemVideos.length > 0) return itemVideos;
  }

  return [];
};

/**
 * Elimina uno o múltiples archivos de forma permanente de Backblaze B2 a través de delete.php.
 * Es una función no bloqueante: si falla la conexión con el servidor o el archivo
 * es un demo/externo, no interrumpe el flujo principal de la aplicación.
 */
export const deleteFromB2 = async (urls: (string | null | undefined)[] | string | null | undefined): Promise<void> => {
  if (!urls) return;
  const list = (Array.isArray(urls) ? urls : [urls]).filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  if (list.length === 0) return;

  try {
    const res = await fetch('/delete.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ urls: list })
    });
    if (res.ok) {
      const data = await res.json();
      console.log('B2 delete result:', data);
    } else {
      console.warn('B2 delete returned non-200 status:', res.status);
    }
  } catch (err) {
    // Non-blocking: no interrumpe la UI ni Supabase
    console.warn('B2 delete error (non-blocking):', err);
  }
};
