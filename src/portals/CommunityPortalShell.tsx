import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LandingPage } from '../pages/LandingPage';
import { Dashboard } from '../pages/Dashboard';
import { RequestPage } from '../pages/RequestPage';
import { ImpactPage } from '../pages/ImpactPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ProofsDashboardPage } from '../pages/ProofsDashboardPage';
import { HelpHistoryPage } from '../pages/HelpHistoryPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { VerifyProofPage } from '../pages/VerifyProofPage';
import { IssueReportingPage } from '../pages/IssueReportingPage';
import { FoodDonationPage } from '../pages/FoodDonationPage';
import { AvailableFoodPage } from '../pages/AvailableFoodPage';
import { FoodAssistancePage } from '../pages/FoodAssistancePage';
import { SettingsPage } from '../pages/SettingsPage';
import { PublicProfilePage } from '../pages/PublicProfilePage';
import { BloodDonationHubPage } from '../pages/BloodDonationHubPage';

/**
 * Strictly Isolated Community Member Shell.
 * Imports ONLY Normal User community pages — zero HospitalPortalPage, HomeagePortalPage, or AdminDashboardPage imports.
 */
export default function CommunityPortalShell() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/" replace />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/radar" element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<Dashboard />} />
        <Route path="/blood" element={<BloodDonationHubPage />} />
        <Route path="/food" element={<AvailableFoodPage />} />
        <Route path="/food-donate" element={<FoodDonationPage />} />
        <Route path="/food-assistance" element={<FoodAssistancePage />} />
        <Route path="/request" element={<RequestPage />} />
        <Route path="/proofs" element={<ProofsDashboardPage />} />
        <Route path="/history" element={<HelpHistoryPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/verify" element={<VerifyProofPage />} />
        <Route path="/verify/:proofId" element={<VerifyProofPage />} />
        <Route path="/report-issue" element={<IssueReportingPage />} />
        <Route path="/report-issue/:requestId" element={<IssueReportingPage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/public" element={<PublicProfilePage />} />
        <Route path="/profile/:userId" element={<PublicProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
