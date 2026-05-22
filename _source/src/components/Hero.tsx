import React from 'react';
import { ArrowDown } from 'lucide-react';

export const Hero: React.FC = () => {
  const handleScrollToDestinations = () => {
    document.getElementById('destinos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative h-[100vh] w-full flex items-center justify-center overflow-hidden bg-black select-none">
      {/* Background Image with Parallax & Ken Burns Effect */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-students.png"
          alt="Egresados Primaria SuperTour"
          className="w-full h-full object-cover object-center scale-105 animate-[subtle-zoom_20s_infinite_alternate] opacity-45 select-none"
        />
        {/* Sleek Dark Vignette Overlays for Maximum Premium Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 z-10" />
        {/* Symmetrical glowing background radial lights */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />
      </div>

      {/* Hero Content Area */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 text-center mt-12">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6 animate-pulse select-none">
          <span className="w-2 h-2 rounded-full bg-primary glow-yellow" />
          La Experiencia de tu Vida
        </div>

        {/* Dynamic Stylized Title */}
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-white leading-tight uppercase tracking-tight">
          El Canal de tu <br className="hidden sm:inline" />
          <span className="text-primary glow-text-yellow relative inline-block">
            Viaje de Egresados
            <span className="absolute left-0 bottom-1 w-full h-[6px] bg-primary/20 -skew-x-12" />
          </span>
        </h1>

        {/* Beautiful Subtitle */}
        <p className="mt-6 text-base sm:text-xl md:text-2xl text-zinc-300 max-w-3xl mx-auto font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          Reviví, compartí y descargá en alta definición el contenido multimedia y las fotos grupales de tu viaje escolar a <span className="text-white font-bold">Mar del Plata</span> y <span className="text-white font-bold">Villa Carlos Paz</span>.
        </p>

        {/* Interactive Smooth Scroll Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleScrollToDestinations}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary hover:bg-primary/90 text-black font-black text-base uppercase tracking-wider transition-all duration-300 shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:shadow-[0_0_40px_rgba(250,204,21,0.5)] transform hover:-translate-y-0.5"
          >
            Buscar mi Colegio
          </button>
          
          <a
            href="#destinos"
            onClick={(e) => {
              e.preventDefault();
              handleScrollToDestinations();
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-full border border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/60 hover:border-zinc-500 text-white font-black text-base uppercase tracking-wider transition-all duration-300 backdrop-blur-sm"
          >
            Ver Destinos
          </a>
        </div>
      </div>

      {/* Animated Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity duration-300" onClick={handleScrollToDestinations}>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Desplazar</span>
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-zinc-600 p-1">
          <div className="h-2 w-1.5 rounded-full bg-primary animate-[bounce_1.5s_infinite]" />
        </div>
      </div>
      
      {/* Dynamic Keyframes injected locally */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtle-zoom {
          0% { transform: scale(1.03) translate(0px, 0px); }
          100% { transform: scale(1.08) translate(5px, 2px); }
        }
      `}} />
    </div>
  );
};
