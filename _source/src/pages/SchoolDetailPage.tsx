import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { School, GalleryPhoto, normalizeSurvey } from '../types/database';
import { downloadFileDirectly } from '../lib/downloader';
import { trackEvent } from '../lib/analytics';
import { toCdnUrl, normalizeSchoolWithCdn, normalizeGalleryPhotoWithCdn, getSchoolVideos } from '../lib/cdn';
import { Navbar } from '../components/Navbar';
import { PremiumGallery } from '../components/PremiumGallery';
import { 
  ArrowLeft, 
  Download, 
  Film, 
  Users, 
  Image as ImageIcon, 
  MapPin, 
  Calendar, 
  Share2, 
  Sparkles, 
  Send, 
  CheckCircle2,
  Play,
  ZoomIn,
  X,
  Star,
  Layers,
  Lock,
  AlertCircle
} from 'lucide-react';
import { Footer } from '../components/Footer';
import { useSEO } from '../hooks/useSEO';
import { toast } from 'sonner';

export const SchoolDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareText, setShareText] = useState('Compartir');
  const [bannerEnabled, setBannerEnabled] = useState(false);

  // Group Security Gate (PIN) State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [shakePin, setShakePin] = useState<boolean>(false);

  // Group Media State
  const [activeGroupPhotoIdx, setActiveGroupPhotoIdx] = useState(0);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<GalleryPhoto | null>(null);
  const [previewVideoModal, setPreviewVideoModal] = useState<{ title: string; url: string } | null>(null);

  // Distinction between group photos and trip/gallery photos:
  // 1. Group photos: uploaded to 'group-photos/' OR explicitly categorized as 'Grupal' (and NOT in 'schools-gallery/')
  const isGroupPhoto = (p: GalleryPhoto) => {
    const web = p.url_web || '';
    const hd = p.url_hd || '';
    if (web.includes('/group-photos/') || hd.includes('/group-photos/')) return true;
    if (web.includes('/schools-gallery/') || hd.includes('/schools-gallery/')) return false;
    return p.category === 'Grupal';
  };

  const seenGroupUrls = new Set<string>();
  const groupPhotos = photos.filter(p => {
    if (!isGroupPhoto(p)) return false;
    const key = toCdnUrl(p.url_web) || toCdnUrl(p.url_hd) || p.id;
    if (!key || seenGroupUrls.has(key)) return false;
    seenGroupUrls.add(key);
    return true;
  });

  const finalGroupPhotos = groupPhotos.length > 0 
    ? groupPhotos 
    : (school?.group_photo_web && school.group_photo_web.trim() !== '' && !school.group_photo_web.includes('unsplash.com')
        ? [{
            id: 'primary-cover',
            school_id: school.id,
            url_web: school.group_photo_web,
            url_hd: school.group_photo_hd || school.group_photo_web,
            category: 'Grupal',
            sort_order: 1
          } as GalleryPhoto]
        : []);

  const safeGroupPhotoIdx = (activeGroupPhotoIdx >= 0 && activeGroupPhotoIdx < finalGroupPhotos.length)
    ? activeGroupPhotoIdx
    : 0;
  const activeGroupPhoto = finalGroupPhotos.length > 0 ? finalGroupPhotos[safeGroupPhotoIdx] : null;
  const groupVideos = getSchoolVideos(school);

  const seenTripUrls = new Set<string>();
  const tripPhotos = photos.filter(p => {
    if (isGroupPhoto(p)) return false;
    const key = toCdnUrl(p.url_web) || toCdnUrl(p.url_hd) || p.id;
    if (!key || seenTripUrls.has(key)) return false;
    seenTripUrls.add(key);
    return true;
  });

  const bannerUrl = school 
    ? `https://fotos.dreamscda.com.ar/?source=supertourchannel.com.ar&utm_source=supertourchannel.com.ar&utm_medium=banner&colegio=${encodeURIComponent(school.name)}` 
    : 'https://fotos.dreamscda.com.ar/?source=supertourchannel.com.ar&utm_source=supertourchannel.com.ar&utm_medium=banner';

  const handleBannerClick = () => {
    if (!school) return;
    const wasClicked = localStorage.getItem('supertour_clicked_banner_event');
    trackEvent({
      event_type: 'banner_click',
      school_id: school.id,
      destination: school.destination,
      metadata: {
        is_unique: !wasClicked,
        colegio: school.name
      }
    });
    localStorage.setItem('supertour_clicked_banner_event', 'true');
  };

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

  const [schoolLoadError, setSchoolLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchoolData = async () => {
      setLoading(true);
      
      // 1. Fetch Sales Banner Setting (independent of school data)
      let bannerVal = false;
      try {
        const { data: bannerData } = await supabase
          .from('supertour_settings')
          .select('value')
          .eq('key', 'show_sales_banner')
          .maybeSingle();
        if (bannerData) {
          bannerVal = bannerData.value === 'true';
        }
      } catch (bannerErr) {
        console.warn('Could not load show_sales_banner setting from DB:', bannerErr);
      }
      
      // LocalStorage fallback for offline/dev resilience
      if (localStorage.getItem('supertour_show_sales_banner') === 'true') {
        bannerVal = true;
      }
      setBannerEnabled(bannerVal);

      try {
        // 2. Fetch School metadata
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', id)
          .single();

        if (schoolError || !schoolData) {
          throw new Error('Colegio no encontrado');
        }

        setSchool(normalizeSchoolWithCdn(schoolData as School));
        setSchoolLoadError(null);
        
        // Track school view in real-time
        trackEvent({
          event_type: 'school_view',
          school_id: id,
          destination: schoolData.destination
        });
      } catch (err: any) {
        console.warn('Error al cargar datos del colegio desde la base de datos:', err);
        setSchoolLoadError('No se encontró el colegio solicitado o hubo un problema al conectar con el servidor.');
        setSchool(null);
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
    window.scrollTo(0, 0);
  }, [id]);

  // Fetch photos ONLY when the school is unlocked
  useEffect(() => {
    const fetchPhotos = async () => {
      if (!isUnlocked || !school?.id) return;
      try {
        const { data: photoData, error: photoError } = await supabase
          .from('gallery_photos')
          .select('*')
          .eq('school_id', school.id)
          .order('sort_order', { ascending: true });

        if (photoError) throw photoError;

        if (photoData && photoData.length > 0) {
          setPhotos((photoData as GalleryPhoto[]).map(normalizeGalleryPhotoWithCdn));
        } else {
          setPhotos([]);
        }
      } catch (photoErr) {
        console.warn('Error al cargar fotos de la galería:', photoErr);
        setPhotos([]);
      }
    };

    fetchPhotos();
  }, [isUnlocked, school?.id]);

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewPhotoModal(null);
        setPreviewVideoModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check group code unlock state when school changes
  useEffect(() => {
    if (school) {
      const authKey = `supertour_auth_${school.id}`;
      if (sessionStorage.getItem(authKey) === 'true') {
        setIsUnlocked(true);
      } else if (!school.group_code || school.group_code.trim() === '') {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }
    }
  }, [school]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    const expected = (school.group_code || '').trim().toUpperCase();
    const entered = pinInput.trim().toUpperCase();

    if (entered && entered === expected) {
      sessionStorage.setItem(`supertour_auth_${school.id}`, 'true');
      setIsUnlocked(true);
      setPinError(null);
    } else {
      setPinError('El código ingresado no coincide con este grupo. Verificá el código enviado por WhatsApp a tu grupo.');
      setShakePin(true);
      setTimeout(() => setShakePin(false), 600);
    }
  };

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        // Consultar únicamente encuestas activas reales en Supabase
        const { data, error } = await supabase
          .from('surveys')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const survey = normalizeSurvey(data[0]);
          setActiveSurvey(survey);
          
          if (survey) {
            // Check if passenger already voted
            const voted = localStorage.getItem(`supertour_voted_survey_${survey.id}`);
            if (voted) {
              setHasVoted(true);
              setVotedOption(voted);
            }
          }
        } else {
          // Si no hay encuestas activas en la BD, no mostrar el banner
          setActiveSurvey(null);
        }
      } catch (err) {
        console.warn('Error fetching active survey from DB:', err);
        setActiveSurvey(null);
      }
    };
    loadSurvey();
  }, [id]);

  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (optionText: string) => {
    if (hasVoted || isVoting || !activeSurvey || !school) return;

    setIsVoting(true);

    try {
      // 1. Persistir voto en Supabase mediante RPC atómica segura
      const { data: updatedOptionsFromRpc, error: rpcError } = await (supabase as any)
        .rpc('vote_survey_option', {
          p_survey_id: activeSurvey.id,
          p_option_text: optionText
        });

      if (rpcError) throw rpcError;

      // 2. Solo tras confirmación del servidor se marca el voto como registrado
      localStorage.setItem(`supertour_voted_survey_${activeSurvey.id}`, optionText);
      setHasVoted(true);
      setVotedOption(optionText);

      if (updatedOptionsFromRpc && Array.isArray(updatedOptionsFromRpc)) {
        setActiveSurvey(prev => prev ? { ...prev, options: updatedOptionsFromRpc } : prev);
        const total = updatedOptionsFromRpc.reduce((sum: number, o: any) => sum + (o.votes || 0), 0);
        setSurveyVotesTotal(total);
      }

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

      toast.success('¡Tu voto fue registrado exitosamente!');
    } catch (err: any) {
      console.error('Error al registrar voto en el servidor:', err);
      toast.error('No se pudo registrar tu voto en el servidor. Por favor intentá nuevamente.');
      // NO se marca setHasVoted(true) ni se confirma falsamente el voto
    } finally {
      setIsVoting(false);
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
        <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-zinc-800">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-900/60 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={26} className="text-amber-400" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Colegio no encontrado
          </h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            {schoolLoadError || 'No se encontró la información del viaje solicitado en el sistema.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-wider glow-yellow"
          >
            Volver al Calendario
          </button>
        </div>
      </div>
    );
  }

  // Security Gate Screen if not unlocked
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-x-hidden flex flex-col justify-between w-full">
        <Navbar />

        {/* Decorative Blur lights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-[120px] pointer-events-none z-0" />

        <div className="max-w-md mx-auto w-full px-4 pt-36 pb-20 relative z-10 flex-1 flex flex-col justify-center">
          <div className={`glass-card rounded-3xl border border-zinc-800/80 p-8 bg-zinc-950/90 shadow-2xl backdrop-blur-md text-center ${shakePin ? 'animate-[shake_0.4s]' : ''}`}>
            {/* Lock Icon */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 glow-yellow">
              <Lock size={28} className="text-primary" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-3">
              <Sparkles size={12} />
              Acceso Privado al Grupo
            </div>

            <h1 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
              {school.name}
            </h1>

            {school.school_names && school.school_names.length > 1 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-2.5">
                {school.school_names.map((sName, idx) => (
                  <span key={idx} className="inline-flex items-center text-xs font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-md uppercase">
                    {sName}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 mt-2 font-medium">
              <span>{school.destination}</span>
              <span>•</span>
              <span>{formatDate(school.travel_date)}</span>
            </div>

            <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
              Ingresá el <strong className="text-white">Código de Grupo</strong> enviado por WhatsApp para desbloquear y ver las fotos y videos oficiales de este viaje.
            </p>

            {/* Error Message */}
            {pinError && (
              <div role="alert" className="mt-4 p-3.5 rounded-xl bg-red-950/50 border border-red-900/60 text-red-400 text-xs text-left flex items-start gap-2.5 animate-fade-in">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{pinError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleVerifyPin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="school-pin-input-field" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 text-left">
                  Código de Grupo:
                </label>
                <input
                  id="school-pin-input-field"
                  type="text"
                  autoFocus
                  maxLength={12}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError(null);
                  }}
                  placeholder="EJ: 0001"
                  className="w-full text-center text-2xl font-mono font-black uppercase tracking-widest py-3.5 px-4 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-primary text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-inner placeholder:text-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={!pinInput.trim()}
                className="w-full py-4 rounded-xl bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-widest transition-all glow-yellow disabled:opacity-40 disabled:scale-95 disabled:hover:bg-primary shadow-lg cursor-pointer"
              >
                Ingresar a la Galería
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 flex items-center justify-center gap-1.5 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors w-full"
            >
              <ArrowLeft size={14} />
              Volver al Calendario
            </button>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden w-full">
      <Navbar />

      {/* Decorative Blur lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-[120px] pointer-events-none z-0" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 relative">
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
              {school.school_names && school.school_names.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                  {school.school_names.map((sName, idx) => (
                    <span key={idx} className="inline-flex items-center text-xs font-black text-primary bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg uppercase">
                      {sName}
                    </span>
                  ))}
                </div>
              )}
              
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

            {/* Quick Actions (Videos scroll if available) */}
            {groupVideos.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={() => document.getElementById('seccion-videos')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-black text-xs uppercase tracking-wider text-white transition-all duration-300 w-full sm:w-auto"
                >
                  <Film size={16} className="text-primary" />
                  Ver Videos ({groupVideos.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECCIÓN 1: GALERÍA DE FOTOS GRUPALES (NIVEL DE GRUPO)          */}
        {/* ============================================================== */}
        <section className="mb-16 select-none">
          <div className="text-center md:text-left mb-6">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
              Recuerdos Oficiales
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
              <Users size={20} className="text-primary" />
              {finalGroupPhotos.length > 1 ? `Galería de Fotos Grupales (${finalGroupPhotos.length})` : 'La Foto Grupal Oficial'}
            </h2>
            {finalGroupPhotos.length > 1 && (
              <p className="text-zinc-400 text-xs mt-1">
                Hacé clic en las miniaturas para alternar entre las fotos grupales tomadas en el viaje.
              </p>
            )}
          </div>

          {activeGroupPhoto ? (
            <div className="space-y-4">
              {/* Foto Destacada Principal */}
              <div className="glass-card rounded-3xl overflow-hidden p-3 border border-zinc-800/40 shadow-premium">
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-zinc-900 group bg-black">
                  <img
                    src={toCdnUrl(activeGroupPhoto.url_web || activeGroupPhoto.url_hd || school.group_photo_web)}
                    alt={`${school.name} - Foto Grupal`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                  />
                  
                  {/* Badge Superior */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-zinc-800 text-[10px] font-black text-white uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                      <Sparkles size={11} className="text-primary" />
                      Foto Grupal {finalGroupPhotos.length > 1 ? `#${safeGroupPhotoIdx + 1} de ${finalGroupPhotos.length}` : 'Oficial'}
                    </span>
                  </div>

                  {/* Overlay Inferior */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-6">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest hidden sm:block">
                      {school.name} • Viaje a {school.destination} • {formatDate(school.travel_date)}
                    </span>
                    
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => setPreviewPhotoModal(activeGroupPhoto)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-white border border-zinc-700 text-xs font-black uppercase tracking-wider transition-all"
                      >
                        <ZoomIn size={14} />
                        Ver Completa
                      </button>
                      <button
                        onClick={() => {
                          downloadFileDirectly(activeGroupPhoto.url_hd || activeGroupPhoto.url_web || school.group_photo_hd, `SuperTour-${school.name}-Grupal-${safeGroupPhotoIdx + 1}.jpg`);
                          trackEvent({
                            event_type: 'photo_download',
                            school_id: school.id,
                            destination: school.destination,
                            metadata: { type: 'grupal', title: `Foto Grupal #${safeGroupPhotoIdx + 1}`, size: 'HD' }
                          });
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider transition-all glow-yellow"
                      >
                        <Download size={14} />
                        Descargar HD
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selector de Miniaturas si hay más de 1 foto grupal */}
              {finalGroupPhotos.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {finalGroupPhotos.map((gPhoto, gIdx) => {
                    const isSelected = safeGroupPhotoIdx === gIdx;
                    return (
                      <button
                        key={gPhoto.id || gIdx}
                        onClick={() => setActiveGroupPhotoIdx(gIdx)}
                        className={`relative flex-shrink-0 w-28 sm:w-36 aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                          isSelected 
                            ? 'border-primary ring-2 ring-primary/40 scale-[1.03] shadow-lg' 
                            : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'
                        }`}
                      >
                        <img
                          src={toCdnUrl(gPhoto.url_web || gPhoto.url_hd)}
                          alt={`Miniatura Grupal ${gIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-black text-white uppercase">
                          #{gIdx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-8 sm:p-12 border border-zinc-800/40 text-center shadow-premium bg-zinc-950/60">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 glow-yellow">
                <Users size={28} className="text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight">
                Fotos Grupales en Preparación
              </h3>
              <p className="text-zinc-400 text-xs mt-2 max-w-md mx-auto leading-relaxed">
                Los coordinadores de SuperTour están preparando las fotos oficiales de este grupo. Estarán disponibles aquí a la brevedad.
              </p>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* SECCIÓN 2: GALERÍA DE VIDEOS (DEBAJO DE FOTOS GRUPALES)        */}
        {/* ============================================================== */}
        <section id="seccion-videos" className="mb-16 select-none animate-fade-in">
          <div className="text-center md:text-left mb-6">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
              Recuerdos Audiovisuales
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
              <Film size={20} className="text-primary animate-pulse" />
              {groupVideos.length > 0 ? `Videos del Viaje (${groupVideos.length})` : 'Video del Viaje'}
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">
              Mirá y descargá las filmaciones y material multimedia exclusivo de tu grupo de egresados.
            </p>
          </div>

          {groupVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupVideos.map((vid, vIdx) => {
                const isZip = vid.url.toLowerCase().endsWith('.zip');
                const isVideoFile = !isZip;

                return (
                  <div
                    key={vid.id || vIdx}
                    className="glass-card rounded-3xl overflow-hidden border border-zinc-800/40 p-4 bg-zinc-950/80 shadow-premium flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all"
                  >
                    {isVideoFile ? (
                      <div className="rounded-2xl overflow-hidden bg-black aspect-video relative group/v">
                        <video
                          controls
                          preload="metadata"
                          className="w-full h-full object-contain bg-black"
                          src={toCdnUrl(vid.url)}
                        >
                          Tu navegador no soporta la reproducción de video HTML5.
                        </video>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-zinc-900/60 aspect-video flex flex-col items-center justify-center p-4 text-center border border-zinc-800">
                        <Layers size={36} className="text-primary mb-2" />
                        <span className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                          Archivo Multimedia (ZIP)
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase mt-1">
                          Descargá el paquete completo
                        </span>
                      </div>
                    )}

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black uppercase text-white tracking-tight line-clamp-1" title={vid.title}>
                          {vid.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase text-primary flex-shrink-0">
                          {isZip ? 'ZIP' : 'VIDEO'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isVideoFile && (
                          <button
                            type="button"
                            onClick={() => setPreviewVideoModal({ title: vid.title, url: vid.url })}
                            className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Play size={12} className="text-primary fill-primary" />
                            Pantalla Completa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            downloadFileDirectly(vid.url, `${vid.title || 'Video'}${isZip ? '.zip' : '.mp4'}`);
                            trackEvent({
                              event_type: 'photo_download',
                              school_id: school.id,
                              destination: school.destination,
                              metadata: { type: 'video', title: vid.title, size: isZip ? 'ZIP' : 'MP4' }
                            });
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors glow-yellow"
                        >
                          <Download size={13} />
                          Descargar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-8 sm:p-12 border border-zinc-800/40 text-center shadow-premium bg-zinc-950/60">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 glow-yellow">
                <Film size={28} className="text-primary" />
              </div>
              <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight">
                Video del Viaje en Preparación
              </h3>
              <p className="text-zinc-400 text-xs mt-2 max-w-md mx-auto leading-relaxed">
                El material audiovisual de este grupo está siendo procesado por los coordinadores de SuperTour. Estará disponible aquí muy pronto.
              </p>
            </div>
          )}
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

              <div className="flex-shrink-0 w-full md:w-auto">
                {hasVoted ? (
                  <div className="px-5 py-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md w-full">
                    <CheckCircle2 size={15} />
                    Encuesta Respondida ✓
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/encuesta/${activeSurvey.id}?schoolId=${school.id}`)}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.03] glow-yellow shadow-md w-full"
                  >
                    <Send size={13} />
                    Responder Encuesta
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Sales Promo Banner */}
        {bannerEnabled && (
          <div className="glass-card rounded-3xl border border-zinc-800/40 p-6 sm:p-7 bg-zinc-950/85 shadow-premium relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 animate-fade-in select-none">
            <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest leading-none glow-yellow">
                <Sparkles size={10} />
                Oferta Exclusiva Egresados
              </div>
              <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight leading-snug">
                Adquirí tus fotos adicionales del viaje
              </h3>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto">
              <a
                href={bannerUrl}
                onClick={handleBannerClick}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.03] glow-yellow shadow-md w-full md:w-auto"
              >
                <Sparkles size={13} />
                Ir a la Tienda
              </a>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECCIÓN 3: GALERÍA DE FOTOS DEL VIAJE (FOTOS DE ACTIVIDADES)   */}
        {/* ============================================================== */}
        <section className="mb-16 select-none">
          <div className="text-center md:text-left mb-6">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
              Galería Flexible
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
              <ImageIcon size={20} className="text-primary" />
              Galería Completa de Fotos ({tripPhotos.length})
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">
              Fotos exclusivas de las excursiones, fiestas y actividades compartidas por todos los chicos.
            </p>
          </div>

          <PremiumGallery photos={tripPhotos} schoolName={school.name} destination={school.destination} />
        </section>

        {/* MODAL DE ZOOM / VISTA COMPLETA DE FOTO GRUPAL */}
        {previewPhotoModal && createPortal(
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in select-none"
            onClick={() => setPreviewPhotoModal(null)}
          >
            <div 
              className="relative max-w-5xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-900 flex-shrink-0">
                <span className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-2">
                  <ImageIcon size={14} className="text-primary" />
                  Foto Grupal Oficial en Alta Definición
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadFileDirectly(previewPhotoModal.url_hd || previewPhotoModal.url_web, `SuperTour-${school.name}-Grupal.jpg`);
                      trackEvent({
                        event_type: 'photo_download',
                        school_id: school.id,
                        destination: school.destination,
                        metadata: { type: 'grupal', title: 'Foto Grupal Ampliada', size: 'HD' }
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 glow-yellow"
                  >
                    <Download size={13} />
                    Descargar HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPhotoModal(null)}
                    className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-black/60">
                <img
                  src={toCdnUrl(previewPhotoModal.url_hd || previewPhotoModal.url_web)}
                  alt="Vista completa grupal"
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
                />
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL DE REPRODUCTOR DE VIDEO A PANTALLA COMPLETA */}
        {previewVideoModal && createPortal(
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in select-none"
            onClick={() => setPreviewVideoModal(null)}
          >
            <div 
              className="relative max-w-4xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 flex items-center justify-between border-b border-zinc-900">
                <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2 truncate">
                  <Film size={14} className="text-primary" />
                  {previewVideoModal.title}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadFileDirectly(previewVideoModal.url, `${previewVideoModal.title}.mp4`)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 border border-zinc-800"
                  >
                    <Download size={13} />
                    Descargar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewVideoModal(null)}
                    className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-black flex items-center justify-center">
                <video
                  controls
                  autoPlay
                  src={toCdnUrl(previewVideoModal.url)}
                  className="w-full max-h-[70vh] rounded-2xl bg-black"
                >
                  Tu navegador no soporta la reproducción de video HTML5.
                </video>
              </div>
            </div>
          </div>,
          document.body
        )}
      </main>
      <Footer />
    </div>
  );
};
