import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Sparkles, ChevronRight, ChevronLeft, X, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { School } from '../types/database';
import { trackEvent } from '../lib/analytics';
import { normalizeSchoolWithCdn } from '../lib/cdn';

interface PremiumCalendarProps {
  destination: 'Mar del Plata' | 'Villa Carlos Paz';
}

export const PremiumCalendar: React.FC<PremiumCalendarProps> = ({ destination }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // 0-indexed: 9=Octubre, 10=Noviembre, 11=Diciembre
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Security PIN Modal State for Calendar
  const [selectedSchoolForPin, setSelectedSchoolForPin] = useState<School | null>(null);
  const [calendarPinInput, setCalendarPinInput] = useState<string>('');
  const [calendarPinError, setCalendarPinError] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSchoolForPin(null);
      }
    };
    if (selectedSchoolForPin) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedSchoolForPin]);

  const handleSelectSchool = (school: School) => {
    const authKey = `supertour_auth_${school.id}`;
    if (sessionStorage.getItem(authKey) === 'true' || !school.group_code || school.group_code.trim() === '') {
      navigate(`/colegio/${school.id}`);
    } else {
      setSelectedSchoolForPin(school);
      setCalendarPinInput('');
      setCalendarPinError(null);
    }
  };

  const handleCalendarPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolForPin) return;

    const expected = (selectedSchoolForPin.group_code || '').trim().toUpperCase();
    const entered = calendarPinInput.trim().toUpperCase();

    if (entered && entered === expected) {
      sessionStorage.setItem(`supertour_auth_${selectedSchoolForPin.id}`, 'true');
      const schoolId = selectedSchoolForPin.id;
      setSelectedSchoolForPin(null);
      navigate(`/colegio/${schoolId}`);
    } else {
      setCalendarPinError('El código de grupo no coincide con este viaje. Verificá el código enviado por WhatsApp.');
    }
  };

  // Fetch schools dynamically from Supabase database
  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setDbError(null);
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('destination', destination);

        if (error) throw error;

        let loadedSchools: School[] = [];
        if (data && data.length > 0) {
          loadedSchools = (data as School[]).map(normalizeSchoolWithCdn);
          setSchools(loadedSchools);

          // Find first school with travel_date to auto-position calendar
          const firstValidSchool = loadedSchools.find(s => !!s.travel_date);
          if (firstValidSchool && firstValidSchool.travel_date) {
            const parts = firstValidSchool.travel_date.split('T')[0].split(' ')[0].split('-');
            if (parts.length >= 2) {
              const y = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1; // 0-indexed
              if (!isNaN(y) && !isNaN(m)) {
                setSelectedYear(y);
                setSelectedMonth(m);
              }
            }
          }
        } else {
          setSchools([]);
        }
      } catch (err: any) {
        console.warn('Database error while loading calendar schools:', err);
        setDbError('No se pudieron cargar los viajes disponibles. Por favor, reintentá más tarde.');
        setSchools([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
    setSelectedDay(null);
  }, [destination]);

  // Extract unique periods (YYYY-MM) with available schools for quick selection pills
  const availablePeriods = React.useMemo(() => {
    const periodMap = new Map<string, { year: number; month: number; count: number }>();
    schools.forEach((s) => {
      if (!s.travel_date) return;
      const parts = s.travel_date.split('T')[0].split(' ')[0].split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          const key = `${y}-${m < 9 ? '0' + (m + 1) : m + 1}`;
          const current = periodMap.get(key) || { year: y, month: m, count: 0 };
          current.count += 1;
          periodMap.set(key, current);
        }
      }
    });
    return Array.from(periodMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [schools]);

  // Dynamic calendar math
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthDate = new Date(selectedYear, selectedMonth, 1);
  const rawMonthName = monthDate.toLocaleDateString('es-AR', { month: 'long' });
  const currentMonthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);
  const daysInCurrentMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const startOffset = new Date(selectedYear, selectedMonth, 1).getDay();

  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  // Helper to extract schools matching day
  const getSchoolsForDay = (day: number) => {
    const mStr = selectedMonth < 9 ? `0${selectedMonth + 1}` : `${selectedMonth + 1}`;
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const dateQuery = `${selectedYear}-${mStr}-${dStr}`;
    return schools.filter((school) => {
      if (!school.travel_date) return false;
      const schoolDateOnly = school.travel_date.split(' ')[0].split('T')[0];
      return schoolDateOnly === dateQuery;
    });
  };

  const hasActiveTrips = (day: number) => {
    return getSchoolsForDay(day).length > 0;
  };

  const activeDaySchools = selectedDay ? getSchoolsForDay(selectedDay) : [];

  return (
    <div className="py-20 bg-zinc-950/80 relative z-10 border-t border-zinc-900 select-none">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Step Indicator */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
            Paso 2: Mes y Día
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 uppercase tracking-tight">
            Calendario de Viajes
          </h2>
          <p className="mt-2 text-zinc-400 text-sm">
            Elegí el mes del viaje y hacé clic en los días iluminados en amarillo para ver los colegios.
          </p>
        </div>

        {/* Database Error / Offline Notification */}
        {dbError && (
          <div className="max-w-xl mx-auto mb-8 p-4 rounded-2xl bg-amber-950/40 border border-amber-900/60 text-amber-300 text-xs text-center flex items-center justify-center gap-2">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
            <span>{dbError}</span>
          </div>
        )}

        {/* Dynamic Period Quick Selector (populated if multiple months with trips exist) */}
        {availablePeriods.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-2xl mx-auto">
            {availablePeriods.map(([key, data]) => {
              const isSelected = selectedYear === data.year && selectedMonth === data.month;
              const pillMonthName = new Date(data.year, data.month, 1).toLocaleDateString('es-AR', { month: 'short' });
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedYear(data.year);
                    setSelectedMonth(data.month);
                    setSelectedDay(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-300 flex items-center gap-2 ${
                    isSelected
                      ? 'bg-primary text-black border-primary glow-yellow scale-105'
                      : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <span>{pillMonthName} {data.year}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isSelected ? 'bg-black/20 text-black' : 'bg-zinc-800 text-primary'
                  }`}>
                    {data.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Interactive Almanac Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-xl mx-auto border border-zinc-800/40 shadow-premium">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mes anterior"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-primary glow-text-yellow" />
                <span className="text-lg font-black text-white uppercase tracking-wider font-outfit">
                  {currentMonthName} {selectedYear}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Mes siguiente"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-800">
              <MapPin size={12} className="text-primary" />
              <span className="font-bold uppercase tracking-widest">{destination}</span>
            </div>
          </div>

          {/* Days of Week Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-xs font-bold text-zinc-500 uppercase tracking-widest py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank placeholders for starting day offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="aspect-square" />
            ))}

            {/* Render actual days */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const dayNum = i + 1;
              const hasTrips = hasActiveTrips(dayNum);
              const isDaySelected = selectedDay === dayNum;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => {
                    if (hasTrips) {
                      setSelectedDay(dayNum);
                      
                      const daySchools = getSchoolsForDay(dayNum);
                      daySchools.forEach((school) => {
                        trackEvent({
                          event_type: 'calendar_click',
                          school_id: school.id,
                          destination: school.destination,
                          metadata: { date: `${selectedYear}-${selectedMonth + 1}-${dayNum}` }
                        });
                      });
                    }
                  }}
                  disabled={!hasTrips || loading}
                  aria-label={`Día ${dayNum} de ${currentMonthName} ${selectedYear}${hasTrips ? ' (con viajes)' : ''}`}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center relative font-bold text-sm transition-all duration-300 ${
                    isDaySelected
                      ? 'bg-primary text-black font-black glow-yellow scale-105 z-10'
                      : hasTrips
                      ? 'bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 hover:scale-105 calendar-glow-day cursor-pointer'
                      : 'text-zinc-600 cursor-not-allowed hover:bg-zinc-900/10'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Schools Section */}
        <div className="mt-12 max-w-xl mx-auto">
          {selectedDay === null ? (
            <div className="text-center py-8 px-6 rounded-2xl border border-zinc-900 bg-zinc-950/20 text-zinc-500">
              <Sparkles size={24} className="mx-auto mb-2 text-zinc-700 animate-pulse" />
              <p className="text-sm font-semibold uppercase tracking-wider">
                Seleccioná un día iluminado en el almanaque
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest text-center mb-6">
                Colegios del día {selectedDay} de {currentMonthName} ({activeDaySchools.length})
              </h3>
              
              {activeDaySchools.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  No hay colegios registrados para esta fecha.
                </div>
              ) : (
                <div className="grid gap-4">
                  {activeDaySchools.map((school) => (
                    <div
                      key={school.id}
                      onClick={() => handleSelectSchool(school)}
                      className="group flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-primary/40 hover:bg-zinc-900 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_4px_20px_rgba(250,204,21,0.05)] transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          {school.school_names && school.school_names.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              {school.school_names.map((sName, sIdx) => (
                                <span key={sIdx} className="inline-flex items-center text-xs font-black text-white group-hover:text-primary transition-colors uppercase bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                                  {sName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <h4 className="text-base font-black text-white group-hover:text-primary transition-colors duration-300">
                              {school.name}
                            </h4>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                            <MapPin size={12} className="text-primary" />
                            {school.destination}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400 group-hover:text-primary transition-colors duration-300">
                        <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                          Ver Galería
                        </span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ACCESSIBLE MODAL DE SEGURIDAD PARA INGRESO DE CÓDIGO DE GRUPO */}
      {selectedSchoolForPin && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none"
          onClick={() => setSelectedSchoolForPin(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-pin-modal-title"
        >
          <div 
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedSchoolForPin(null)}
              aria-label="Cerrar modal de código"
              className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 glow-yellow">
              <Lock size={26} className="text-primary" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-2">
              <Sparkles size={12} />
              Acceso Privado al Grupo
            </div>

            <h3 id="calendar-pin-modal-title" className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
              {selectedSchoolForPin.name}
            </h3>

            {selectedSchoolForPin.school_names && selectedSchoolForPin.school_names.length > 1 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {selectedSchoolForPin.school_names.map((sName, idx) => (
                  <span key={idx} className="inline-flex items-center text-xs font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md uppercase">
                    {sName}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Ingresá el <strong className="text-white">Código de Grupo</strong> enviado por WhatsApp para desbloquear y ver la galería oficial de este viaje.
            </p>

            {calendarPinError && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-900/80 text-red-400 text-xs text-left flex items-start gap-2 animate-fade-in" role="alert">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{calendarPinError}</span>
              </div>
            )}

            <form onSubmit={handleCalendarPinSubmit} className="mt-5 space-y-3.5">
              <div>
                <label htmlFor="calendar-pin-input-field" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 text-left">
                  Código de Grupo:
                </label>
                <input
                  id="calendar-pin-input-field"
                  type="text"
                  autoFocus
                  maxLength={12}
                  value={calendarPinInput}
                  onChange={(e) => {
                    setCalendarPinInput(e.target.value);
                    if (calendarPinError) setCalendarPinError(null);
                  }}
                  placeholder="EJ: 0001"
                  className="w-full text-center text-2xl font-mono font-black uppercase tracking-widest py-3.5 px-4 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-primary text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-inner placeholder:text-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={!calendarPinInput.trim()}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-widest transition-all glow-yellow disabled:opacity-40 disabled:scale-95 disabled:hover:bg-primary shadow-lg cursor-pointer"
              >
                Ingresar a la Galería
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
