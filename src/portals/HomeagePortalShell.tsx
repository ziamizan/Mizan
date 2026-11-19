import { Routes, Route, Navigate } from 'react-router-dom';
import { HomeagePortalPage } from '../pages/HomeagePortalPage';

/**
 * Strictly Isolated Food Donation Orphanage Portal Shell.
 * Imports ONLY HomeagePortalPage — zero Hospital, Blood, Doctors, Admin, Layout, or shared Navigation imports.
 */
export default function HomeagePortalShell() {
  return (
    <Routes>
      <Route path="/orphanage" element={<HomeagePortalPage />} />
      <Route path="/orphanage/login" element={<Navigate to="/orphanage" replace />} />
      <Route path="/homeage" element={<Navigate to="/orphanage" replace />} />
      <Route path="/homeage/login" element={<Navigate to="/orphanage" replace />} />
      <Route path="*" element={<Navigate to="/orphanage" replace />} />
    </Routes>
  );
}
