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

      {/* Premium Footer matching TravelRock layout */}
      <Footer />
    </div>
  );
};
