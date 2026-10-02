import { useEffect, useState } from 'react';
import Sidebar from './components/layout/Sidebar.jsx';
import TopHeader from './components/layout/TopHeader.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import BillingPage from './pages/BillingPage.jsx';
import AppointmentModal from './components/appointments/AppointmentModal.jsx';
import PatientModal from './components/patients/PatientModal.jsx';
import { useClinic } from './context/ClinicContext.jsx';

// Step 1 ships a lightweight hash router; swapping to react-router is a
// one-file change when deep links are needed.
function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || 'dashboard');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}

export default function App() {
  const route = useHashRoute();
  const { modals, toast } = useClinic();

  const pages = {
    dashboard: <Dashboard />,
    patients: <PatientsPage />,
    appointments: <AppointmentsPage />,
    billing: <BillingPage />,
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar current={route} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-6">{pages[route] ?? pages.dashboard}</main>
      </div>

      <AppointmentModal open={modals.appointment} />
      <PatientModal open={modals.patient} />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.kind === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
