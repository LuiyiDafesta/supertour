import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { Lock, Mail, ShieldAlert, Sparkles, ArrowLeft, KeyRound, CheckCircle2, X } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

export const AdminLogin: React.FC = () => {
  useSEO({
    title: 'Iniciar Sesión — Panel Administrativo',
    description: 'Acceso seguro al panel de administración de SuperTourChannel para gestionar escuelas, galerías de fotos y cargas de viajes.',
    canonicalPath: '/login'
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Password Recovery State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const isAuthorizedAdmin = (user: { id?: string; email?: string } | null | undefined, adminRecord: any) => {
    if (adminRecord) return true;
    const userEmail = (user?.email || '').toLowerCase().trim();
    return ['lsnetinformatica2024@gmail.com', 'pax@travelrockchannel.com.ar'].includes(userEmail);
  };

  // Check if session already exists and has admin privileges
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (isAuthorizedAdmin(data.session.user, adminRecord)) {
          navigate('/admin');
        }
      }
    };
    checkSession();
  }, [navigate]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForgotModal) {
        setShowForgotModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is an explicit administrator in public.admin_users or authorized admin list
      if (data.user) {
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!isAuthorizedAdmin(data.user, adminRecord)) {
          await supabase.auth.signOut();
          throw new Error('Acceso denegado: esta cuenta no posee privilegios de administración.');
        }
      }

      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoverySuccess(null);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetErr) throw resetErr;

      setRecoverySuccess('Se envió un enlace de restablecimiento a tu correo electrónico. Por favor revisá tu bandeja de entrada o spam.');
    } catch (err: any) {
      setRecoveryError(err.message || 'No se pudo enviar el correo de recuperación. Verificá la dirección ingresada.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative px-4 select-none">
      {/* Decorative Glow lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0" />

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Volver a la página principal"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors duration-200"
      >
        <ArrowLeft size={16} />
        Volver al Inicio
      </button>

      {/* Glass card container */}
      <div className="w-full max-w-md bg-zinc-950/80 border border-zinc-800/80 p-8 rounded-3xl shadow-premium backdrop-blur-md relative z-10">
        
        {/* Header containing the brand logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-4" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={12} className="text-primary" />
            Acceso Autorizado
          </div>
        </div>

        {/* Error logger alert */}
        {error && (
          <div role="alert" className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 flex items-start gap-3 text-xs leading-relaxed animate-[shake_0.4s]">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wide">Error de Acceso</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email input group */}
          <div>
            <label htmlFor="admin-login-email" className="block text-xs font-bold text-zinc-300 uppercase tracking-widest mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                id="admin-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@supertour.com.ar"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-sm font-medium focus:outline-none transition-all placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Password input group */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="admin-login-password" className="block text-xs font-bold text-zinc-300 uppercase tracking-widest">
                Contraseña Secreta
              </label>
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail(email);
                  setRecoverySuccess(null);
                  setRecoveryError(null);
                  setShowForgotModal(true);
                }}
                className="text-xs text-primary hover:underline font-semibold"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                id="admin-login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-primary/50 text-white text-sm font-medium focus:outline-none transition-all placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Submit Trigger */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] glow-yellow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              'Ingresar al Panel'
            )}
          </button>
        </form>

      </div>

      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              aria-label="Cerrar modal de recuperación"
              className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 glow-yellow">
              <KeyRound size={26} className="text-primary" />
            </div>

            <h3 id="forgot-modal-title" className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
              Recuperar Contraseña
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Ingresá tu correo electrónico de administrador. Te enviaremos un enlace seguro para crear una nueva contraseña.
            </p>

            {recoverySuccess && (
              <div role="status" className="mt-4 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-900/60 text-emerald-300 text-xs text-left flex items-start gap-2.5 animate-fade-in">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{recoverySuccess}</span>
              </div>
            )}

            {recoveryError && (
              <div role="alert" className="mt-4 p-3.5 rounded-xl bg-red-950/50 border border-red-900/60 text-red-400 text-xs text-left flex items-start gap-2.5 animate-fade-in">
                <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                <span>{recoveryError}</span>
              </div>
            )}

            {!recoverySuccess && (
              <form onSubmit={handlePasswordRecovery} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="recovery-email-input" className="block text-xs font-bold text-zinc-300 uppercase tracking-widest mb-1.5 text-left">
                    Correo Electrónico
                  </label>
                  <input
                    id="recovery-email-input"
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="admin@supertour.com.ar"
                    className="w-full py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-primary text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-zinc-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={recoveryLoading || !recoveryEmail.trim()}
                  className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-widest transition-all glow-yellow disabled:opacity-50 cursor-pointer"
                >
                  {recoveryLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                </button>
              </form>
            )}

            {recoverySuccess && (
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="mt-5 w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider border border-zinc-800 transition-colors"
              >
                Cerrar y Volver
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Dynamic Keyframes for error alert shaking */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}} />
    </div>
  );
};
