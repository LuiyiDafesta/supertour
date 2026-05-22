import React from 'react';

interface DestinationSelectorProps {
  selectedDestination: 'Mar del Plata' | 'Villa Carlos Paz' | null;
  onSelectDestination: (dest: 'Mar del Plata' | 'Villa Carlos Paz') => void;
}

export const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  selectedDestination,
  onSelectDestination,
}) => {
  const destinations = [
    {
      id: 'Mar del Plata' as const,
      title: 'Mar del Plata',
      image: '/mdp.png',
      tagline: 'Playa, olas y noches inolvidables',
      description: 'El clásico atlántico que combina diversión, mar y las mejores actividades en la costa argentina.',
    },
    {
      id: 'Villa Carlos Paz' as const,
      title: 'Villa Carlos Paz',
      image: '/vcp.png',
      tagline: 'Sierras, aventura y boliches premium',
      description: 'El corazón de Córdoba te espera con sus lagos, parques de aventura y las mejores discos del país.',
    },
  ];

  return (
    <div id="destinos" className="py-24 bg-black/60 relative z-10 select-none border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
            Paso 1: Tu Destino
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 uppercase tracking-tight">
            ¿A Dónde Fue tu Viaje?
          </h2>
          <p className="mt-4 text-zinc-400 text-base sm:text-lg">
            Seleccioná tu destino para ver el calendario y acceder a las fotos exclusivas de tu colegio.
          </p>
        </div>

        {/* Destination Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {destinations.map((dest) => {
            const isSelected = selectedDestination === dest.id;
            const isAnySelected = selectedDestination !== null;

            return (
              <div
                key={dest.id}
                onClick={() => onSelectDestination(dest.id)}
                className={`relative group cursor-pointer overflow-hidden rounded-2xl border transition-all duration-500 transform ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 scale-[1.02] shadow-[0_0_40px_rgba(250,204,21,0.25)]'
                    : isAnySelected
                    ? 'border-zinc-800/60 opacity-50 grayscale hover:opacity-85 hover:grayscale-0 hover:border-zinc-600 scale-[0.98]'
                    : 'border-zinc-800 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(250,204,21,0.15)] hover:scale-[1.01]'
                }`}
              >
                {/* Image background with modern zoom effect */}
                <div className="h-[280px] sm:h-[350px] w-full overflow-hidden relative">
                  <img
                    src={dest.image}
                    alt={dest.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  {/* Premium overlay gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                </div>

                {/* Card Content Area */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-12">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      Egresados
                    </span>
                    {isSelected && (
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary glow-yellow"></span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-3">
                    {dest.title}
                  </h3>
                  
                  <p className="text-sm font-semibold text-zinc-400 mt-1 uppercase tracking-wider">
                    {dest.tagline}
                  </p>

                  <p className="text-zinc-500 text-xs sm:text-sm mt-3 leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
                    {dest.description}
                  </p>

                  {/* Visual indication of choice */}
                  <div className="mt-5 flex items-center justify-end">
                    <span className={`text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      isSelected ? 'text-primary' : 'text-zinc-400 group-hover:text-white'
                    }`}>
                      {isSelected ? 'Destino Seleccionado ✓' : 'Seleccionar Destino →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
