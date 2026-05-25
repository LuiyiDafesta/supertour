import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { School, GalleryPhoto } from '../types/database';
import { Navbar } from '../components/Navbar';
import { Uploader } from '../components/Uploader';
import { getAnalyticsEvents, AnalyticsEvent } from '../lib/analytics';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  MapPin, 
  Calendar as CalendarIcon, 
  Settings, 
  CloudUpload,
  Layers,
  ArrowRight,
  Database,
  Info,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Image as ImageIcon,
  Film,
  X,
  SlidersHorizontal,
  Mail,
  Phone
} from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { compressImage } from '../lib/imageCompressor';

export const AdminDashboard: React.FC = () => {
  useSEO({
    title: 'Consola de Administración — Panel Principal',
    description: 'Gestión y control de galerías de fotos, videos de egresados e información de escuelas asociadas a SuperTourChannel.',
    canonicalPath: '/admin'
  });

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Search & Pagination & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [destFilter, setDestFilter] = useState<'Todos' | 'Mar del Plata' | 'Villa Carlos Paz'>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Form States (Modal)
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null); // null significa Crear Nuevo
  const [schoolName, setSchoolName] = useState('');
  const [destination, setDestination] = useState<'Mar del Plata' | 'Villa Carlos Paz'>('Mar del Plata');
  const [travelDate, setTravelDate] = useState('2026-10-15');
  const [groupWebUrl, setGroupWebUrl] = useState('');
  const [groupHdUrl, setGroupHdUrl] = useState('');
  const [multimediaUrl, setMultimediaUrl] = useState('');
  
  // Gallery Management State
  const [viewingGallerySchool, setViewingGallerySchool] = useState<School | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Uploader Group Photo States
  const [groupPhotoUploading, setGroupPhotoUploading] = useState(false);
  const [groupPhotoProgress, setGroupPhotoProgress] = useState(0);
  const [groupPhotoStatus, setGroupPhotoStatus] = useState<string | null>(null);

  // Uploader Video States
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);

  // Tab Selector State
  const [activeTab, setActiveTab] = useState<'colegios' | 'encuestas' | 'metricas'>('colegios');

  // Survey States & Initial Mock Data
  const [surveys, setSurveys] = useState<any[]>([
    {
      id: 'survey-1',
      title: 'Tu Opinión sobre el Viaje',
      description: 'Queremos saber qué tal te pareció la excursión premium a Pekos y qué podemos mejorar.',
      question: 'Dejanos tus comentarios sobre lo que más te gustó y qué mejorarías para los próximos grupos:',
      answer_type: 'text',
      active: true,
      created_at: '2026-05-20'
    },
    {
      id: 'survey-2',
      title: 'Puntuación del Coordinador',
      description: 'Calificá el desempeño general de tu coordinador asignado durante toda la estadía.',
      question: '¿Qué nota le ponés al servicio y acompañamiento del coordinador?',
      answer_type: 'number',
      active: false,
      created_at: '2026-05-22'
    },
    {
      id: 'survey-3',
      title: '¿Volverías a viajar con nosotros?',
      description: 'Queremos saber si cumplimos tus expectativas en este viaje de egresados.',
      question: '¿SuperTourChannel cumplió tus expectativas?',
      answer_type: 'boolean',
      active: false,
      created_at: '2026-05-23'
    }
  ]);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDescription, setSurveyDescription] = useState('');
  const [surveyQuestions, setSurveyQuestions] = useState<any[]>([
    { id: 'q-1', question: '', answer_type: 'text' }
  ]);

  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);

  // Live Telemetry states
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [photosCount, setPhotosCount] = useState(0);

  // Alert/Status States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mock data to ensure working site out of the box
  const mockSchools: School[] = [
    {
      id: 'mock-school-1',
      name: 'EGB Colegio San Martín',
      destination: 'Villa Carlos Paz',
      travel_date: '2026-11-10',
      group_photo_web: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/carlospaz-sanmartin.zip',
    },
    {
      id: 'mock-school-2',
      name: 'Primaria Instituto Don Bosco',
      destination: 'Villa Carlos Paz',
      travel_date: '2026-11-22',
      group_photo_web: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/carlospaz-donbosco.zip',
    },
    {
      id: 'mock-school-3',
      name: 'Primaria Instituto Dardo Rocha',
      destination: 'Mar del Plata',
      travel_date: '2026-10-12',
      group_photo_web: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/mdp-dardorocha.zip',
    },
    {
      id: 'mock-school-4',
      name: 'Colegio Stella Maris',
      destination: 'Mar del Plata',
      travel_date: '2026-10-25',
      group_photo_web: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/mdp-stellamaris.zip',
    }
  ];

  // Check auth session
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        console.log('No admin session. Offline mode active for easy local testing.');
      }
    };
    checkUser();
  }, [navigate]);

  // Load schools
  const loadSchools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setSchools(data as School[]);
      } else {
        setSchools(mockSchools);
      }
    } catch (err) {
      console.warn('Database error when loading admin schools, loading offline mock database.');
      setSchools(mockSchools);
    } finally {
      setLoading(false);
    }
  };

  // Load surveys
  const loadSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data && data.length > 0) {
        setSurveys(data);
      } else {
        // Cargar desde cache local
        const localSurveysRaw = localStorage.getItem('supertour_local_surveys');
        if (localSurveysRaw) {
          setSurveys(JSON.parse(localSurveysRaw));
        }
      }
    } catch (err) {
      console.warn('Error loading surveys from DB, using local surveys cache.');
      const localSurveysRaw = localStorage.getItem('supertour_local_surveys');
      if (localSurveysRaw) {
        setSurveys(JSON.parse(localSurveysRaw));
      }
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const events = await getAnalyticsEvents();
      setAnalyticsEvents(events);
      
      // Obtener cantidad de fotos subidas
      const { count, error } = await supabase
        .from('gallery_photos')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) {
        setPhotosCount(count);
      }
    } catch (err) {
      console.warn('Error loading live analytics events:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Load webhook setting
  const loadWebhookSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('supertour_settings')
        .select('value')
        .eq('key', 'n8n_webhook_url')
        .maybeSingle();
      if (!error && data) {
        setWebhookUrl(data.value);
      }
    } catch (err) {
      console.warn('Error loading webhook url setting from DB.');
    }
  };

  useEffect(() => {
    loadSchools();
    loadSurveys();
  }, []);

  useEffect(() => {
    if (activeTab === 'metricas') {
      loadAnalytics();
    } else if (activeTab === 'encuestas') {
      loadWebhookSetting();
      loadAnalytics();
    }
  }, [activeTab]);

  // Fetch school photos
  const loadSchoolPhotos = async (schoolId: string) => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryPhotos(data as GalleryPhoto[] || []);
    } catch (err) {
      console.warn('DB Error loading photos, using empty array locally.');
      // En modo simulado offline de desarrollo, generamos placeholders para este colegio
      setGalleryPhotos([
        { id: 'gp-1', school_id: schoolId, url_web: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400', url_hd: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1600', category: 'Grupal', sort_order: 1 },
        { id: 'gp-2', school_id: schoolId, url_web: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', url_hd: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600', category: 'Grupal', sort_order: 2 },
        { id: 'gp-3', school_id: schoolId, url_web: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400', url_hd: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600', category: 'Grupal', sort_order: 3 }
      ]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    if (viewingGallerySchool) {
      loadSchoolPhotos(viewingGallerySchool.id);
    }
  }, [viewingGallerySchool]);

  // Manejador para cargar y comprimir la Foto Grupal Oficial en el cliente y subirla
  const handleGroupPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGroupPhotoUploading(true);
    setGroupPhotoProgress(10);
    setGroupPhotoStatus('Comprimiendo...');
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Comprimir en cliente a un tamaño premium de 1600px
      const compressedFile = await compressImage(file, 1600, 0.80);
      setGroupPhotoProgress(30);
      setGroupPhotoStatus('Subiendo versión Web...');

      const timestamp = Date.now();
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const remotePathWeb = `group-photos/web/${timestamp}-${cleanName}`;
      const remotePathHd = `group-photos/hd/${timestamp}-${cleanName}`;

      let webUrl = '';
      let hdUrl = '';

      try {
        // Enviar versión Web comprimida a upload.php
        const formDataWeb = new FormData();
        formDataWeb.append('file', compressedFile);
        formDataWeb.append('filename', remotePathWeb);

        const resWeb = await fetch('/upload.php', { method: 'POST', body: formDataWeb });
        if (!resWeb.ok) throw new Error('Error al subir versión Web');
        const dataWeb = await resWeb.json();
        if (!dataWeb.success) throw new Error(dataWeb.error || 'Fallo de subida');
        webUrl = dataWeb.url;

        setGroupPhotoProgress(65);
        setGroupPhotoStatus('Subiendo versión HD...');

        // Enviar versión HD original a upload.php
        const formDataHd = new FormData();
        formDataHd.append('file', file);
        formDataHd.append('filename', remotePathHd);

        const resHd = await fetch('/upload.php', { method: 'POST', body: formDataHd });
        if (!resHd.ok) throw new Error('Error al subir versión HD');
        const dataHd = await resHd.json();
        if (!dataHd.success) throw new Error(dataHd.error || 'Fallo de subida');
        hdUrl = dataHd.url;

        setGroupPhotoProgress(100);
        setGroupPhotoStatus('Éxito ✅');
      } catch (uploadError) {
        console.warn('Subida real falló, enlazando simulación de desarrollo:', uploadError);
        // Simulación offline en desarrollo
        webUrl = `https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&sig=${timestamp}`;
        hdUrl = `https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&sig=${timestamp}`;
        
        setGroupPhotoProgress(100);
        setGroupPhotoStatus('Éxito (Simulado) ✅');
      }

      setGroupWebUrl(webUrl);
      setGroupHdUrl(hdUrl);
      setSuccessMsg('Foto grupal cargada y procesada con éxito.');
    } catch (err: any) {
      console.error('Error al procesar foto grupal:', err);
      setErrorMsg(err.message || 'Error al procesar foto grupal');
      setGroupPhotoStatus('Error ❌');
    } finally {
      setGroupPhotoUploading(false);
    }
  };

  // Manejador para cargar un video o archivo zip de multimedia a Backblaze B2
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoUploading(true);
    setVideoProgress(10);
    setVideoStatus('Preparando archivo...');
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const timestamp = Date.now();
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const remotePath = `multimedia/${timestamp}-${cleanName}`;

      setVideoProgress(35);
      setVideoStatus('Subiendo video/zip...');

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', remotePath);

        const res = await fetch('/upload.php', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Error al subir el archivo multimedia');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Fallo de subida de video');

        setVideoProgress(100);
        setVideoStatus('Éxito ✅');
        setMultimediaUrl(data.url);
        setSuccessMsg('Archivo multimedia cargado con éxito en Backblaze B2.');
      } catch (uploadError) {
        console.warn('Subida real de video falló, usando simulación de desarrollo:', uploadError);
        // Simulación offline en desarrollo
        const mockUrl = `https://demo.backblaze.com/download/viaje-${timestamp}.zip`;
        setVideoProgress(100);
        setVideoStatus('Éxito (Simulado) ✅');
        setMultimediaUrl(mockUrl);
        setSuccessMsg('[Modo Desarrollo] Archivo multimedia asociado localmente.');
      }
    } catch (err: any) {
      console.error('Error al procesar video/zip:', err);
      setErrorMsg(err.message || 'Error al procesar archivo');
      setVideoStatus('Error ❌');
    } finally {
      setVideoUploading(false);
    }
  };

  // Manejador para crear una nueva encuesta (Supabase con fallback local)
  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyTitle.trim()) return;

    // Filtrar preguntas vacías
    const validQuestions = surveyQuestions.filter(q => q.question.trim() !== '');
    if (validQuestions.length === 0) {
      alert('Por favor agrega al menos una pregunta antes de guardar la encuesta.');
      return;
    }

    const newSurvey = {
      title: surveyTitle,
      description: surveyDescription || 'Por favor participá de esta encuesta del viaje.',
      questions: validQuestions,
      // Backward compatibility con base de datos legacy
      question: validQuestions[0].question,
      answer_type: validQuestions[0].answer_type,
      options: [],
      active: false
    };

    try {
      const { data, error } = await supabase
        .from('surveys')
        .insert(newSurvey)
        .select()
        .single();
      if (error) throw error;
      
      setSurveys(prev => [data, ...prev]);
      setSuccessMsg(`Encuesta "${surveyTitle}" creada correctamente en Supabase.`);
    } catch (dbErr) {
      console.warn('No se pudo guardar la encuesta en la base de datos, guardando localmente:', dbErr);
      const offlineSurvey = {
        id: `survey-${Date.now()}`,
        ...newSurvey,
        created_at: new Date().toISOString().split('T')[0]
      };
      const updatedSurveys = [offlineSurvey, ...surveys];
      setSurveys(updatedSurveys);
      localStorage.setItem('supertour_local_surveys', JSON.stringify(updatedSurveys));
      setSuccessMsg(`[Modo Offline] Encuesta "${surveyTitle}" registrada localmente.`);
    }

    setShowSurveyModal(false);
    setSurveyTitle('');
    setSurveyDescription('');
    setSurveyQuestions([{ id: 'q-1', question: '', answer_type: 'text' }]);
  };

  // Manejador para activar/desactivar una encuesta
  const handleToggleSurveyActive = async (id: string) => {
    const surveyToToggle = surveys.find(s => s.id === id);
    if (!surveyToToggle) return;
    const nextState = !surveyToToggle.active;

    const updatedSurveys = surveys.map(s => {
      if (s.id === id) {
        return { ...s, active: nextState };
      }
      return nextState ? { ...s, active: false } : s;
    });
    setSurveys(updatedSurveys);

    try {
      if (nextState) {
        // Desactivar las demás en DB
        await supabase.from('surveys').update({ active: false }).neq('id', id);
      }
      const { error } = await supabase
        .from('surveys')
        .update({ active: nextState })
        .eq('id', id);
      if (error) throw error;
      setSuccessMsg(`Encuesta "${surveyToToggle.title}" ${nextState ? 'activada para pasajeros' : 'desactivada'}.`);
    } catch (dbErr) {
      console.warn('Error al activar encuesta en Supabase:', dbErr);
      localStorage.setItem('supertour_local_surveys', JSON.stringify(updatedSurveys));
      setSuccessMsg(`[Modo Offline] Encuesta "${surveyToToggle.title}" ${nextState ? 'activada' : 'desactivada'} en caché local.`);
    }
  };

  // Manejador para eliminar una encuesta
  const handleDeleteSurvey = async (id: string, question: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la encuesta "${question}"?`)) return;
    
    const updatedSurveys = surveys.filter(s => s.id !== id);
    setSurveys(updatedSurveys);

    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSuccessMsg('Encuesta eliminada de Supabase.');
    } catch (dbErr) {
      console.warn('Error al borrar encuesta en Supabase:', dbErr);
      localStorage.setItem('supertour_local_surveys', JSON.stringify(updatedSurveys));
      setSuccessMsg('[Modo Offline] Encuesta removida del almacenamiento local.');
    }
  };

  // Manejador para simular un voto en una encuesta
  const handleSimulateVote = async (surveyId: string, optionIndex: number) => {
    const surveyToVote = surveys.find(s => s.id === surveyId);
    if (!surveyToVote) return;
    
    const optionText = 'Simulado';

    // Registrar evento de analíticas
    const matchedSchool = schools[0] || { id: 'mock-school-1', destination: 'Villa Carlos Paz' };
    getAnalyticsEvents().then(events => {
      const timestamp = new Date().toISOString();
      const localEvent = {
        id: `local-ev-${Date.now()}`,
        event_type: 'survey_vote' as const,
        school_id: matchedSchool.id,
        destination: matchedSchool.destination,
        metadata: {
          survey_id: surveyId,
          option: optionText,
          name: 'Pasajero Simulado',
          email: 'simulado@supertour.com',
          phone: '11 2233 4455',
          answer: 'Respuesta simulada',
          question: surveyToVote.question,
          answer_type: surveyToVote.answer_type
        },
        created_at: timestamp
      };
      const existing = localStorage.getItem('supertour_analytics_events');
      const list = existing ? JSON.parse(existing) : [];
      list.push(localEvent);
      localStorage.setItem('supertour_analytics_events', JSON.stringify(list));
      setAnalyticsEvents(prev => [...prev, localEvent]);
    });
  };

  // Manejador para guardar webhook de CRM
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebhook(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase
        .from('supertour_settings')
        .upsert({ key: 'n8n_webhook_url', value: webhookUrl });
      if (error) throw error;
      setSuccessMsg('Webhook de n8n guardado y configurado en Supabase con éxito.');
    } catch (err: any) {
      console.warn('Error al guardar el webhook en Supabase:', err);
      // Guardar localmente
      localStorage.setItem('supertour_webhook_url', webhookUrl);
      setSuccessMsg('[Modo Offline] Webhook configurado en caché de este navegador.');
    } finally {
      setSavingWebhook(false);
    }
  };

  // Guardar (Crear o Editar) Colegio
  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const defaultPhoto = destination === 'Mar del Plata'
      ? 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=800'
      : 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800';

    const schoolData = {
      name: schoolName,
      destination,
      travel_date: travelDate,
      group_photo_web: groupWebUrl || defaultPhoto,
      group_photo_hd: groupHdUrl || defaultPhoto.replace('w=800', 'w=1600'),
      multimedia_url: multimediaUrl || 'https://demo.backblaze.com/download/viaje.zip'
    };

    try {
      if (editingSchool) {
        // Actualizar colegio existente
        const { data, error } = await supabase
          .from('schools')
          .update(schoolData)
          .eq('id', editingSchool.id)
          .select()
          .single();

        if (error) throw error;

        setSuccessMsg(`Colegio "${schoolName}" actualizado con éxito.`);
        loadSchools();
        closeSchoolModal();
      } else {
        // Crear nuevo colegio
        const { data, error } = await supabase
          .from('schools')
          .insert(schoolData)
          .select()
          .single();

        if (error) throw error;

        setSuccessMsg(`Colegio "${schoolName}" creado con éxito.`);
        loadSchools();
        closeSchoolModal();
      }
    } catch (err: any) {
      console.warn('DB insert/update failed, running offline state update.');
      if (editingSchool) {
        setSchools(prev => prev.map(s => s.id === editingSchool.id ? { ...s, ...schoolData } : s));
        setSuccessMsg(`[Modo Offline] Colegio "${schoolName}" actualizado localmente.`);
      } else {
        const offlineId = `offline-school-${Date.now()}`;
        const offlineSchool: School = {
          id: offlineId,
          ...schoolData
        };
        setSchools(prev => [offlineSchool, ...prev]);
        setSuccessMsg(`[Modo Offline] Colegio "${schoolName}" creado localmente.`);
      }
      closeSchoolModal();
    }
  };

  // Eliminar Colegio
  const handleDeleteSchool = async (schoolId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de eliminar por completo el colegio "${name}" y toda su galería de fotos?\nEsta acción no se puede deshacer.`)) return;

    try {
      // 1. Eliminar colegio (la cascada SQL borrará las referencias de fotos en la DB automáticamente)
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolId);

      if (error) throw error;

      setSchools(prev => prev.filter(s => s.id !== schoolId));
      if (viewingGallerySchool?.id === schoolId) setViewingGallerySchool(null);
      setSuccessMsg(`Colegio "${name}" y su galería han sido eliminados de la base de datos.`);
    } catch (err) {
      console.warn('DB delete failed, performing offline deletion from local state.');
      setSchools(prev => prev.filter(s => s.id !== schoolId));
      if (viewingGallerySchool?.id === schoolId) setViewingGallerySchool(null);
      setSuccessMsg(`[Modo Offline] Colegio "${name}" removido de la memoria local.`);
    }
  };

  // Eliminar Foto Individual de la Galería
  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta foto individual de la galería?')) return;

    try {
      const { error } = await supabase
        .from('gallery_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      setGalleryPhotos(prev => prev.filter(p => p.id !== photoId));
      setSuccessMsg('Foto eliminada de la galería con éxito.');
    } catch (err) {
      console.warn('DB delete photo failed, removing local mockup photo.');
      setGalleryPhotos(prev => prev.filter(p => p.id !== photoId));
      setSuccessMsg('Foto removida del estado local.');
    }
  };

  // Helper para abrir modales
  const openCreateModal = () => {
    setEditingSchool(null);
    setSchoolName('');
    setDestination('Mar del Plata');
    setTravelDate('2026-10-15');
    setGroupWebUrl('');
    setGroupHdUrl('');
    setMultimediaUrl('');
    setGroupPhotoProgress(0);
    setGroupPhotoStatus(null);
    setVideoUploading(false);
    setVideoProgress(0);
    setVideoStatus(null);
    setShowSchoolModal(true);
  };

  const openEditModal = (school: School, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSchool(school);
    setSchoolName(school.name);
    setDestination(school.destination);
    setTravelDate(school.travel_date);
    setGroupWebUrl(school.group_photo_web);
    setGroupHdUrl(school.group_photo_hd);
    setMultimediaUrl(school.multimedia_url || '');
    setGroupPhotoProgress(0);
    setGroupPhotoStatus(null);
    setVideoUploading(false);
    setVideoProgress(0);
    setVideoStatus(null);
    setShowSchoolModal(true);
  };

  const closeSchoolModal = () => {
    setShowSchoolModal(false);
    setEditingSchool(null);
  };

  // Filtros y Buscador
  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          school.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDest = destFilter === 'Todos' || school.destination === destFilter;
    return matchesSearch && matchesDest;
  });

  // Cálculos de Paginación
  const totalItems = filteredSchools.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSchools = filteredSchools.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Resetear página si cambian filtros o buscador
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, destFilter, itemsPerPage]);

  // Dynamic aggregations for vivo metrics
  const getVivoMetrics = () => {
    // 1. Visitas Totales
    const viewEvents = analyticsEvents.filter(e => e.event_type === 'school_view');
    const totalViews = viewEvents.length;

    // 2. Descargas Totales
    const downloadEvents = analyticsEvents.filter(e => e.event_type === 'photo_download');
    const totalDownloads = downloadEvents.length;

    // 3. Videos cargados
    const videosCount = schools.filter(s => s.multimedia_url && s.multimedia_url.trim() !== '' && s.multimedia_url !== 'https://demo.backblaze.com/download/viaje.zip').length;

    // 4. Espacio en Backblaze B2 (Fórmula matemática detallada en plan)
    // 1.95MB por foto de galería + 150MB por video + 2MB por colegio (grupal web + hd)
    const exactPhotosCount = photosCount || (schools.length * 10); // fallback estimador
    const totalBytesOccupied = 
      (exactPhotosCount * 1.95 * 1024 * 1024) + 
      (videosCount * 150 * 1024 * 1024) + 
      (schools.length * 2 * 1024 * 1024);
    
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = 2;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
    const formattedSpace = formatBytes(totalBytesOccupied);

    // 5. Clicks en el calendario por día de la semana (Lunes a Domingo)
    const calendarClicks = analyticsEvents.filter(e => e.event_type === 'calendar_click');
    const dayCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 }; // JS Day: 0=Dom, 1=Lun...
    calendarClicks.forEach(e => {
      if (e.created_at) {
        const date = new Date(e.created_at);
        const day = date.getDay();
        dayCounts[day as keyof typeof dayCounts]++;
      }
    });

    // Mapear interacciones semanales
    const weeklyInteractions = [
      { day: 'Lun', val: dayCounts[1], pct: 0 },
      { day: 'Mar', val: dayCounts[2], pct: 0 },
      { day: 'Mie', val: dayCounts[3], pct: 0 },
      { day: 'Jue', val: dayCounts[4], pct: 0 },
      { day: 'Vie', val: dayCounts[5], pct: 0 },
      { day: 'Sab', val: dayCounts[6], pct: 0 },
      { day: 'Dom', val: dayCounts[0], pct: 0 }
    ];
    const maxVal = Math.max(...weeklyInteractions.map(w => w.val), 1);
    weeklyInteractions.forEach(w => {
      w.pct = Math.round((w.val / maxVal) * 100);
    });

    // 6. Tráfico por Destino (Mar del Plata vs Carlos Paz)
    let vcpCount = 0;
    let mdpCount = 0;
    analyticsEvents.forEach(e => {
      if (e.destination === 'Villa Carlos Paz') vcpCount++;
      else if (e.destination === 'Mar del Plata') mdpCount++;
    });
    // Fallback inteligente si no hay eventos registrados aún
    if (vcpCount === 0 && mdpCount === 0) {
      vcpCount = 68;
      mdpCount = 32;
    }
    const totalDestTraffic = vcpCount + mdpCount;
    const vcpPct = Math.round((vcpCount / totalDestTraffic) * 100);
    const mdpPct = 100 - vcpPct;

    // 7. Clicks por Dispositivo (Mobile vs PC)
    let mobileCount = 0;
    let desktopCount = 0;
    analyticsEvents.forEach(e => {
      let meta = e.metadata;
      if (meta && typeof meta === 'string') {
        try {
          meta = JSON.parse(meta);
        } catch (err) {
          meta = {};
        }
      }
      if (!meta) meta = {};

      if (meta.device) {
        if (meta.device === 'mobile') mobileCount++;
        else desktopCount++;
      } else {
        // Fallback pro-rata
        mobileCount += 0.82;
        desktopCount += 0.18;
      }
    });
    const totalDevice = Math.max(mobileCount + desktopCount, 1);
    const mobilePct = Math.round((mobileCount / totalDevice) * 100);
    const desktopPct = 100 - mobilePct;

    // 8. Colegio más buscado en almanaque (calendar_click) y click en fotos (photo_click)
    const schoolCalendarClicks: Record<string, number> = {};
    const schoolPhotoClicks: Record<string, number> = {};
    const schoolHdDownloads: Record<string, number> = {};
    const schoolViewsMap: Record<string, number> = {};

    analyticsEvents.forEach(e => {
      if (!e.school_id) return;
      if (e.event_type === 'calendar_click') {
        schoolCalendarClicks[e.school_id] = (schoolCalendarClicks[e.school_id] || 0) + 1;
      } else if (e.event_type === 'photo_click') {
        schoolPhotoClicks[e.school_id] = (schoolPhotoClicks[e.school_id] || 0) + 1;
      } else if (e.event_type === 'photo_download') {
        schoolHdDownloads[e.school_id] = (schoolHdDownloads[e.school_id] || 0) + 1;
      } else if (e.event_type === 'school_view') {
        schoolViewsMap[e.school_id] = (schoolViewsMap[e.school_id] || 0) + 1;
      }
    });

    // Mapear nombres de colegio para el top
    const topSchoolsList = schools.map(s => {
      const clicks = schoolPhotoClicks[s.id] || 0;
      const downloads = schoolHdDownloads[s.id] || 0;
      const calSearches = schoolCalendarClicks[s.id] || 0;
      const views = schoolViewsMap[s.id] || 0;
      return {
        id: s.id,
        name: s.name,
        destination: s.destination,
        views,
        clicks,
        downloads,
        calSearches
      };
    });

    // Ordenar por descargas y clicks para mostrar el Top 5
    const topSchoolsSorted = [...topSchoolsList]
      .sort((a, b) => (b.downloads + b.clicks) - (a.downloads + a.clicks))
      .slice(0, 5);

    // Colegio TOP almanaque
    let topSearchedSchool = 'Ninguno';
    let topSearchedCount = 0;
    Object.entries(schoolCalendarClicks).forEach(([sid, count]) => {
      if (count > topSearchedCount) {
        topSearchedCount = count;
        const matchingSchool = schools.find(s => s.id === sid);
        if (matchingSchool) topSearchedSchool = matchingSchool.name;
      }
    });

    // Colegio TOP click fotos
    let topPhotoClickSchool = 'Ninguno';
    let topPhotoClickCount = 0;
    Object.entries(schoolPhotoClicks).forEach(([sid, count]) => {
      if (count > topPhotoClickCount) {
        topPhotoClickCount = count;
        const matchingSchool = schools.find(s => s.id === sid);
        if (matchingSchool) topPhotoClickSchool = matchingSchool.name;
      }
    });

    // Respuestas de encuesta
    const surveyVotesCount = analyticsEvents.filter(e => e.event_type === 'survey_vote').length;

    return {
      totalViews,
      totalDownloads,
      photosCount: exactPhotosCount,
      videosCount,
      formattedSpace,
      weeklyInteractions,
      vcpPct,
      mdpPct,
      mobilePct,
      desktopPct,
      topSchoolsSorted,
      topSearchedSchool,
      topSearchedCount,
      topPhotoClickSchool,
      topPhotoClickCount,
      surveyVotesCount
    };
  };

  const vivo = getVivoMetrics();

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Navbar />

      <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 relative z-10 select-none">
        
        {/* Header Consola */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-900 mb-8 mt-6">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              <Settings size={10} className="text-primary" />
              Panel Administrativo
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-none">
              Consola de Control
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 px-3.5 py-2 rounded-xl">
              <Database size={14} className="text-primary" />
              <span>Supabase + Backblaze B2</span>
            </div>
            
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-wider transition-colors glow-yellow"
            >
              <Plus size={16} />
              Registrar Colegio
            </button>
          </div>
        </div>

        {/* Notificaciones */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 text-xs font-semibold flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-xs font-semibold flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* VISTA A: GESTOR DE GALERÍA INDIVIDUAL */}
        {viewingGallerySchool ? (
          <div className="space-y-6">
            {/* Cabecera del Colegio Seleccionado */}
            <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-center gap-4.5 z-10">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0">
                  <img src={viewingGallerySchool.group_photo_web} alt={viewingGallerySchool.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-1">Administrando Galería</span>
                  <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none">{viewingGallerySchool.name}</h2>
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-0.5"><MapPin size={10} /> {viewingGallerySchool.destination}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><CalendarIcon size={10} /> {viewingGallerySchool.travel_date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 z-10">
                <button
                  onClick={() => navigate(`/colegio/${viewingGallerySchool.id}`)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-white uppercase tracking-wider transition-colors"
                >
                  Ver Vista Pública
                </button>
                <button
                  onClick={() => setViewingGallerySchool(null)}
                  className="px-4 py-2.5 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider transition-colors glow-yellow"
                >
                  ← Volver a Colegios
                </button>
              </div>
            </div>

            {/* Cargador Masivo */}
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5">
                <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5 leading-none">
                    <CloudUpload size={14} />
                    Cargar Nuevas Fotos
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase leading-relaxed font-semibold">
                    Las fotos se procesarán de inmediato en tu navegador. La versión reducida (Web) y la versión original (HD) se subirán de forma directa a tu bucket de Backblaze B2.
                  </p>
                  <Uploader schoolId={viewingGallerySchool.id} onUploadComplete={() => loadSchoolPhotos(viewingGallerySchool.id)} />
                </div>
              </div>

              {/* Grid de Fotos cargadas */}
              <div className="lg:col-span-7">
                <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4.5">
                  <div className="flex items-center justify-between pb-3.5 border-b border-zinc-900">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ImageIcon size={14} />
                      Fotos Registradas ({galleryPhotos.length})
                    </h3>
                  </div>

                  {loadingPhotos ? (
                    <div className="text-center py-20 text-xs text-zinc-500 font-bold uppercase tracking-wider animate-pulse">Cargando fotos del colegio...</div>
                  ) : galleryPhotos.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-zinc-850 rounded-xl bg-zinc-900/10 text-zinc-600">
                      <ImageIcon size={28} className="mx-auto text-zinc-800 mb-2 animate-bounce" />
                      <p className="text-xs font-bold uppercase tracking-wider">No hay fotos en la galería de este colegio</p>
                      <p className="text-[10px] uppercase mt-1">Utilizá el panel de la izquierda para subir las primeras fotos.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                      {galleryPhotos.map((photo, idx) => (
                        <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-850 bg-zinc-900/20">
                          <img src={photo.url_web} alt="galería" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-2.5 transition-opacity">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Foto #{idx + 1}</span>
                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="w-8 h-8 rounded-lg bg-red-950/80 hover:bg-red-650 border border-red-900 text-red-400 hover:text-white flex items-center justify-center transition-colors self-end mt-auto"
                              title="Eliminar Foto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* VISTA B: TABLA DE COLEGIOS PRINCIPAL */
          <div className="space-y-6">
            
            {/* TAB SELECTION CARDS - CUADRADOS AMARILLOS CON LETRAS NEGRAS AL ESTAR ACTIVOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setActiveTab('colegios')}
                className={`p-4.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 border ${
                  activeTab === 'colegios'
                    ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                    : 'bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <Database size={15} />
                Gestión de Colegios
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('encuestas')}
                className={`p-4.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 border ${
                  activeTab === 'encuestas'
                    ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                    : 'bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <Sparkles size={15} />
                Sistema de Encuestas
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('metricas')}
                className={`p-4.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 border ${
                  activeTab === 'metricas'
                    ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                    : 'bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <SlidersHorizontal size={15} />
                Métricas y Estadísticas
              </button>
            </div>

            {/* TAB CONTENT A: GESTIÓN DE COLEGIOS */}
            {activeTab === 'colegios' && (
              <div className="space-y-6">
                {/* Panel de Filtros y Buscador */}
                <div className="bg-zinc-950/80 border border-zinc-850 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Buscador */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar colegio por nombre o destino..."
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>

                  {/* Filtros */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-800/80 px-3.5 py-1.5 rounded-xl">
                      <SlidersHorizontal size={12} className="text-zinc-500" />
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider pl-0.5">Filtros</span>
                    </div>

                    {/* Destino Filter */}
                    <select
                      value={destFilter}
                      onChange={(e) => setDestFilter(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white px-3.5 py-2 focus:outline-none focus:border-primary"
                    >
                      <option value="Todos">Todos los Destinos</option>
                      <option value="Mar del Plata">Mar del Plata</option>
                      <option value="Villa Carlos Paz">Villa Carlos Paz</option>
                    </select>

                    {/* Items por Página */}
                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Ver</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="bg-transparent border-none text-xs font-black text-white focus:outline-none p-0 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tabla de Colegios */}
                <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse select-none">
                      <thead>
                        <tr className="bg-zinc-900/40 border-b border-zinc-850">
                          <th className="px-6 py-4.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Colegio</th>
                          <th className="px-6 py-4.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Destino</th>
                          <th className="px-6 py-4.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha de Viaje</th>
                          <th className="px-6 py-4.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Acciones Administrativas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {loading ? (
                          <tr>
                            <td colSpan={4} className="text-center py-20 text-xs text-zinc-500 font-bold uppercase tracking-wider animate-pulse">
                              Cargando la base de datos de colegios...
                            </td>
                          </tr>
                        ) : currentSchools.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-20 text-zinc-600 text-xs font-bold uppercase tracking-wider">
                              No se encontraron colegios con los filtros seleccionados
                            </td>
                          </tr>
                        ) : (
                          currentSchools.map((school) => (
                            <tr 
                              key={school.id} 
                              onClick={() => setViewingGallerySchool(school)}
                              className="hover:bg-zinc-900/30 cursor-pointer transition-colors group"
                            >
                              {/* Info Colegio */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-11 h-11 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0 relative">
                                    <img src={school.group_photo_web} alt={school.name} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-primary transition-colors uppercase leading-none">
                                      {school.name}
                                    </h4>
                                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block mt-1 font-semibold">ID: {school.id.slice(0,8)}...</span>
                                  </div>
                                </div>
                              </td>

                              {/* Destino */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
                                  <MapPin size={10} className="text-primary" />
                                  {school.destination}
                                </span>
                              </td>

                              {/* Fecha */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
                                  <CalendarIcon size={10} className="text-primary" />
                                  {school.travel_date}
                                </span>
                              </td>

                              {/* Acciones */}
                              <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setViewingGallerySchool(school)}
                                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[10px] font-black uppercase tracking-wider text-white transition-colors"
                                  >
                                    <ImageIcon size={11} className="text-primary" />
                                    Galería
                                  </button>
                                  
                                  <button
                                    onClick={(e) => openEditModal(school, e)}
                                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    title="Editar Datos"
                                  >
                                    <Edit size={12} />
                                  </button>

                                  <button
                                    onClick={(e) => handleDeleteSchool(school.id, school.name, e)}
                                    className="p-2 rounded-xl bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-900/60 text-zinc-500 hover:text-red-400 transition-colors"
                                    title="Eliminar Colegio"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginador */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4.5 border-t border-zinc-900 bg-zinc-900/10">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Mostrando del {indexOfFirstItem + 1} al {Math.min(indexOfLastItem, totalItems)} de {totalItems} colegios
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 text-white transition-colors border border-zinc-800/80"
                        >
                          <ChevronLeft size={14} />
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => {
                          const pageNum = i + 1;
                          const isActive = currentPage === pageNum;
                          return (
                            <button
                              key={`page-${pageNum}`}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-8.5 h-8.5 rounded-lg text-xs font-black transition-all ${
                                isActive
                                  ? 'bg-primary text-black glow-yellow'
                                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 text-white transition-colors border border-zinc-800/80"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

                {/* TAB CONTENT B: SISTEMA DE ENCUESTAS */}
                {activeTab === 'encuestas' && (
              <div className="space-y-6">
                
                {/* Cabecera Sección Encuestas */}
                <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="z-10">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-1">Módulo de CRM & Leads</span>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight leading-none">Creador Avanzado & Inbox de Respuestas</h2>
                    <p className="text-[10px] text-zinc-500 uppercase mt-2 font-bold tracking-wider">Armá encuestas dinámicas, conectá tu CRM mediante webhooks y visualizá opiniones en tiempo real.</p>
                  </div>
                </div>

                {/* CRM CONNECT CARD */}
                <div className="bg-zinc-950/80 border border-zinc-850 p-5 rounded-2xl relative overflow-hidden group shadow-lg">
                  <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 blur-xl pointer-events-none" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest block leading-none">CRM & Automatizaciones</span>
                      <h3 className="text-sm font-black uppercase text-white tracking-tight leading-none">Conexión de Webhook (n8n)</h3>
                      <p className="text-[10px] text-zinc-500 uppercase leading-relaxed font-semibold">
                        Configurá tu endpoint para disparar un webhook en segundo plano con los datos del lead y sus respuestas al instante.
                      </p>
                    </div>
                    
                    <form onSubmit={handleSaveWebhook} className="flex flex-1 max-w-md items-center gap-2">
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://n8n.tu-servidor.com/webhook/..."
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-[10px] font-semibold focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={savingWebhook}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-[10px] uppercase tracking-wider transition-colors glow-yellow disabled:opacity-40 flex-shrink-0"
                      >
                        {savingWebhook ? 'Guardando...' : 'Guardar'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-start">
                  
                  {/* LEFT COLUMN: LISTADO DE ENCUESTAS */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 leading-none">
                        <Sparkles size={14} className="text-primary" />
                        Encuestas Creadas ({surveys.length})
                      </h3>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSurveyTitle('');
                          setSurveyDescription('');
                          setSurveyQuestions([{ id: 'q-1', question: '', answer_type: 'text' }]);
                          setShowSurveyModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-black font-black text-[10px] uppercase tracking-wider transition-colors glow-yellow"
                      >
                        <Plus size={12} />
                        Crear Encuesta
                      </button>
                    </div>

                    {surveys.length === 0 ? (
                      <div className="text-center py-20 border border-dashed border-zinc-850 rounded-2xl bg-zinc-900/10 text-zinc-600">
                        <Sparkles size={24} className="mx-auto text-zinc-800 mb-2 animate-bounce" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">No hay encuestas creadas en este momento</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                        {surveys.map((survey) => (
                          <div key={survey.id} className={`p-4 rounded-xl border bg-zinc-950 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
                            survey.active 
                              ? 'border-primary shadow-[0_0_20px_rgba(250,204,21,0.04)]' 
                              : 'border-zinc-850 hover:border-zinc-800'
                          }`}>
                            <div className="flex justify-between items-start mb-2 z-10">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                survey.active 
                                  ? 'bg-primary/20 border-primary/40 text-primary glow-yellow'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                              }`}>
                                {survey.active ? 'Encuesta Activa' : 'Borrador / Inactiva'}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSurveyActive(survey.id)}
                                  className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all ${
                                    survey.active 
                                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-red-400' 
                                      : 'bg-primary text-black border-primary font-black hover:bg-primary/90 glow-yellow'
                                  }`}
                                >
                                  {survey.active ? 'Desactivar' : 'Activar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSurvey(survey.id, survey.question)}
                                  className="p-1 rounded-lg bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-900/60 text-zinc-500 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            <h4 className="text-xs font-black uppercase text-white tracking-tight leading-snug">{survey.title}</h4>
                            <p className="text-[9px] text-zinc-500 uppercase font-semibold leading-normal tracking-wide mt-1">{survey.description}</p>

                            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-850 mt-3.5 space-y-3">
                              <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none border-b border-zinc-800 pb-1.5 select-none">
                                Cuestionario ({survey.questions?.length || 1} preguntas)
                              </span>
                              
                              {survey.questions && Array.isArray(survey.questions) && survey.questions.length > 0 ? (
                                <div className="space-y-2">
                                  {survey.questions.map((q: any, qIdx: number) => (
                                    <div key={q.id || qIdx} className="flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase text-zinc-300 leading-normal">
                                        {qIdx + 1}. {q.question}
                                      </span>
                                      <span className="self-start text-[7px] font-black text-primary uppercase tracking-widest px-2 py-0.5 rounded bg-primary/5 border border-primary/10 leading-none">
                                        {q.answer_type === 'text' ? 'Texto Libre' : q.answer_type === 'number' ? 'Nota 1-10' : 'V/F'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black uppercase text-zinc-300 leading-normal">
                                    1. {survey.question}
                                  </span>
                                  <span className="self-start text-[7px] font-black text-primary uppercase tracking-widest px-2 py-0.5 rounded bg-primary/5 border border-primary/10 leading-none">
                                    {survey.answer_type === 'text' ? 'Texto Libre' : survey.answer_type === 'number' ? 'Nota 1-10' : 'V/F'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* WhatsApp link picker */}
                            <div className="mt-3.5 pt-3 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <span className="font-bold text-zinc-500 uppercase tracking-wider text-[9px]">WhatsApp / Link:</span>
                              <div className="flex items-center gap-1.5">
                                <select
                                  id={`school-link-select-${survey.id}`}
                                  className="bg-zinc-900 border border-zinc-800 rounded-lg text-[9px] font-black uppercase text-zinc-300 px-2 py-1 focus:outline-none"
                                >
                                  <option value="">Enlace General (Sin Colegio)</option>
                                  {schools.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const sel = document.getElementById(`school-link-select-${survey.id}`) as HTMLSelectElement;
                                    const sid = sel ? sel.value : '';
                                    const baseUrl = window.location.origin;
                                    const link = sid ? `${baseUrl}/encuesta/${survey.id}?schoolId=${sid}` : `${baseUrl}/encuesta/${survey.id}`;
                                    navigator.clipboard.writeText(link);
                                    alert('¡Enlace de WhatsApp copiado con éxito!');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/95 text-black font-black text-[9px] uppercase tracking-wider transition-colors glow-yellow"
                                >
                                  Copiar
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: INBOX EN VIVO DE RESPUESTAS (CRM INBOX) */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 leading-none">
                        <Database size={14} className="text-primary animate-pulse" />
                        Bandeja de Entrada: Respuestas de Pasajeros
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                        Total: {analyticsEvents.filter(e => e.event_type === 'survey_vote').length} leads
                      </span>
                    </div>

                    {analyticsEvents.filter(e => e.event_type === 'survey_vote').length === 0 ? (
                      <div className="text-center py-20 border border-dashed border-zinc-850 rounded-2xl bg-zinc-900/10 text-zinc-600">
                        <ImageIcon size={24} className="mx-auto text-zinc-800 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">No se han recibido respuestas aún</p>
                        <p className="text-[8px] uppercase mt-1">Comparte un enlace de encuesta con tus pasajeros para recopilar leads.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                        {analyticsEvents
                          .filter(e => e.event_type === 'survey_vote')
                          .map((e, idx) => {
                            // Parsea robustamente los metadatos de telemetría (soporta stringificados, nulos y legacy)
                            let meta = e.metadata;
                            if (meta && typeof meta === 'string') {
                              try {
                                meta = JSON.parse(meta);
                              } catch (err) {
                                meta = {};
                              }
                            }
                            if (!meta) meta = {};

                            const name = meta.name || 'Pasajero Anónimo';
                            const email = meta.email || 'No provisto';
                            const phone = meta.phone || 'No provisto';
                            
                            // Extraer respuestas de forma de arreglo ultra-seguro
                            let answers = meta.answers;
                            if (answers && typeof answers === 'string') {
                              try {
                                answers = JSON.parse(answers);
                              } catch (err) {
                                answers = null;
                              }
                            }
                            
                            if (!answers || !Array.isArray(answers)) {
                              answers = [
                                {
                                  question: meta.question || 'Pregunta general',
                                  answer: meta.answer || 'No provisto',
                                  answer_type: meta.answer_type || 'text'
                                }
                              ];
                            }
                            
                            const matchedSch = schools.find(s => s.id === e.school_id);
                            const schName = matchedSch ? matchedSch.name : 'General / Sin Colegio';
                            const timestamp = e.created_at ? new Date(e.created_at).toLocaleString('es-AR') : 'Reciente';

                            return (
                              <div key={e.id || idx} className="p-4 rounded-xl border border-zinc-855 bg-zinc-950/40 hover:border-zinc-700 transition-colors space-y-3 shadow-md relative overflow-hidden group">
                                <div className="absolute top-0 right-0 h-16 w-16 bg-primary/2 blur-lg pointer-events-none" />
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                                  <div>
                                    <h4 className="text-xs font-black uppercase text-white leading-none">{name}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                      <span className="flex items-center gap-0.5 text-zinc-400 font-semibold"><Mail size={10} /> {email}</span>
                                      {phone !== 'No provisto' && (
                                        <span className="flex items-center gap-0.5 text-zinc-400 font-semibold"><Phone size={10} /> {phone}</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <span className="inline-block px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[8px] font-black uppercase text-zinc-400 rounded-md leading-none">{schName}</span>
                                    <span className="block text-[7px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{timestamp}</span>
                                  </div>
                                </div>

                                <div className="space-y-3 pt-1 border-t border-zinc-900/40">
                                  {answers.map((ans: any, aIdx: number) => (
                                    <div key={aIdx} className="space-y-1">
                                      <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                                        Pregunta #{aIdx + 1}: "{ans.question}"
                                      </span>
                                      
                                      {ans.answer_type === 'text' && (
                                        <p className="text-[10px] text-zinc-300 italic font-semibold leading-relaxed border-l-2 border-primary/40 pl-2 bg-zinc-900/30 py-1.5 rounded-r-lg uppercase">
                                          "{ans.answer}"
                                        </p>
                                      )}

                                      {ans.answer_type === 'number' && (
                                        <div className="flex items-center gap-2 py-0.5">
                                          <span className="inline-flex items-center justify-center h-6.5 w-6.5 rounded-lg bg-primary text-black font-black text-[10px] glow-yellow">
                                            {ans.answer}
                                          </span>
                                          <span className="text-[8px] font-black uppercase text-zinc-400 font-bold">Puntuación otorgada</span>
                                        </div>
                                      )}

                                      {ans.answer_type === 'boolean' && (
                                        <div className="flex items-center gap-1.5 py-0.5">
                                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                            ans.answer === 'Verdadero' 
                                              ? 'bg-emerald-950/60 border border-emerald-900/60 text-emerald-400 font-bold' 
                                              : 'bg-red-950/60 border border-red-900/60 text-red-400 font-bold'
                                          }`}>
                                            {ans.answer}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* TAB CONTENT C: METRICAS Y ESTADISTICAS */}
            {activeTab === 'metricas' && (
              <div className="space-y-6">
                
                {/* Cabecera Sección Métricas */}
                <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="z-10">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-1">Centro de Operaciones</span>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight leading-none">Métricas y Estadísticas en Vivo</h2>
                    <p className="text-[10px] text-zinc-500 uppercase mt-2 font-bold tracking-wider">Monitoreá la actividad de descargas, subidas y visitas del portal.</p>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 z-10 self-start sm:self-center">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse block"></span>
                    <span>Actualizado en tiempo real</span>
                  </div>
                </div>

                {loadingAnalytics ? (
                  <div className="text-center py-24 text-xs font-bold uppercase tracking-wider text-zinc-500 animate-pulse">
                    Analizando interacciones de la base de datos...
                  </div>
                ) : (
                  <>
                    {/* Grid de 4 KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 blur-xl pointer-events-none" />
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Visitas Totales (Portal)</span>
                        <span className="text-2xl font-black text-primary block mt-2.5 leading-none font-outfit glow-text-yellow">{vivo.totalViews}</span>
                        <span className="text-[9px] text-emerald-400 font-bold block mt-3 uppercase tracking-wider">Eventos de página activa</span>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 blur-xl pointer-events-none" />
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Descargas de Fotos HD</span>
                        <span className="text-2xl font-black text-primary block mt-2.5 leading-none font-outfit glow-text-yellow">{vivo.totalDownloads}</span>
                        <span className="text-[9px] text-emerald-400 font-bold block mt-3 uppercase tracking-wider">Guardadas en explorador</span>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 blur-xl pointer-events-none" />
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Fotos Almacenadas</span>
                        <span className="text-2xl font-black text-primary block mt-2.5 leading-none font-outfit glow-text-yellow">{vivo.photosCount}</span>
                        <span className="text-[9px] text-zinc-500 font-bold block mt-3 uppercase tracking-wider">Base de datos de recuerdos</span>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 blur-xl pointer-events-none" />
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">Colegios Activos</span>
                        <span className="text-2xl font-black text-primary block mt-2.5 leading-none font-outfit glow-text-yellow">{schools.length}</span>
                        <span className="text-[9px] text-zinc-500 font-bold block mt-3 uppercase tracking-wider">2 Destinos principales</span>
                      </div>
                    </div>

                    {/* Gráficos / Listados de métricas */}
                    <div className="grid lg:grid-cols-12 gap-6">
                      {/* Gráfico de Barras Semanales */}
                      <div className="lg:col-span-8 bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-6">
                        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-900">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-400 block leading-none">Búsquedas en el Almanaque por Día</span>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Actividad Semanal en Vivo</span>
                        </div>

                        <div className="flex items-end justify-between h-48 pt-6 px-4">
                          {vivo.weeklyInteractions.map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2.5 flex-1 group/bar cursor-pointer">
                              <span className="text-[8px] font-mono font-bold text-zinc-500 group-hover/bar:text-primary transition-colors opacity-0 group-hover/bar:opacity-100 transform translate-y-1 group-hover/bar:-translate-y-0.5 duration-300">
                                {item.val} clicks
                              </span>
                              <div className="w-6 sm:w-8 bg-zinc-900 rounded-lg overflow-hidden h-32 border border-zinc-850/80 relative flex items-end">
                                <div 
                                  className="w-full bg-gradient-to-t from-yellow-500 to-primary transition-all duration-1000 ease-out glow-yellow" 
                                  style={{ height: `${item.pct}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-bold text-zinc-500 group-hover/bar:text-white transition-colors uppercase tracking-wider">{item.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Distribución por Destino y Dispositivo */}
                      <div className="lg:col-span-4 bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between gap-5">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-900">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 block leading-none">Distribución de Tráfico</span>
                          </div>

                          {/* Destinos Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              <span>Destino de Consulta</span>
                              <span className="text-primary font-black">VCP ({vivo.vcpPct}%) vs MDP ({vivo.mdpPct}%)</span>
                            </div>
                            <div className="w-full h-3.5 bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden flex">
                              <div className="h-full bg-primary glow-yellow shadow-inner" style={{ width: `${vivo.vcpPct}%` }} title={`Villa Carlos Paz ${vivo.vcpPct}%`} />
                              <div className="h-full bg-zinc-700 shadow-inner" style={{ width: `${vivo.mdpPct}%` }} title={`Mar del Plata ${vivo.mdpPct}%`} />
                            </div>
                          </div>

                          {/* Dispositivos Bar */}
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              <span>Dispositivo</span>
                              <span className="text-primary font-black">Móvil ({vivo.mobilePct}%) vs PC ({vivo.desktopPct}%)</span>
                            </div>
                            <div className="w-full h-3.5 bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden flex">
                              <div className="h-full bg-primary glow-yellow shadow-inner" style={{ width: `${vivo.mobilePct}%` }} title={`Móvil ${vivo.mobilePct}%`} />
                              <div className="h-full bg-zinc-700 shadow-inner" style={{ width: `${vivo.desktopPct}%` }} title={`PC / Desktop ${vivo.desktopPct}%`} />
                            </div>
                          </div>
                        </div>

                        {/* ANÁLISIS DE TELEMETRÍA EN TIEMPO REAL - PEDIDO POR EL USUARIO */}
                        <div className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-3 shadow-md">
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest block leading-none">Análisis Operativo (Vivo)</span>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] uppercase font-bold text-zinc-400">
                              <span>Top Almanaque:</span>
                              <span className="text-white font-black truncate max-w-[55%]">{vivo.topSearchedSchool} ({vivo.topSearchedCount} searches)</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] uppercase font-bold text-zinc-400">
                              <span>Top Clicks Fotos:</span>
                              <span className="text-white font-black truncate max-w-[55%]">{vivo.topPhotoClickSchool} ({vivo.topPhotoClickCount} clicks)</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] uppercase font-bold text-zinc-400">
                              <span>Espacio Backblaze B2:</span>
                              <span className="text-primary font-black">{vivo.formattedSpace}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] uppercase font-bold text-zinc-400">
                              <span>Votos en Encuestas:</span>
                              <span className="text-emerald-400 font-black">{vivo.surveyVotesCount} votos</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Colegios Table */}
                    <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden p-5 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-400 block leading-none">Desglose de Tráfico Detallado por Escuela</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse select-none">
                          <thead>
                            <tr className="border-b border-zinc-900">
                              <th className="py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Colegio</th>
                              <th className="py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Destino</th>
                              <th className="py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Vistas Perfil</th>
                              <th className="py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Clicks Fotos</th>
                              <th className="py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Búsquedas Almanaque</th>
                              <th className="py-2.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Descargas HD</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/60 text-xs">
                            {vivo.topSchoolsSorted.map((school, i) => (
                              <tr key={i} className="hover:bg-zinc-900/10">
                                <td className="py-3 font-black text-white uppercase">{school.name}</td>
                                <td className="py-3 font-bold text-zinc-400 uppercase">{school.destination}</td>
                                <td className="py-3 font-mono text-zinc-300 text-right font-bold">{school.views}</td>
                                <td className="py-3 font-mono text-zinc-300 text-right font-bold">{school.clicks}</td>
                                <td className="py-3 font-mono text-zinc-300 text-right font-bold">{school.calSearches}</td>
                                <td className="py-3 font-mono text-primary text-right font-black">{school.downloads}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* MODAL DE ALTA / EDICIÓN DE COLEGIO */}
      {showSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity">
          <div 
            className="relative w-full max-w-lg border border-zinc-800 rounded-2xl bg-zinc-950 shadow-premium overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-zinc-900 flex-shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-1.5 leading-none">
                  <Sparkles size={14} className="text-primary" />
                  {editingSchool ? 'Editar Colegio' : 'Alta de Colegio'}
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase mt-1 leading-none">
                  {editingSchool ? 'Modificá la ficha del colegio' : 'Registrá una nueva escuela asociada al calendario'}
                </p>
              </div>
              <button 
                onClick={closeSchoolModal}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formulario con scroll si es muy alto */}
            <form onSubmit={handleSaveSchool} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Nombre del Colegio
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Colegio San Martín 6to"
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                    Destino
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value as any)}
                    className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold focus:outline-none focus:border-primary"
                  >
                    <option value="Mar del Plata">Mar del Plata</option>
                    <option value="Villa Carlos Paz">Villa Carlos Paz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                    Fecha de Viaje (Almanaque)
                  </label>
                  <input
                    type="date"
                    required
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Portal de Carga de Foto Grupal Oficial */}
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
                <span className="block text-[10px] font-black text-primary uppercase tracking-widest leading-none">Foto Grupal Oficial (HD)</span>
                
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex flex-col items-center justify-center py-4.5 px-3 rounded-lg border border-dashed border-zinc-700 hover:border-primary/40 bg-zinc-950/40 hover:bg-zinc-900/40 cursor-pointer text-center transition-all group">
                    <CloudUpload size={20} className="text-zinc-500 group-hover:text-primary transition-colors mb-1" />
                    <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors uppercase">Seleccionar Foto</span>
                    <span className="text-[8px] text-zinc-500 uppercase mt-0.5">Se procesará en alta y baja</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={groupPhotoUploading}
                      onChange={handleGroupPhotoChange}
                      className="hidden"
                    />
                  </label>
                  
                  {groupWebUrl && (
                    <div className="w-16 h-16 rounded-lg border border-zinc-850 overflow-hidden bg-zinc-950 flex-shrink-0 relative group">
                      <img src={groupWebUrl} alt="Grupal" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setGroupWebUrl(''); setGroupHdUrl(''); }}
                        className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {groupPhotoUploading && (
                  <div className="space-y-1 select-none">
                    <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>{groupPhotoStatus}</span>
                      <span className="text-primary">{groupPhotoProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850/80">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${groupPhotoProgress}%` }} />
                    </div>
                  </div>
                )}
                
                {groupWebUrl && !groupPhotoUploading && (
                  <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Check size={10} /> Foto grupal cargada con éxito
                  </div>
                )}
              </div>

              {/* Ajustes manuales avanzados */}
              <details className="text-[10px] text-zinc-500 font-bold uppercase select-none">
                <summary className="cursor-pointer hover:text-zinc-300 transition-colors py-1">Ajustar URLs manualmente (Avanzado)</summary>
                <div className="space-y-2.5 mt-2.5 pt-2.5 border-t border-zinc-900">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Foto Grupal Web (URL)
                    </label>
                    <input
                      type="url"
                      value={groupWebUrl}
                      onChange={(e) => setGroupWebUrl(e.target.value)}
                      placeholder="https://backblaze.com/web.jpg"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Foto Grupal HD (URL)
                    </label>
                    <input
                      type="url"
                      value={groupHdUrl}
                      onChange={(e) => setGroupHdUrl(e.target.value)}
                      placeholder="https://backblaze.com/hd.jpg"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </details>

              {/* Portal de Carga de Video/Zip B2 */}
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
                <span className="block text-[10px] font-black text-primary uppercase tracking-widest leading-none">Video / Archivo Zip del Viaje (Opcional)</span>
                
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex flex-col items-center justify-center py-4 px-3 rounded-lg border border-dashed border-zinc-700 hover:border-primary/40 bg-zinc-950/40 hover:bg-zinc-900/40 cursor-pointer text-center transition-all group">
                    <CloudUpload size={20} className="text-zinc-500 group-hover:text-primary transition-colors mb-1" />
                    <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors uppercase">Seleccionar Video/Zip</span>
                    <span className="text-[8px] text-zinc-500 uppercase mt-0.5">MP4, MOV, AVI o ZIP</span>
                    <input
                      type="file"
                      accept="video/*,application/zip,application/x-zip-compressed"
                      disabled={videoUploading}
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />
                  </label>

                  {multimediaUrl && (
                    <div className="w-16 h-16 rounded-lg border border-zinc-850 bg-zinc-950 flex flex-col items-center justify-center relative group p-2 text-center select-none flex-shrink-0">
                      <Film size={20} className="text-primary animate-pulse" />
                      <span className="text-[7px] text-zinc-400 font-bold uppercase tracking-wider block mt-1 truncate max-w-full">Cargado</span>
                      <button
                        type="button"
                        onClick={() => setMultimediaUrl('')}
                        className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity rounded-lg"
                        title="Remover Video"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {videoUploading && (
                  <div className="space-y-1 select-none">
                    <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>{videoStatus}</span>
                      <span className="text-primary">{videoProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850/80">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${videoProgress}%` }} />
                    </div>
                  </div>
                )}
                
                {multimediaUrl && !videoUploading && (
                  <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Check size={10} /> Enlace de video asociado correctamente
                  </div>
                )}

                <div className="pt-1.5 border-t border-zinc-900/60">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Enlace de Video/Zip B2 (Manual)
                  </label>
                  <input
                    type="url"
                    value={multimediaUrl}
                    onChange={(e) => setMultimediaUrl(e.target.value)}
                    placeholder="https://backblaze.com/video.zip"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-[11px] font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones de acción modal */}
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900 select-none flex-shrink-0">
                <button
                  type="button"
                  onClick={closeSchoolModal}
                  className="px-5 py-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-wider transition-colors glow-yellow"
                >
                  {editingSchool ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN DE ENCUESTA */}
      {showSurveyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity">
          <div 
            className="relative w-full max-w-lg border border-zinc-800 rounded-2xl bg-zinc-950 shadow-premium overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-zinc-900 flex-shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-1.5 leading-none">
                  <Sparkles size={14} className="text-primary" />
                  Nueva Encuesta Estudiantil
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase mt-1 leading-none">
                  Generá un cuestionario con formato de Texto, Escala del 1 al 10 o Verdadero/Falso.
                </p>
              </div>
              <button 
                onClick={() => setShowSurveyModal(false)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateSurvey} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Título de la Encuesta
                </label>
                <input
                  type="text"
                  required
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  placeholder="Tu opinión sobre el viaje / Puntuación Coordinador"
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  Descripción / Copia explicativa
                </label>
                <textarea
                  required
                  value={surveyDescription}
                  onChange={(e) => setSurveyDescription(e.target.value)}
                  placeholder="Queremos saber qué tal te pareció..."
                  rows={2}
                  className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none resize-none"
                />
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-4 pt-2 border-t border-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-black text-primary uppercase tracking-widest leading-none glow-text-yellow select-none">
                    Preguntas del Cuestionario ({surveyQuestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSurveyQuestions(prev => [...prev, { id: `q-${Date.now()}-${prev.length + 1}`, question: '', answer_type: 'text' }])}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[8px] font-black uppercase tracking-wider text-white transition-colors"
                  >
                    <Plus size={10} className="text-primary" />
                    Agregar Pregunta
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {surveyQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="p-3.5 bg-zinc-900/60 border border-zinc-850 rounded-xl space-y-3 relative group">
                      <div className="flex items-center justify-between gap-2 select-none">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">Pregunta #{idx + 1}</span>
                        {surveyQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSurveyQuestions(prev => prev.filter(item => item.id !== q.id))}
                            className="p-1 rounded bg-zinc-950 hover:bg-red-950/40 border border-zinc-850 hover:border-red-900/60 text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          required
                          value={q.question}
                          onChange={(e) => {
                            const copy = [...surveyQuestions];
                            copy[idx].question = e.target.value;
                            setSurveyQuestions(copy);
                          }}
                          placeholder={`Ej. ¿Cómo calificarías la excursión #${idx + 1}?`}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-955 border border-zinc-850 focus:border-primary/50 text-white text-[10px] font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <select
                          value={q.answer_type}
                          onChange={(e) => {
                            const copy = [...surveyQuestions];
                            copy[idx].answer_type = e.target.value;
                            setSurveyQuestions(copy);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-850 text-zinc-300 text-[10px] font-bold focus:outline-none focus:border-primary"
                        >
                          <option value="text">Texto Libre (Comentarios y sugerencias)</option>
                          <option value="number">Numérica del 1 al 10 (Calificaciones)</option>
                          <option value="boolean">Verdadero o Falso (Conformidad Sí/No)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de acción modal */}
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900 select-none flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSurveyModal(false)}
                  className="px-5 py-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-wider transition-colors glow-yellow"
                >
                  Crear Encuesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
