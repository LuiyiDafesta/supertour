import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { DestinationSelector } from '../components/DestinationSelector';
import { PremiumCalendar } from '../components/PremiumCalendar';
import { MapPin, Calendar, Check, Sparkles, MessageCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Footer } from '../components/Footer';

export const LandingPage: React.FC = () => {
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

      {/* Features Overview Section: "Por qué Super Tour Channel es Premium Pro" */}
      <section className="py-24 bg-black border-t border-zinc-900 select-none relative overflow-hidden">
        {/* Glow backgrounds */}
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-xs font-bold text-primary tracking-[0.25em] uppercase glow-text-yellow">
              Experiencia Premium Pro
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 uppercase tracking-tight">
              Calidad que se Siente
            </h2>
            <p className="mt-4 text-zinc-400 text-base">
              Nuestra plataforma está diseñada para ofrecerte la forma más veloz, estética y cómoda de revivir tu viaje.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="glass-card p-8 rounded-2xl border border-zinc-800/40 relative group hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary glow-yellow mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-black uppercase text-white tracking-wide">
                Galerías Premium Pro
              </h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
                Una galería masonry ultra-flexible con opción de visualización ajustable en columnas, filtros rápidos por actividades, zoom de alta fidelidad y descargas instantáneas.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8 rounded-2xl border border-zinc-800/40 relative group hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary glow-yellow mb-6">
                <Check size={24} />
              </div>
              <h3 className="text-lg font-black uppercase text-white tracking-wide">
                Doble Bucket Backblaze
              </h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
                Alojamiento inteligente. Mostramos miniaturas web ultra-livianas comprimidas al instante para un rendimiento móvil veloz y permitimos descargas directas en HD desde Backblaze B2.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 rounded-2xl border border-zinc-800/40 relative group hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary glow-yellow mb-6">
                <MessageCircle size={24} />
              </div>
              <h3 className="text-lg font-black uppercase text-white tracking-wide">
                Compartir al Instante
              </h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
                Compartí fotos individuales de la galería o el enlace completo de tu colegio de forma directa por WhatsApp con tus compañeros de clase con un solo toque.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Footer matching TravelRock layout */}
      <Footer />
    </div>
  );
};
