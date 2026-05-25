import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Sparkles, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { School } from '../types/database';

interface PremiumCalendarProps {
  destination: 'Mar del Plata' | 'Villa Carlos Paz';
}

export const PremiumCalendar: React.FC<PremiumCalendarProps> = ({ destination }) => {
  const [selectedMonth, setSelectedMonth] = useState<9 | 10 | 11>(10); // 9=Octubre, 10=Noviembre, 11=Diciembre (0-indexed base for JS Dates but we will use 9,10,11)
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    },
    {
      id: 'mock-school-5',
      name: 'Colegio Santa Rosa',
      destination: 'Villa Carlos Paz',
      travel_date: '2026-12-15',
      group_photo_web: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/carlospaz-santarosa.zip',
    },
    {
      id: 'mock-school-6',
      name: 'EGB Instituto Peralta Ramos',
      destination: 'Mar del Plata',
      travel_date: '2026-12-08',
      group_photo_web: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
      group_photo_hd: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1600&auto=format&fit=crop&q=80',
      multimedia_url: 'https://demo.backblaze.com/download/mdp-peraltaramos.zip',
    },
  ];

  // Fetch schools from database
  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('destination', destination);

        if (error) throw error;

        let loadedSchools: School[] = [];
        if (data && data.length > 0) {
          loadedSchools = data as School[];
        } else {
          // Fallback to mock data matching selected destination
          loadedSchools = mockSchools.filter((s) => s.destination === destination);
        }
        setSchools(loadedSchools);

        // Auto-select the first month that actually has registered schools!
        const monthsToCheck: (9 | 10 | 11)[] = [9, 10, 11];
        const monthsWithSchools = monthsToCheck.filter((m) => {
          const monthStr = monthData[m].monthStr;
          return loadedSchools.some((s) => {
            if (!s.travel_date) return false;
            const schoolDateOnly = s.travel_date.split(' ')[0].split('T')[0];
            return schoolDateOnly.startsWith(`2026-${monthStr}-`);
          });
        });

        if (monthsWithSchools.length > 0) {
          // If the default month (10 / Noviembre) has schools, keep it.
          // Otherwise, select the first month that has schools.
          if (!monthsWithSchools.includes(10)) {
            setSelectedMonth(monthsWithSchools[0]);
          }
        }
      } catch (err) {
        console.warn('Database connection failed, using mock school data.');
        const loadedSchools = mockSchools.filter((s) => s.destination === destination);
        setSchools(loadedSchools);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
    setSelectedDay(null); // Reset selected day when destination changes
  }, [destination]);

  // Calendar parameters for year 2026
  // October: 31 days, starts on Thursday (index 4)
  // November: 30 days, starts on Sunday (index 0)
  // December: 31 days, starts on Tuesday (index 2)
  const monthData = {
    9: { name: 'Octubre', days: 31, startOffset: 4, year: 2026, monthStr: '10' },
    10: { name: 'Noviembre', days: 30, startOffset: 0, year: 2026, monthStr: '11' },
    11: { name: 'Diciembre', days: 31, startOffset: 2, year: 2026, monthStr: '12' },
  };

  const currentMonth = monthData[selectedMonth];
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  // Check if a specific day has schools loaded (robustly extract date-only)
  const getSchoolsForDay = (day: number) => {
    const monthStr = currentMonth.monthStr;
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateQuery = `${currentMonth.year}-${monthStr}-${dayStr}`;
    return schools.filter((school) => {
      if (!school.travel_date) return false;
      const schoolDateOnly = school.travel_date.split(' ')[0].split('T')[0];
      return schoolDateOnly === dateQuery;
    });
  };

  // Check if a day has active trips to highlight
  const hasActiveTrips = (day: number) => {
    return getSchoolsForDay(day).length > 0;
  };

  // Helper to count schools in a specific month
  const getSchoolCountForMonth = (m: 9 | 10 | 11) => {
    const monthStr = monthData[m].monthStr;
    return schools.filter((s) => {
      if (!s.travel_date) return false;
      const schoolDateOnly = s.travel_date.split(' ')[0].split('T')[0];
      return schoolDateOnly.startsWith(`2026-${monthStr}-`);
    }).length;
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

        {/* Month Selector Cards (Oct, Nov, Dec) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
          {([9, 10, 11] as const).map((m) => {
            const isSelected = selectedMonth === m;
            const label = monthData[m].name;
            const schoolCount = getSchoolCountForMonth(m);
            const detailLabels = {
              9: 'Primavera Egresados',
              10: 'Temporada Alta',
              11: 'Fin de Año & Fiest'
            };
            
            return (
              <button
                key={m}
                onClick={() => {
                  setSelectedMonth(m);
                  setSelectedDay(null);
                }}
                className={`group p-4.5 rounded-2xl border text-left transition-all duration-500 transform relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white border-primary shadow-[0_0_25px_rgba(250,204,21,0.18)] scale-[1.03] z-10'
                    : 'bg-zinc-900/30 text-zinc-400 border-zinc-800/60 hover:bg-zinc-900/60 hover:text-white hover:border-zinc-700/80 hover:scale-[1.01]'
                }`}
              >
                {/* Active glow gradient bar at top */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-500 ${
                  isSelected ? 'bg-primary glow-yellow' : 'bg-transparent group-hover:bg-zinc-800'
                }`} />

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block leading-none">
                      Mes
                    </span>
                    <span className={`text-lg sm:text-xl font-black uppercase tracking-wide block mt-2 transition-colors duration-300 ${
                      isSelected ? 'text-primary' : 'text-zinc-200 group-hover:text-white'
                    }`}>
                      {label}
                    </span>
                  </div>

                  {/* School Counter Badge */}
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border transition-all duration-300 ${
                    schoolCount > 0
                      ? isSelected
                        ? 'bg-primary/20 border-primary/40 text-primary glow-yellow'
                        : 'bg-zinc-900 border-zinc-800 text-primary'
                      : 'bg-zinc-950/60 border-zinc-900 text-zinc-600'
                  }`}>
                    {schoolCount} {schoolCount === 1 ? 'Colegio' : 'Colegios'}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between text-[9px] text-zinc-500 font-bold tracking-wider uppercase">
                  <span>{detailLabels[m]}</span>
                  {isSelected && (
                    <span className="text-primary font-bold animate-pulse flex items-center gap-1">
                      Activo <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block"></span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Almanac Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-xl mx-auto border border-zinc-800/40 shadow-premium">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-primary glow-text-yellow" />
              <span className="text-lg font-black text-white uppercase tracking-wider font-outfit">
                {currentMonth.name} {currentMonth.year}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-800">
              <MapPin size={10} className="text-primary" />
              <span className="font-bold uppercase tracking-widest">{destination}</span>
            </div>
          </div>

          {/* Days of Week Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank placeholders for starting day offset */}
            {Array.from({ length: currentMonth.startOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="aspect-square" />
            ))}

            {/* Render actual days */}
            {Array.from({ length: currentMonth.days }).map((_, i) => {
              const dayNum = i + 1;
              const hasTrips = hasActiveTrips(dayNum);
              const isDaySelected = selectedDay === dayNum;

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => {
                    if (hasTrips) {
                      setSelectedDay(dayNum);
                    }
                  }}
                  disabled={!hasTrips && loading}
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
                Colegios del día {selectedDay} de {currentMonth.name} ({activeDaySchools.length})
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
                      onClick={() => navigate(`/colegio/${school.id}`)}
                      className="group flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-primary/40 hover:bg-zinc-900 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_4px_20px_rgba(250,204,21,0.05)] transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-4">
                        {/* School Preview thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
                          <img
                            src={school.group_photo_web}
                            alt={school.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-white group-hover:text-primary transition-colors duration-300">
                            {school.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                            <MapPin size={10} className="text-primary" />
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
    </div>
  );
};
