export interface GroupVideo {
  id: string;
  title: string;
  url: string;
  created_at?: string;
}

export interface SchoolItem {
  id: string;
  name: string;
  group_photo_web?: string;
  group_photo_hd?: string;
  multimedia_url?: string;
}

export interface School {
  id: string;
  group_code?: string; // Internal admin code e.g. "0001"
  name: string; // Display string combining school names e.g. "Colegio San Martín, Instituto Belgrano"
  school_names?: string[]; // Array of school names forming this travel group
  school_items?: SchoolItem[]; // Per-school items
  destination: 'Mar del Plata' | 'Villa Carlos Paz';
  travel_date: string; // ISO Date String YYYY-MM-DD
  group_photo_web: string;
  group_photo_hd: string;
  multimedia_url: string; // Primary Backblaze zip/video link
  videos?: GroupVideo[]; // Multiple group videos
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
