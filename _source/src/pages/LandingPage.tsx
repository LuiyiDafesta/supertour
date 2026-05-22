import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { DestinationSelector } from '../components/DestinationSelector';
import { PremiumCalendar } from '../components/PremiumCalendar';
import { Footer } from '../components/Footer';
import { useSEO } from '../hooks/useSEO';

export const LandingPage: React.FC = () => {
  useSEO({
    title: 'SuperTourChannel — Fotos y Videos de tu Viaje de Egresados',
    description: 'Reviví, compartí y descargá las fotos y videos de tu viaje de egresados de primaria a Mar del Plata y Carlos Paz con SuperTourChannel.',
    canonicalPath: '/'
  });

  const [selectedDestination, setSelectedDestination] = useState<'Mar del Plata' | 'Villa Carlos Paz' | null>(null);

  const handleSelectDestination = (dest: 'Mar del Plata' | 'Villa Carlos Paz') => {
    setSelectedDestination(dest);
    
    // Smooth scroll down to the calendar section after select
    setTimeout(() => {
      document.getElementById('calendario-seccion')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Dynamic sticky header */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Destination Card Selector */}
      <DestinationSelector
        selectedDestination={selectedDestination}
        onSelectDestination={handleSelectDestination}
      />

      {/* Step 2: Interactive Calendar Segment */}
      {selectedDestination && (
        <div id="calendario-seccion" className="transition-all duration-700 ease-in-out">
          <PremiumCalendar destination={selectedDestination} />
        </div>
      )}

      {/* Section: Nosotros */}
      <section id="nosotros" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-900/60 select-none relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none z-0" />
        
        <div className="text-center mb-16 relative z-10">
          <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
            Trayectoria y Liderazgo
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-2 uppercase tracking-tight">
            Sobre Nosotros
          </h2>
          <div className="w-12 h-1 bg-primary mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          {/* Brand Presentation Text */}
          <div className="space-y-6">
            <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight leading-tight">
              La marca homogénea del viaje de egresados de primaria
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed font-medium">
              En <strong className="text-white font-black">SuperTourChannel</strong> formamos parte de un ecosistema líder y consolidado en turismo estudiantil junto a empresas referentes como <strong className="text-primary font-black">TravelRock</strong> y <strong className="text-primary font-black">DreamsCDA</strong>. Compartimos la misma pasión, infraestructura y nivel de excelencia para que el viaje de los chicos sea seguro, emocionante e inolvidable.
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed font-medium">
              A través de nuestra plataforma premium, las familias pueden acompañar a los egresados reviviendo, descargando y compartiendo las galerías de fotos grupales e individuales tomadas por nuestros coordinadores en Mar del Plata y Villa Carlos Paz.
            </p>
            
            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="glass-card p-4 rounded-2xl border border-zinc-800/40 text-center">
                <span className="block text-2xl font-black text-primary leading-none glow-text-yellow">15+</span>
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">Años de Trayectoria</span>
              </div>
              <div className="glass-card p-4 rounded-2xl border border-zinc-800/40 text-center">
                <span className="block text-2xl font-black text-primary leading-none glow-text-yellow">100%</span>
                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">Seguridad & Cobertura</span>
              </div>
            </div>
          </div>

          {/* Graphical Mockup Cards / Image */}
          <div className="relative">
            <div className="glass-card p-3 rounded-3xl border border-zinc-800/30 bg-zinc-950/60 shadow-premium relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <img
                src="/hero-students.png"
                alt="SuperTour Egresados"
                className="w-full h-auto object-cover rounded-2xl border border-zinc-900 group-hover:scale-[1.01] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Premium Footer matching TravelRock layout */}
      <Footer />
    </div>
  );
};
