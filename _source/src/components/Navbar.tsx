import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { Menu, X, LogIn, LayoutDashboard, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<'inicio' | 'destinos' | 'nosotros' | null>('inicio');
  const location = useLocation();
  const navigate = useNavigate();

  // Scroll active section spy (only on Landing Page)
  useEffect(() => {
    const handleScroll = () => {
      // 1. Navbar scrolled style toggler
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // 2. Active section highlighter
      if (location.pathname !== '/') {
        setActiveSection(null);
        return;
      }

      const scrollPos = window.scrollY + 120; // 120px offset for optimal trigger distance
      const destinosEl = document.getElementById('destinos');
      const nosotrosEl = document.getElementById('nosotros');

      const destinosOffset = destinosEl ? destinosEl.getBoundingClientRect().top + window.scrollY : 99999;
      const nosotrosOffset = nosotrosEl ? nosotrosEl.getBoundingClientRect().top + window.scrollY : 99999;

      if (scrollPos >= nosotrosOffset) {
        setActiveSection('nosotros');
      } else if (scrollPos >= destinosOffset) {
        setActiveSection('destinos');
      } else {
        setActiveSection('inicio');
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger once on mount/pathname change
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Check auth state
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAdmin(!!data.session);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleScrollToTopOrNavigate = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToDestinos = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      document.getElementById('destinos')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      e.preventDefault();
      navigate('/');
      setTimeout(() => {
        document.getElementById('destinos')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const handleScrollToNosotros = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      document.getElementById('nosotros')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      e.preventDefault();
      navigate('/');
      setTimeout(() => {
        document.getElementById('nosotros')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const triggerContactModal = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event('open-contact-modal'));
    if (typeof (window as any).openContactModal === 'function') {
      (window as any).openContactModal();
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-md border-b border-zinc-800/50 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.8)]'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex-shrink-0">
            <Link to="/" onClick={handleScrollToTopOrNavigate} className="flex items-center">
              <Logo size="md" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              onClick={handleScrollToTopOrNavigate}
              className={`text-sm font-black tracking-wide uppercase px-3 pt-1 pb-2 border-b-2 transition-all duration-200 ${
                isActive('/') && activeSection === 'inicio'
                  ? 'text-primary border-primary glow-text-yellow' 
                  : 'text-zinc-300 border-transparent hover:text-white hover:border-zinc-700/50'
              }`}
            >
              Inicio
            </Link>
            
            <a
              href="#destinos"
              onClick={handleScrollToDestinos}
              className={`text-sm font-black tracking-wide uppercase px-3 pt-1 pb-2 border-b-2 transition-all duration-200 ${
                isActive('/') && activeSection === 'destinos'
                  ? 'text-primary border-primary glow-text-yellow' 
                  : 'text-zinc-300 border-transparent hover:text-white hover:border-zinc-700/50'
              }`}
            >
              Destinos
            </a>

            <a
              href="#nosotros"
              onClick={handleScrollToNosotros}
              className={`text-sm font-black tracking-wide uppercase px-3 pt-1 pb-2 border-b-2 transition-all duration-200 ${
                isActive('/') && activeSection === 'nosotros'
                  ? 'text-primary border-primary glow-text-yellow' 
                  : 'text-zinc-300 border-transparent hover:text-white hover:border-zinc-700/50'
              }`}
            >
              Nosotros
            </a>

            <a
              href="#contacto"
              onClick={triggerContactModal}
              className="text-sm font-black tracking-wide uppercase px-3 pt-1 pb-2 border-b-2 border-transparent text-zinc-300 hover:text-white hover:border-zinc-700/50 transition-all duration-200"
            >
              Contacto
            </a>

            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 text-sm font-black tracking-wide uppercase px-3 pt-1 pb-2 border-b-2 transition-all duration-200 ${
                    isActive('/admin') 
                      ? 'text-primary border-primary glow-text-yellow' 
                      : 'text-zinc-300 border-transparent hover:text-white hover:border-zinc-700/50'
                  }`}
                >
                  <LayoutDashboard size={16} />
                  Panel Admin
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-black tracking-wide uppercase px-3 pt-1 pb-2 border-b-2 border-transparent text-red-400 hover:text-red-300 hover:border-red-500/30 transition-all duration-200"
                >
                  <LogOut size={16} />
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-zinc-700 text-sm font-semibold text-white tracking-wide uppercase transition-all duration-300"
              >
                <LogIn size={15} className="text-primary" />
                Acceso Admin
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 focus:outline-none transition-colors duration-200"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-zinc-800/80 transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible'
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/"
            onClick={(e) => {
              setIsOpen(false);
              handleScrollToTopOrNavigate(e);
            }}
            className={`block px-3 py-2 rounded-md text-base font-semibold tracking-wide uppercase ${
              isActive('/') && activeSection === 'inicio' ? 'text-primary bg-zinc-900/50' : 'text-zinc-300 hover:text-white'
            }`}
          >
            Inicio
          </Link>
          
          <a
            href="#destinos"
            onClick={(e) => {
              setIsOpen(false);
              handleScrollToDestinos(e);
            }}
            className={`block px-3 py-2 rounded-md text-base font-semibold tracking-wide uppercase ${
              isActive('/') && activeSection === 'destinos' ? 'text-primary bg-zinc-900/50' : 'text-zinc-300 hover:text-white'
            }`}
          >
            Destinos
          </a>

          <a
            href="#nosotros"
            onClick={(e) => {
              setIsOpen(false);
              handleScrollToNosotros(e);
            }}
            className={`block px-3 py-2 rounded-md text-base font-semibold tracking-wide uppercase ${
              isActive('/') && activeSection === 'nosotros' ? 'text-primary bg-zinc-900/50' : 'text-zinc-300 hover:text-white'
            }`}
          >
            Nosotros
          </a>

          <a
            href="#contacto"
            onClick={(e) => {
              setIsOpen(false);
              triggerContactModal(e);
            }}
            className="block px-3 py-2 rounded-md text-base font-semibold tracking-wide uppercase text-zinc-300 hover:text-white"
          >
            Contacto
          </a>

          {isAdmin ? (
            <>
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-semibold tracking-wide uppercase ${
                  isActive('/admin') ? 'text-primary bg-zinc-900/50' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <LayoutDashboard size={18} />
                Panel Admin
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-base font-semibold tracking-wide uppercase text-red-400 hover:bg-zinc-900/50"
              >
                <LogOut size={18} />
                Salir
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-semibold tracking-wide uppercase border border-zinc-800 bg-zinc-900/40 text-white"
            >
              <LogIn size={18} className="text-primary" />
              Acceso Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
