import { supabase } from './supabase';

export interface AnalyticsEvent {
  id?: string;
  event_type: 'calendar_click' | 'school_view' | 'photo_click' | 'photo_download' | 'survey_vote' | 'banner_click';
  school_id?: string;
  destination?: string;
  metadata?: any;
  created_at?: string;
}

/**
 * Registra un evento de interacción (click en calendario, vista de colegio,
 * descarga, click en foto, voto de encuesta) de manera en vivo en Supabase,
 * y con un almacenamiento local robusto (localStorage) de respaldo.
 */
export const trackEvent = async (event: Omit<AnalyticsEvent, 'id' | 'created_at'>): Promise<void> => {
  const timestamp = new Date().toISOString();
  
  // Auto-detect device for real-time mobile vs pc tracking
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const device = isMobile ? 'mobile' : 'desktop';
  const enrichedMetadata = {
    device,
    ...(event.metadata || {})
  };

  const localEvent: AnalyticsEvent = {
    id: `local-ev-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    ...event,
    metadata: enrichedMetadata,
    created_at: timestamp
  };

  // 1. Guardar localmente en localStorage para visualización instantánea y fallback de contingencia
  try {
    const existing = localStorage.getItem('supertour_analytics_events');
    const list: AnalyticsEvent[] = existing ? JSON.parse(existing) : [];
    list.push(localEvent);
    
    // Limitar almacenamiento local a los últimos 1000 eventos para evitar sobrecarga del navegador
    if (list.length > 1000) {
      list.shift();
    }
    localStorage.setItem('supertour_analytics_events', JSON.stringify(list));
  } catch (err) {
    console.error('Error al guardar evento localmente:', err);
  }

  // 2. Debug en consola para fácil verificación
  console.log(
    `%c[SuperTour Analytics]%c Evento registrado: %c${event.event_type}%c`,
    'color: #FACC15; font-weight: bold;',
    'color: #AAAAAA;',
    'color: #FFFFFF; font-weight: bold; background: #333333; padding: 1px 4px; border-radius: 3px;',
    'color: #AAAAAA;',
    { ...event, metadata: enrichedMetadata }
  );

  // 3. Subir de forma segura en la nube (Supabase)
  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: event.event_type,
        school_id: event.school_id || null,
        destination: event.destination || null,
        metadata: enrichedMetadata
      });
    
    if (error) {
      // Si la base de datos rechaza 'banner_click' por la restricción CHECK de Postgres histórica,
      // enviamos con un flag seguro en metadata para que quede 100% persistido en la nube
      if (event.event_type === 'banner_click') {
        const fallbackRes = await supabase
          .from('analytics_events')
          .insert({
            event_type: 'photo_click',
            school_id: event.school_id || null,
            destination: event.destination || null,
            metadata: {
              ...enrichedMetadata,
              is_banner_click: true,
              original_event_type: 'banner_click'
            }
          });
        if (fallbackRes.error) throw fallbackRes.error;
      } else {
        throw error;
      }
    }
  } catch (dbErr) {
    // Falla silenciosa en el cliente de pasajeros para evitar cualquier interrupción de UX
    console.warn('No se pudo persistir el evento en Supabase:', dbErr);
  }
};

/**
 * Obtiene todos los eventos de interacción registrados en tiempo real,
 * priorizando la base de datos de Supabase y cayendo en localStorage si falla.
 */
export const getAnalyticsEvents = async (): Promise<AnalyticsEvent[]> => {
  // Cargar respaldo local
  let localList: AnalyticsEvent[] = [];
  try {
    const existing = localStorage.getItem('supertour_analytics_events');
    localList = existing ? JSON.parse(existing) : [];
  } catch (err) {
    console.error('Error al cargar eventos analíticos locales:', err);
  }

  // Consultar Supabase
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      // Normalizar eventos (ej. banner clicks guardados con fallback)
      const normalized = (data as AnalyticsEvent[]).map(ev => {
        if (ev.metadata?.is_banner_click || ev.metadata?.original_event_type === 'banner_click') {
          return {
            ...ev,
            event_type: 'banner_click' as const
          };
        }
        return ev;
      });
      return normalized;
    }
  } catch (dbErr) {
    console.warn('Consulta a Supabase fallida, usando base de datos analítica local de localStorage:', dbErr);
  }

  return localList;
};
