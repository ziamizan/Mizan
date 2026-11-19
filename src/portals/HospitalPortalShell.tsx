import { Routes, Route, Navigate } from 'react-router-dom';
import { HospitalPortalPage } from '../pages/HospitalPortalPage';

/**
 * Strictly Isolated Hospital Portal Shell.
 * Imports ONLY HospitalPortalPage — zero Homeage, Food, Admin, Layout, or shared Navigation imports.
 */
export default function HospitalPortalShell() {
  return (
    <Routes>
      <Route path="/hospital" element={<HospitalPortalPage />} />
      <Route path="/hospital/login" element={<Navigate to="/hospital" replace />} />
      <Route path="*" element={<Navigate to="/hospital" replace />} />
    </Routes>
  );
}
