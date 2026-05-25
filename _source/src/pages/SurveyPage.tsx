import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';
import { ArrowLeft, Send, ShieldCheck, CheckCircle2, User, Mail, Phone, Sparkles, MapPin } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

export const SurveyPage: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('schoolId') || '';
  const navigate = useNavigate();

  // Survey metadata
  const [survey, setSurvey] = useState<any | null>(null);
  const [school, setSchool] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [passengerName, setPassengerName] = useState<string>('');
  const [passengerEmail, setPassengerEmail] = useState<string>('');
  const [passengerPhone, setPassengerPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votedToken, setVotedToken] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useSEO({
    title: survey ? `Encuesta — ${survey.title}` : 'Cargando Encuesta SuperTour',
    description: survey 
      ? `Participá de la encuesta oficial de SuperTourChannel: ${survey.title}.`
      : 'Cargando encuesta de viaje de egresados.',
    ogImage: '/st-logo-og.png',
    canonicalPath: `/encuesta/${surveyId}`
  });

  useEffect(() => {
    const loadSurveyData = async () => {
      setLoading(true);
      try {
        // 1. Fetch survey by ID
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', surveyId)
          .single();

        if (surveyError) throw surveyError;

        let surveyDataFromDb = surveyData;
        if (surveyDataFromDb) {
          // If database doesn't have the questions array or it's empty, build dynamic fallback array for backward compatibility
          if (!surveyDataFromDb.questions || !Array.isArray(surveyDataFromDb.questions) || surveyDataFromDb.questions.length === 0) {
            surveyDataFromDb.questions = [
              {
                id: 'q-legacy',
                question: surveyDataFromDb.question || 'Dejanos tus comentarios sobre el viaje:',
                answer_type: surveyDataFromDb.answer_type || 'text'
              }
            ];
          }
          setSurvey(surveyDataFromDb);
        }

        // Check if passenger already voted on this specific survey
        const alreadyVoted = localStorage.getItem(`supertour_voted_survey_${surveyId}`);
        if (alreadyVoted) {
          setVotedToken(true);
        }

        // 2. Fetch school metadata if schoolId is provided
        if (schoolId) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('*')
            .eq('id', schoolId)
            .single();
          if (schoolData) {
            setSchool(schoolData);
          }
        }
      } catch (err) {
        console.warn('Error loading survey from DB, fallback to local/mock database:', err);
        // Fallback robust offline with multiple questions
        const mockSurveys = [
          {
            id: 'survey-1',
            title: 'Encuesta Final de Viaje',
            description: 'Queremos saber tu opinión detallada sobre los distintos aspectos de tu viaje de egresados.',
            questions: [
              { id: 'q-1', question: '¿Cómo calificarías el desempeño general de tu coordinador?', answer_type: 'number' },
              { id: 'q-2', question: 'Dejanos tus comentarios sobre lo que más te gustó y qué mejorarías:', answer_type: 'text' },
              { id: 'q-3', question: '¿SuperTourChannel cumplió tus expectativas de viaje?', answer_type: 'boolean' }
            ],
            active: true
          },
          {
            id: 'survey-2',
            title: 'Calificación de Coordinadores',
            description: 'Calificá el desempeño general de tu coordinador asignado durante toda la estadía.',
            questions: [
              { id: 'q-1', question: '¿Qué nota le ponés al servicio y acompañamiento del coordinador?', answer_type: 'number' }
            ],
            active: false
          }
        ];
        
        const matched = mockSurveys.find(s => s.id === surveyId) || mockSurveys[0];
        setSurvey(matched);
        
        const alreadyVoted = localStorage.getItem(`supertour_voted_survey_${matched.id}`);
        if (alreadyVoted) {
          setVotedToken(true);
        }

        // School mock fallback
        if (schoolId) {
          setSchool({
            id: schoolId,
            name: 'EGB Colegio San Martín',
            destination: 'Villa Carlos Paz',
            travel_date: '2026-11-10'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (surveyId) {
      loadSurveyData();
    }
  }, [surveyId, schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey || isSubmitting) return;

    // Validar requeridos personales
    if (!passengerName.trim() || !passengerEmail.trim()) {
      alert('Nombre y Email son obligatorios para enviar tu respuesta.');
      return;
    }

    // Validar que se hayan respondido todas las preguntas
    const unanswered = survey.questions.filter((q: any) => !answers[q.id]);
    if (unanswered.length > 0) {
      alert('Por favor responde a todas las preguntas de la encuesta antes de enviar.');
      return;
    }

    setIsSubmitting(true);

    const activeSchoolId = school ? school.id : null;
    const activeSchoolName = school ? school.name : 'Individual / Sin Colegio';
    const activeDestination = school ? school.destination : 'Villa Carlos Paz';

    const answersList = survey.questions.map((q: any) => ({
      question_id: q.id,
      question: q.question,
      answer_type: q.answer_type,
      answer: answers[q.id]
    }));

    const payload = {
      survey_id: survey.id,
      survey_title: survey.title,
      school_id: activeSchoolId,
      school_name: activeSchoolName,
      destination: activeDestination,
      passenger_name: passengerName,
      passenger_email: passengerEmail,
      passenger_phone: passengerPhone || 'No provisto',
      answers: answersList,
      submitted_at: new Date().toISOString()
    };

    // 1. Guardar evento de analíticas en Supabase (y localStorage)
    await trackEvent({
      event_type: 'survey_vote',
      school_id: activeSchoolId,
      destination: activeDestination as any,
      metadata: {
        survey_id: survey.id,
        survey_title: survey.title,
        name: passengerName,
        email: passengerEmail,
        phone: passengerPhone || 'No provisto',
        answers: answersList,
        // Backward compatibility con visor legacy de analíticas: usar primera pregunta del listado
        question: survey.questions[0]?.question || 'Pregunta general',
        answer: answers[survey.questions[0]?.id] || 'No provisto',
        answer_type: survey.questions[0]?.answer_type || 'text'
      }
    });

    // 2. Intentar disparar webhook a n8n si está configurado en supertour_settings o local storage
    let targetWebhookUrl = '';
    try {
      const { data: webhookSetting } = await supabase
        .from('supertour_settings')
        .select('value')
        .eq('key', 'n8n_webhook_url')
        .maybeSingle();

      if (webhookSetting && webhookSetting.value && webhookSetting.value.trim() !== '') {
        targetWebhookUrl = webhookSetting.value;
      }
    } catch (webhookSettingErr) {
      console.warn('No se pudo leer la configuración de webhook de Supabase:', webhookSettingErr);
    }

    // Fallback de local storage para entornos locales/desarrollo offline
    if (!targetWebhookUrl) {
      targetWebhookUrl = localStorage.getItem('supertour_webhook_url') || '';
    }

    if (targetWebhookUrl && targetWebhookUrl.trim() !== '') {
      console.log('[SuperTour CRM] Disparando webhook de CRM:', targetWebhookUrl);
      
      // Enviar POST con JSON. Usamos 'cors' para asegurar el header application/json.
      // Si el servidor de n8n no tiene cabeceras CORS, el navegador reportará un error CORS en la consola
      // pero la petición POST de todas formas llega al servidor de n8n y se ejecuta con éxito.
      fetch(targetWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(webhookErr => {
        console.warn('Error en la llamada del webhook de n8n:', webhookErr);
      });
    }

    // 3. Registrar en local storage del pasajero para evitar re-voto
    localStorage.setItem(`supertour_voted_survey_${survey.id}`, 'voted_ok');
    
    // Éxito
    setIsSubmitting(false);
    setSubmitSuccess(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center select-none">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4 glow-yellow" />
          <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Cargando encuesta de viaje...</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center select-none text-center px-4">
        <div>
          <ShieldCheck size={48} className="text-zinc-700 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Encuesta no encontrada</h2>
          <p className="text-xs text-zinc-500 uppercase mt-2 font-bold tracking-wider">Verificá el enlace o pedile al coordinador el ID correcto.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 rounded-xl bg-primary text-black font-black uppercase text-xs tracking-wider glow-yellow"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col justify-between">
      
      {/* Luces doradas decorativas */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-[120px] pointer-events-none z-0" />

      {/* Header simple */}
      <header className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-8 pb-4 flex justify-between items-center z-10 select-none flex-shrink-0">
        <button
          onClick={() => school ? navigate(`/colegio/${school.id}`) : navigate('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <div className="text-right">
          <span className="font-outfit font-black text-sm tracking-tight text-white">
            SUPER<span className="text-primary">TOUR</span>
          </span>
          <span className="text-[7px] font-black uppercase block tracking-widest text-zinc-500">Channel</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex items-center justify-center z-10">
        
        {submitSuccess || votedToken ? (
          /* PANTALLA EXITO / BLOQUEO DE DOBLE VOTO */
          <div className="glass-card rounded-3xl border border-zinc-800/40 p-8 text-center bg-zinc-950/80 shadow-premium w-full max-w-md transform transition-all select-none">
            <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border border-primary/20 text-primary mb-5 shadow-[0_0_20px_rgba(250,204,21,0.1)] glow-yellow">
              {votedToken ? <ShieldCheck size={28} className="animate-pulse" /> : <CheckCircle2 size={28} className="animate-bounce" />}
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-none">
              {votedToken ? 'Encuesta Respondida' : '¡Respuesta Enviada!'}
            </h2>
            
            <p className="text-xs text-zinc-400 mt-4 leading-relaxed font-semibold uppercase tracking-wide">
              {votedToken 
                ? 'Ya registramos tu participación en esta encuesta previamente. ¡Muchas gracias por tu tiempo y opiniones!'
                : 'Tus respuestas fueron registradas en vivo con éxito y despachadas a nuestros coordinadores. ¡Muchas gracias por sumarte!'}
            </p>

            {school && (
              <div className="mt-5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2 justify-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                <MapPin size={12} className="text-primary" />
                <span>{school.name}</span>
              </div>
            )}

            <button
              onClick={() => school ? navigate(`/colegio/${school.id}`) : navigate('/')}
              className="mt-8 w-full py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-wider transition-colors glow-yellow"
            >
              Volver al Colegio
            </button>
          </div>
        ) : (
          /* FORMULARIO DE ENCUESTA */
          <form onSubmit={handleSubmit} className="glass-card rounded-3xl border border-zinc-800/40 p-6 sm:p-8 bg-zinc-950/80 shadow-premium w-full space-y-7">
            
            {/* Header Encuesta */}
            <div className="text-center select-none pb-4 border-b border-zinc-900">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest mb-3 glow-yellow">
                <Sparkles size={10} className="animate-pulse" />
                Encuesta de Viaje
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-none">
                {survey.title}
              </h1>
              <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed uppercase tracking-wider font-semibold">
                {survey.description}
              </p>
            </div>

            {/* Colegio / Destino Info */}
            {school && (
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-[9px] text-zinc-400 font-bold uppercase tracking-wider select-none">
                <span className="flex items-center gap-1"><User size={12} className="text-primary" /> {school.name}</span>
                <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> {school.destination}</span>
              </div>
            )}

            {/* Loop de Preguntas Dinámicas */}
            <div className="space-y-6">
              {survey.questions.map((q: any, qIdx: number) => (
                <div key={q.id} className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2 select-none">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest glow-text-yellow">
                      Pregunta #{qIdx + 1}
                    </span>
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md leading-none">
                      {q.answer_type === 'text' ? 'Texto Libre' : q.answer_type === 'number' ? 'Calificación (1-10)' : 'Conformidad'}
                    </span>
                  </div>

                  <label className="block text-xs font-black uppercase tracking-wide text-zinc-200 select-none">
                    {q.question}
                  </label>

                  {q.answer_type === 'text' && (
                    <div className="space-y-1.5">
                      <textarea
                        required
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Escribí tu opinión o comentarios..."
                        rows={3}
                        maxLength={1000}
                        className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none resize-none shadow-inner"
                      />
                      <div className="text-right text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                        {(answers[q.id] || '').length}/1000 caracteres
                      </div>
                    </div>
                  )}

                  {q.answer_type === 'number' && (
                    <div className="py-1 space-y-3">
                      <div className="flex flex-wrap justify-between items-center gap-1.5">
                        {Array.from({ length: 10 }).map((_, idx) => {
                          const rating = (idx + 1).toString();
                          const isSelected = answers[q.id] === rating;
                          return (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setAnswers(prev => ({ ...prev, [q.id]: rating }))}
                              className={`w-9.5 h-9.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 transform hover:scale-105 active:scale-95 border ${
                                isSelected
                                  ? 'bg-primary border-primary text-black glow-yellow shadow-lg shadow-primary/10'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-750'
                              }`}
                            >
                              {rating}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1 select-none">
                        <span>Deficiente 😞</span>
                        <span>Excelente 🤩</span>
                      </div>
                    </div>
                  )}

                  {q.answer_type === 'boolean' && (
                    <div className="grid grid-cols-2 gap-3 py-1">
                      {[
                        { text: 'Verdadero', val: 'Verdadero' },
                        { text: 'Falso', val: 'Falso' }
                      ].map((option) => {
                        const isSelected = answers[q.id] === option.val;
                        return (
                          <button
                            key={option.val}
                            type="button"
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: option.val }))}
                            className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-300 transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 ${
                              isSelected
                                ? 'bg-primary border-primary text-black glow-yellow shadow-lg shadow-primary/10'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-750'
                            }`}
                          >
                            {option.text}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Datos Personales del Pasajero (CRM Leads) */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl space-y-4">
              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none select-none">Datos del Pasajero (CRM)</span>
              
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="flex items-center gap-1 text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 select-none">
                    <User size={10} className="text-primary" /> Nombre Completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Escribí tu nombre"
                    className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 select-none">
                    <Mail size={10} className="text-primary" /> Email de Contacto <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={passengerEmail}
                    onChange={(e) => setPassengerEmail(e.target.value)}
                    placeholder="correo@egresado.com"
                    className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1 text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 select-none">
                  <Phone size={10} className="text-primary" /> Teléfono Móvil <span className="text-zinc-500">(Opcional)</span>
                </label>
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="ej: 11 2233 4455"
                  className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-2 glow-yellow disabled:opacity-40 disabled:scale-95 disabled:hover:bg-primary"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Enviar mi Respuesta</span>
                </>
              )}
            </button>
          </form>
        )}

      </main>

      {/* Footer simple */}
      <footer className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 border-t border-zinc-900 text-center text-[9px] text-zinc-600 font-bold uppercase tracking-wider z-10 select-none flex-shrink-0">
        <span>© {new Date().getFullYear()} SuperTour — Todos los recuerdos en vivo</span>
      </footer>

    </div>
  );
};
