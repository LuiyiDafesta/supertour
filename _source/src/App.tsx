import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';

// Route-based code splitting to isolate heavy admin dashboard and secondary pages
const SchoolDetailPage = lazy(() => import('./pages/SchoolDetailPage').then(m => ({ default: m.SchoolDetailPage })));
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const SurveyPage = lazy(() => import('./pages/SurveyPage').then(m => ({ default: m.SurveyPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-black flex items-center justify-center select-none">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3 glow-yellow" />
      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
        Cargando sección...
      </p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AnalyticsTracker />
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/colegio/:id" element={<SchoolDetailPage />} />
            <Route path="/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/encuesta/:surveyId" element={<SurveyPage />} />
          </Routes>
        </Suspense>
        <Toaster position="top-center" theme="dark" closeButton />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
