import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { DestinationSelector } from '../components/DestinationSelector';
import { PremiumCalendar } from '../components/PremiumCalendar';
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

      {/* Premium Footer matching TravelRock layout */}
      <Footer />
    </div>
  );
};
