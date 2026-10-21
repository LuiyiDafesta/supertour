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

export interface SurveyQuestion {
  id: string;
  question: string;
  answer_type: 'text' | 'number' | 'boolean';
}

export interface Survey {
  id: string;
  question?: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  options?: any;
  active: boolean;
  created_at?: string;
}

export const normalizeSurvey = (s: any): Survey | null => {
  if (!s) return null;
  const opts = typeof s.options === 'object' && s.options !== null && !Array.isArray(s.options) ? s.options : {};
  const title = s.title || opts.title || s.question || 'Encuesta del Viaje';
  const description = s.description || opts.description || 'Por favor participá de esta breve encuesta interactiva de tu viaje de egresados.';
  
  let questions: SurveyQuestion[] = [];
  if (Array.isArray(s.questions) && s.questions.length > 0) {
    questions = s.questions;
  } else if (Array.isArray(opts.questions) && opts.questions.length > 0) {
    questions = opts.questions;
  } else if (Array.isArray(s.options) && s.options.length > 0) {
    questions = [{ id: 'q-options', question: s.question || title, answer_type: 'text' }];
  } else {
    questions = [{ id: 'q-default', question: s.question || 'Dejanos tus comentarios sobre el viaje:', answer_type: 'text' }];
  }

  return {
    ...s,
    title,
    description,
    questions,
    active: !!s.active
  };
};
