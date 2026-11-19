/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { HospitalLoginPage } from './pages/HospitalLoginPage';
import { HomeageLoginPage } from './pages/HomeageLoginPage';
import { VerifyProofPage } from './pages/VerifyProofPage';

/**
 * Strictly Restricted Dynamic Portal Imports:
 * Only Hospital, Homeage, and Community shells exist — Centralized Admin Portal removed.
 * Hospital and Homeage bundles never share navigation or dashboard components.
 */
const PortalSelectionPage = lazy(() => import('./pages/PortalSelectionPage'));
const HospitalPortalShell = lazy(() => import('./portals/HospitalPortalShell'));
const HomeagePortalShell = lazy(() => import('./portals/HomeagePortalShell'));
const CommunityPortalShell = lazy(() => import('./portals/CommunityPortalShell'));

function SessionCheckScreen({ label = 'Loading HelpConnect...' }: { label?: string }) {
  return (
    <div className="min-h-screen w-full bg-[#060b1e] text-white flex flex-col items-center justify-center p-6">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-teal-400 to-indigo-500 p-[1.5px] shadow-[0_12px_36px_rgba(6,182,212,0.35)] mb-4">
        <div className="w-full h-full rounded-[14px] bg-[#0b1332] flex items-center justify-center">
          <Heart className="w-7 h-7 text-cyan-300 fill-cyan-400/25" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function AppContent() {
  const {
    firebaseUser,
    authReady,
    roleResolved,
    portalRole,
    hasMultipleRoles,
    awaitingRegistrationVerification,
  } = useAppContext();

  if (!authReady || (firebaseUser && !roleResolved)) {
    return <SessionCheckScreen />;
  }

  const isAuthenticated = Boolean(firebaseUser) && !awaitingRegistrationVerification;

  return (
    <Router>
      <Suspense fallback={<SessionCheckScreen label="Opening workspace..." />}>
        {!isAuthenticated ? (
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/portals/login" element={<AdminLoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/hospital/login" element={<HospitalLoginPage />} />
            <Route path="/orphanage/login" element={<HomeageLoginPage />} />
            <Route path="/homeage/login" element={<HomeageLoginPage />} />
            <Route path="/verify" element={<VerifyProofPage />} />
            <Route path="/verify/:proofId" element={<VerifyProofPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : hasMultipleRoles && portalRole === null ? (
          /* UNIFIED PORTAL SELECTION — ONLY FOR MULTI-ROLE USERS (HOSPITAL & HOMEAGE ONLY) */
          <Routes>
            <Route path="/portals" element={<PortalSelectionPage />} />
            <Route path="*" element={<Navigate to="/portals" replace />} />
          </Routes>
        ) : portalRole === 'HOSPITAL' ? (
          /* STRICTLY ISOLATED HOSPITAL PORTAL (Zero Food/Homeage/Shared Nav Imports) */
          <Routes>
            {hasMultipleRoles && <Route path="/portals" element={<PortalSelectionPage />} />}
            <Route path="*" element={<HospitalPortalShell />} />
          </Routes>
        ) : portalRole === 'HOMEAGE' ? (
          /* STRICTLY ISOLATED FOOD HOMEAGE PORTAL (Zero Hospital/Blood/Shared Nav Imports) */
          <Routes>
            {hasMultipleRoles && <Route path="/portals" element={<PortalSelectionPage />} />}
            <Route path="*" element={<HomeagePortalShell />} />
          </Routes>
        ) : (
          /* NORMAL USER COMMUNITY PORTAL */
          <Routes>
            <Route path="/hospital/login" element={<HospitalLoginPage />} />
            <Route path="/orphanage/login" element={<HomeageLoginPage />} />
            <Route path="/homeage/login" element={<HomeageLoginPage />} />
            <Route path="/portals/login" element={<AdminLoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="*" element={<CommunityPortalShell />} />
          </Routes>
        )}
      </Suspense>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
