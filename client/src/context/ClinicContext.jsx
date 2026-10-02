import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const ClinicContext = createContext(null);

/**
 * Context API store (per spec — no Redux). Holds dashboard analytics,
 * lookup lists, and modal state so the sidebar layout + top stats header
 * can share one source of truth.
 */
export function ClinicProvider({ children }) {
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [modals, setModals] = useState({ appointment: false, patient: false });
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, kind = 'success') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await api.dashboard());
    } catch (e) {
      console.warn('[stats] unavailable:', e.message);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    try {
      const { items } = await api.listAppointments();
      setAppointments(items);
    } catch (e) {
      console.warn('[appointments] unavailable:', e.message);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    loadAppointments();
    // Doctors come from the appointments we already populated — a dedicated
    // /api/doctors endpoint is a Step-2 nicety.
  }, [refreshStats, loadAppointments]);

  const openModal = (name) => setModals((m) => ({ ...m, [name]: true }));
  const closeModal = (name) => setModals((m) => ({ ...m, [name]: false }));

  const value = {
    stats,
    refreshStats,
    doctors,
    appointments,
    loadAppointments,
    modals,
    openModal,
    closeModal,
    toast,
    notify,
  };

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
}

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error('useClinic must be used inside <ClinicProvider>');
  return ctx;
}
