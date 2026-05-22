import React from 'react';
import { Instagram, MessageCircle, PlayCircle, Youtube } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black pt-16 pb-8 border-t border-zinc-900 select-none font-sans relative z-20">
      {/* Symmetrical glowing background radial light */}
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Step 1: Three Premium Outline Boxes Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Instagram */}
          <a
            href="https://www.instagram.com/supertour.ok"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-primary bg-[#030303] hover:bg-[#070707] transition-all duration-300 group shadow-[0_0_20px_rgba(250,204,21,0.05)] hover:shadow-[0_0_25px_rgba(250,204,21,0.15)] transform hover:-translate-y-1"
          >
            <div className="w-16 h-16 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary glow-yellow mb-6 group-hover:scale-110 transition-transform duration-300">
              <Instagram size={28} />
            </div>
            <h3 className="text-white font-black text-sm uppercase tracking-wider leading-relaxed group-hover:text-primary transition-colors duration-300">
              DISFRUTA LA EXPERIENCIA EN <br /> INSTAGRAM
            </h3>
          </a>

          {/* Card 2: Contact */}
          <a
            href="https://wa.me/5491122334455"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-primary bg-[#030303] hover:bg-[#070707] transition-all duration-300 group shadow-[0_0_20px_rgba(250,204,21,0.05)] hover:shadow-[0_0_25px_rgba(250,204,21,0.15)] transform hover:-translate-y-1"
          >
            <div className="w-16 h-16 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary glow-yellow mb-6 group-hover:scale-110 transition-transform duration-300">
              <MessageCircle size={28} />
            </div>
            <h3 className="text-white font-black text-sm uppercase tracking-wider leading-relaxed group-hover:text-primary transition-colors duration-300">
              CONSULTAS, COMENTARIOS Y <br /> SUGERENCIAS
            </h3>
          </a>

          {/* Card 3: Experience */}
          <a
            href="#destinos"
            className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-primary bg-[#030303] hover:bg-[#070707] transition-all duration-300 group shadow-[0_0_20px_rgba(250,204,21,0.05)] hover:shadow-[0_0_25px_rgba(250,204,21,0.15)] transform hover:-translate-y-1"
          >
            <div className="w-16 h-16 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary glow-yellow mb-6 group-hover:scale-110 transition-transform duration-300">
              <PlayCircle size={28} />
            </div>
            <h3 className="text-white font-black text-sm uppercase tracking-wider leading-relaxed group-hover:text-primary transition-colors duration-300">
              EXPERIENCIA <br /> SUPERTOURCHANNEL
            </h3>
          </a>

        </div>

        {/* Step 2: Three Dark Pills Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          
          {/* Pill 1: SUPERTOUR */}
          <div className="flex items-center justify-center bg-[#09090b] border border-zinc-900 rounded-xl py-5 px-6 text-center select-none shadow-sm hover:border-zinc-800 transition-colors">
            <span className="font-sans font-black text-lg uppercase tracking-wider text-white">
              SUPER<span className="text-primary">TOUR</span>
            </span>
          </div>

          {/* Pill 2: SUPERTOURCHANNEL */}
          <div className="flex items-center justify-center bg-[#09090b] border border-zinc-900 rounded-xl py-5 px-6 text-center select-none shadow-sm hover:border-zinc-800 transition-colors">
            <span className="font-sans font-black text-lg uppercase tracking-wider text-primary glow-text-yellow">
              SUPERTOURCHANNEL
            </span>
          </div>

          {/* Pill 3: DREAMSCDA */}
          <div className="flex items-center justify-center bg-[#09090b] border border-zinc-900 rounded-xl py-5 px-6 text-center select-none shadow-sm hover:border-zinc-800 transition-colors">
            <span className="font-sans font-black text-lg uppercase tracking-wider text-white">
              DREAMS<span className="text-zinc-500">CDA</span>
            </span>
          </div>

        </div>

        {/* Step 3: Big Glowing Yellow Bar */}
        <div className="bg-primary rounded-xl p-6 sm:p-8 text-center shadow-[0_0_40px_rgba(250,204,21,0.2)] mb-12 transform hover:scale-[1.01] transition-transform duration-300">
          <p className="text-black font-sans font-black text-sm sm:text-base md:text-lg uppercase tracking-widest leading-relaxed">
            SOMOS #SUPERTOURCHANNEL, LA NUEVA EXPERIENCIA AUDIOVISUAL. <br className="hidden sm:inline" />
            SUMATE A LA NUEVA EXPERIENCIA SUPERTOURCHANNEL
          </p>
        </div>

        {/* Step 4: Bottom Copyright & Social Icons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-zinc-900 text-xs text-zinc-500 font-medium">
          
          {/* Copyright Links */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-center md:text-left leading-relaxed">
            <span>TEMPORADA {new Date().getFullYear()}.</span>
            <span>Derechos Reservados {new Date().getFullYear()} - SuperTourChannel - Powered By Dreams CDA</span>
            <span className="hidden sm:inline text-zinc-800 px-1">|</span>
            <a href="#terminos" className="hover:text-zinc-300 transition-colors">Términos y Condiciones</a>
            <span className="text-zinc-800 px-1">|</span>
            <a href="#privacidad" className="hover:text-zinc-300 transition-colors">Política de Privacidad</a>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/supertour.ok"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-white border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm hover:text-primary"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-white border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm hover:text-primary"
            >
              <Youtube size={18} />
            </a>
          </div>

        </div>

      </div>
    </footer>
  );
};
