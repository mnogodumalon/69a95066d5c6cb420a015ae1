import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import StrassenverzeichnisPage from '@/pages/StrassenverzeichnisPage';
import SchnellmeldungPage from '@/pages/SchnellmeldungPage';
import SchadensmeldungenPage from '@/pages/SchadensmeldungenPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="straßenverzeichnis" element={<StrassenverzeichnisPage />} />
          <Route path="schnellmeldung" element={<SchnellmeldungPage />} />
          <Route path="schadensmeldungen" element={<SchadensmeldungenPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}