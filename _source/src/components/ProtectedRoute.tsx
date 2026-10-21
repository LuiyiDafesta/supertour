import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const verifyAdmin = async (user: { id: string; email?: string }): Promise<boolean> => {
      const email = (user.email || '').toLowerCase().trim();
      if (['lsnetinformatica2024@gmail.com', 'pax@travelrockchannel.com.ar'].includes(email)) {
        return true;
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !data) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    };

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) {
          if (mounted) {
            setAuthenticated(false);
            setLoading(false);
          }
          return;
        }

        const isAdmin = await verifyAdmin(data.session.user);
        if (mounted) {
          setAuthenticated(isAdmin);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setAuthenticated(false);
          setLoading(false);
        }
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        if (mounted) {
          setAuthenticated(false);
          setLoading(false);
        }
      } else {
        const isAdmin = await verifyAdmin(session.user);
        if (mounted) {
          setAuthenticated(isAdmin);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-zinc-400 text-xs font-semibold tracking-wider uppercase">
            Verificando credenciales de acceso...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
