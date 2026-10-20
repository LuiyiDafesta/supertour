import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { SchoolDetailPage } from './pages/SchoolDetailPage';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { SurveyPage } from './pages/SurveyPage';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AnalyticsTracker />
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
        <Toaster position="top-center" theme="dark" closeButton />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
