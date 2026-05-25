import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { School, GalleryPhoto } from '../types/database';
import { downloadFileDirectly } from '../lib/downloader';
import { trackEvent } from '../lib/analytics';
import { Navbar } from '../components/Navbar';
import { PremiumGallery } from '../components/PremiumGallery';
import { ArrowLeft, Download, Film, Users, Image as ImageIcon, MapPin, Calendar, Share2, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { Footer } from '../components/Footer';
import { useSEO } from '../hooks/useSEO';

export const SchoolDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareText, setShareText] = useState('Compartir');

  // Survey states
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [surveyVotesTotal, setSurveyVotesTotal] = useState(0);

  useSEO({
    title: school ? `Fotos de ${school.name}` : 'Cargando Galería',
    description: school 
      ? `Accedé a la galería premium de fotos y videos del viaje de egresados de ${school.name} a ${school.destination} con SuperTourChannel.`
      : 'Accedé a tus fotos de viaje de egresados en alta definición.',
    ogImage: school?.group_photo_web || '/st-logo-og.png',
    canonicalPath: `/colegio/${id}`
  });

  // Travel categories mock photos (Unsplash high quality) to show if DB is empty
  const mockPhotos: GalleryPhoto[] = [
    { id: 'p1', school_id: id || '', url_web: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80', url_hd: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1600&auto=format&fit=crop&q=80', category: 'Grupal', sort_order: 1 },
    { id: 'p2', school_id: id || '', url_web: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80', url_hd: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1600&auto=format&fit=crop&q=80', category: 'Excursiones', sort_order: 2 },
    { id: 'p3', school_id: id || '', url_web: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', url_hd: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&auto=format&fit=crop&q=80', category: 'Fiestas', sort_order: 3 },
    { id: 'p4', school_id: id || '', url_web: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=800&auto=format&fit=crop&q=80', url_hd: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1600&auto=format&fit=crop&q=80', category: 'Actividades', sort_order: 4 },
    { id: 'p5', school_id: id || '', url_web: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80', url_hd: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&auto=format&fit=crop&q=80', category: 'Grupal', sort_order: 5 },
    { id: 'p6', school_id: id || '', url_web: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800&auto=format&fit=crop&q=80', url_hd: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1600&auto=format&fit=crop&q=80', category: 'Excursiones', sort_order: 6 },
    { id: 'p7', school_id: id || '', url_web: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', url_hd: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&auto=format&fit=crop&q=80', category: 'Fiestas', sort_order: 7 },
    { id: 'p8', school_id: id || '', url_web: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80', url_hd: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&auto=format&fit=crop&q=80', category: 'Actividades', sort_order: 8 },
  ];

  const mockSchoolsMap: Record<string, School> = {
    'mock-school-1': {
      id: 'mock-school-1',
      name: 'EGB Colegio San Martín',
      destination: 'Villa Carlos Paz',
      travel_date: '2026-11-10',
      group_photo_web: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/carlospaz-sanmartin.zip',
    },
    'mock-school-2': {
      id: 'mock-school-2',
      name: 'Primaria Instituto Don Bosco',
      destination: 'Villa Carlos Paz',
      travel_date: '2026-11-22',
      group_photo_web: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/carlospaz-donbosco.zip',
    },
    'mock-school-3': {
      id: 'mock-school-3',
      name: 'Primaria Instituto Dardo Rocha',
      destination: 'Mar del Plata',
      travel_date: '2026-10-12',
      group_photo_web: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/mdp-dardorocha.zip',
    },
    'mock-school-4': {
      id: 'mock-school-4',
      name: 'Colegio Stella Maris',
      destination: 'Mar del Plata',
      travel_date: '2026-10-25',
      group_photo_web: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/mdp-stellamaris.zip',
    },
    'mock-school-5': {
      id: 'mock-school-5',
      name: 'Colegio Santa Rosa',
      destination: 'Villa Carlos Paz',
      travel_date: '2026-12-15',
      group_photo_web: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/carlospaz-santarosa.zip',
    },
    'mock-school-6': {
      id: 'mock-school-6',
      name: 'EGB Instituto Peralta Ramos',
      destination: 'Mar del Plata',
      travel_date: '2026-12-08',
      group_photo_web: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/mdp-peraltaramos.zip',
    },
  };

  useEffect(() => {
    const fetchSchoolData = async () => {
      setLoading(true);
      try {
        // 1. Fetch School metadata
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', id)
          .single();

        if (schoolError) throw schoolError;

        if (schoolData) {
          setSchool(schoolData as School);
          
          // Track school view in real-time
          trackEvent({
            event_type: 'school_view',
            school_id: id,
            destination: schoolData.destination
          });
          
          // 2. Fetch School Photos
          const { data: photoData, error: photoError } = await supabase
            .from('gallery_photos')
            .select('*')
            .eq('school_id', id)
            .order('sort_order', { ascending: true });

          if (photoError) throw photoError;

          if (photoData && photoData.length > 0) {
            setPhotos(photoData as GalleryPhoto[]);
          } else {
            // Use mock photos if gallery is empty
            setPhotos(mockPhotos);
          }
        }
      } catch (err) {
        console.warn('Database error, loading mock school data details page.');
        // Fallback to local mock data matching ID
        if (id && mockSchoolsMap[id]) {
          const s = mockSchoolsMap[id];
          setSchool(s);
          setPhotos(mockPhotos);
          
          trackEvent({
            event_type: 'school_view',
            school_id: id,
            destination: s.destination
          });
        } else {
          // Fallback to general mockup
          const s = mockSchoolsMap['mock-school-1'];
          setSchool(s);
          setPhotos(mockPhotos);
          
          trackEvent({
            event_type: 'school_view',
            school_id: s.id,
            destination: s.destination
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        // Try fetching active survey from Supabase
        const { data, error } = await supabase
          .from('surveys')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        let survey = data && data.length > 0 ? data[0] : null;
        if (!survey) {
          // Fallback to local storage or mock survey
          const localSurveysRaw = localStorage.getItem('supertour_local_surveys');
          const localSurveys = localSurveysRaw ? JSON.parse(localSurveysRaw) : null;
          if (localSurveys && localSurveys.length > 0) {
            survey = localSurveys.find((s: any) => s.active) || localSurveys[0];
          } else {
            // Default mock survey
            survey = {
              id: 'survey-1',
              question: '¿Cuál fue la excursión más emocionante del viaje?',
              options: [
                { text: 'Parque de Aventura Pekos', votes: 145 },
                { text: 'Aerosilla Carlos Paz', votes: 89 },
                { text: 'Rafting en el Río Suquía', votes: 202 },
                { text: 'Senderismo en las Sierras', votes: 41 }
              ],
              active: true,
              created_at: '2026-05-20'
            };
          }
        }

        if (survey) {
          setActiveSurvey(survey);
          
          // Check if passenger already voted
          const voted = localStorage.getItem(`supertour_voted_survey_${survey.id}`);
          if (voted) {
            setHasVoted(true);
            setVotedOption(voted);
          }
          
          const total = survey.options.reduce((sum: number, o: any) => sum + o.votes, 0);
          setSurveyVotesTotal(total);
        }
      } catch (err) {
        console.warn('Error fetching survey, using default mock survey.');
        const mockSurvey = {
          id: 'survey-1',
          question: '¿Cuál fue la excursión más emocionante del viaje?',
          options: [
            { text: 'Parque de Aventura Pekos', votes: 145 },
            { text: 'Aerosilla Carlos Paz', votes: 89 },
            { text: 'Rafting en el Río Suquía', votes: 202 },
            { text: 'Senderismo en las Sierras', votes: 41 }
          ],
          active: true,
          created_at: '2026-05-20'
        };
        setActiveSurvey(mockSurvey);
        const voted = localStorage.getItem(`supertour_voted_survey_${mockSurvey.id}`);
        if (voted) {
          setHasVoted(true);
          setVotedOption(voted);
        }
        const total = mockSurvey.options.reduce((sum: number, o: any) => sum + o.votes, 0);
        setSurveyVotesTotal(total);
      }
    };
    loadSurvey();
  }, [id]);

  const handleVote = async (optionText: string) => {
    if (hasVoted || !activeSurvey || !school) return;

    // 1. Guardar localmente para evitar doble voto
    localStorage.setItem(`supertour_voted_survey_${activeSurvey.id}`, optionText);
    setHasVoted(true);
    setVotedOption(optionText);

    // 2. Incrementar votos en el estado en caliente
    const updatedOptions = activeSurvey.options.map((opt: any) => 
      opt.text === optionText ? { ...opt, votes: opt.votes + 1 } : opt
    );
    const updatedSurvey = { ...activeSurvey, options: updatedOptions };
    setActiveSurvey(updatedSurvey);
    setSurveyVotesTotal(prev => prev + 1);

    // 3. Registrar el evento analítico de voto en tiempo real
    trackEvent({
      event_type: 'survey_vote',
      school_id: school.id,
      destination: school.destination,
      metadata: {
        survey_id: activeSurvey.id,
        option: optionText
      }
    });

    // 4. Intentar persistir en Supabase o en localStorage
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ options: updatedOptions })
        .eq('id', activeSurvey.id);

      if (error) throw error;
    } catch (dbErr) {
      console.warn('No se pudo persistir el voto en Supabase, guardando en cache local:', dbErr);
      
      // Actualizar en localStorage el listado local de encuestas
      try {
        const localSurveysRaw = localStorage.getItem('supertour_local_surveys');
        let localSurveys = localSurveysRaw ? JSON.parse(localSurveysRaw) : [];
        
        // Si no existen encuestas locales aún, agregamos las mock
        if (localSurveys.length === 0) {
          localSurveys = [
            {
              id: 'survey-1',
              question: '¿Cuál fue la excursión más emocionante del viaje?',
              options: [
                { text: 'Parque de Aventura Pekos', votes: 145 },
                { text: 'Aerosilla Carlos Paz', votes: 89 },
                { text: 'Rafting en el Río Suquía', votes: 202 },
                { text: 'Senderismo en las Sierras', votes: 41 }
              ],
              active: true,
              created_at: '2026-05-20'
            },
            {
              id: 'survey-2',
              question: '¿Qué boliche / matiné premium tuvo la mejor fiesta?',
              options: [
                { text: 'Khalama Disco', votes: 312 },
                { text: 'Keops El Templo', votes: 278 },
                { text: 'Molino Rojo', votes: 198 }
              ],
              active: false,
              created_at: '2026-05-22'
            }
          ];
        }

        const surveyIndex = localSurveys.findIndex((s: any) => s.id === activeSurvey.id);
        if (surveyIndex !== -1) {
          localSurveys[surveyIndex].options = updatedOptions;
        } else {
          localSurveys.push(updatedSurvey);
        }
        localStorage.setItem('supertour_local_surveys', JSON.stringify(localSurveys));
      } catch (err) {
        console.error('Error al actualizar encuestas locales:', err);
      }
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareText('¡Enlace Copiado!');
      setTimeout(() => setShareText('Compartir'), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [, month, day] = dateStr.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthNum = parseInt(month, 10);
    return `${parseInt(day, 10)} de ${monthNames[monthNum - 1]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center select-none">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4 glow-yellow" />
          <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
            Cargando la Experiencia...
          </p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center select-none text-center px-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Colegio no encontrado
          </h2>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 rounded-full bg-primary text-black font-black uppercase text-xs tracking-wider"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Navbar />

      {/* Decorative Blur lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-[120px] pointer-events-none z-0" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 relative z-10">
        {/* Back and Share Bar */}
        <div className="flex items-center justify-between mb-8 select-none">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors duration-200"
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
          
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-200"
          >
            <Share2 size={14} className="text-primary" />
            <span>{shareText}</span>
          </button>
        </div>

        {/* School Header Information */}
        <div className="text-center md:text-left mb-12 select-none">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-900">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
                <Sparkles size={10} />
                Viaje de Egresados Premium
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white leading-none">
                {school.name}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-lg border border-zinc-800/80">
                  <MapPin size={14} className="text-primary" />
                  {school.destination}
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-lg border border-zinc-800/80">
                  <Calendar size={14} className="text-primary" />
                  {formatDate(school.travel_date)}
                </span>
              </div>
            </div>

            {/* Quick Actions (Downloads) */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {school.multimedia_url && 
               school.multimedia_url.trim() !== '' && 
               school.multimedia_url !== 'https://demo.backblaze.com/download/viaje.zip' && (
                <a
                  href={school.multimedia_url}
                  download={`SuperTour-${school.name}-Multimedia.zip`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-black text-xs uppercase tracking-wider text-white transition-all duration-300 w-full sm:w-auto"
                >
                  <Film size={16} className="text-primary" />
                  Descargar Video del Viaje
                </a>
              )}
              
              <button
                onClick={() => downloadFileDirectly(school.group_photo_hd, `SuperTour-${school.name}-FotoGrupal.jpg`)}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-wider transition-all duration-300 w-full sm:w-auto glow-yellow"
              >
                <Download size={16} />
                Descargar Foto Grupal HD
              </button>
            </div>
          </div>
        </div>

        {/* Featured Group Photo Frame */}
        <section className="mb-16 select-none">
          <div className="text-center md:text-left mb-6">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
              Foto Destacada
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
              <Users size={20} className="text-primary" />
              La Foto Grupal Oficial
            </h2>
          </div>

          <div className="glass-card rounded-3xl overflow-hidden p-3 border border-zinc-800/40 shadow-premium">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-zinc-900 group">
              <img
                src={school.group_photo_web}
                alt={`${school.name} - Foto Grupal`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-6">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                  Viaje a {school.destination} • {formatDate(school.travel_date)}
                </span>
                <button
                  onClick={() => downloadFileDirectly(school.group_photo_hd, `SuperTour-${school.name}-Grupal.jpg`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-black text-xs font-black uppercase tracking-wider transition-transform scale-95 group-hover:scale-100 duration-300"
                >
                  <Download size={12} />
                  Descargar HD
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Survey Segment */}
        {activeSurvey && (
          <section className="mb-16 select-none animate-fade-in">
            <div className="text-center md:text-left mb-6">
              <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
                Interactividad
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
                <Sparkles size={20} className="text-primary animate-pulse" />
                La Encuesta del Viaje
              </h2>
              <p className="text-zinc-500 text-xs sm:text-sm mt-1">
                Participá y dejanos tus opiniones para mejorar las próximas experiencias de egresados.
              </p>
            </div>

            <div className="glass-card rounded-3xl border border-zinc-800/40 p-6 sm:p-8 bg-zinc-950/80 shadow-premium relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest leading-none glow-yellow">
                  <Sparkles size={10} />
                  Opción de Pasajeros
                </div>
                <h3 className="text-lg font-black uppercase text-white tracking-tight leading-snug">
                  {activeSurvey.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase leading-normal tracking-wide">
                  {hasVoted 
                    ? '¡Muchas gracias! Ya registramos tu valiosa respuesta para esta encuesta. Tu opinión nos ayuda a brindarte el mejor servicio de SuperTour.'
                    : activeSurvey.description || 'Por favor participá de esta breve encuesta interactiva de tu viaje de egresados.'}
                </p>
              </div>

              <div className="flex-shrink-0">
                {hasVoted ? (
                  <div className="px-5 py-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <CheckCircle2 size={15} />
                    Encuesta Respondida ✓
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/encuesta/${activeSurvey.id}?schoolId=${school.id}`)}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.03] glow-yellow shadow-md"
                  >
                    <Send size={13} />
                    Responder Encuesta
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Gallery Segment */}
        <section>
          <div className="text-center md:text-left mb-2">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
              Galería Flexible
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
              <ImageIcon size={20} className="text-primary" />
              Recuerdos del Viaje
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">
              Ordená, filtrá y hacé clic en las fotos para visualizarlas en alta resolución y compartirlas.
            </p>
          </div>

          <PremiumGallery photos={photos} schoolName={school.name} />
        </section>
      </main>
      <Footer />
    </div>
  );
};
