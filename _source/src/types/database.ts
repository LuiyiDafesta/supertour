export interface School {
  id: string;
  name: string;
  destination: 'Mar del Plata' | 'Villa Carlos Paz';
  travel_date: string; // ISO Date String YYYY-MM-DD
  group_photo_web: string;
  group_photo_hd: string;
  multimedia_url: string; // Backblaze zip/video link
  created_at?: string;
}

export interface GalleryPhoto {
  id: string;
  school_id: string;
  url_web: string;
  url_hd: string;
  category: 'Excursiones' | 'Fiestas' | 'Actividades' | 'Grupal';
  sort_order: number;
  created_at?: string;
}
