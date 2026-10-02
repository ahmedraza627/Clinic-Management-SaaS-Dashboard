import { Router } from 'express';
import {
  searchPatients,
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  addVitals,
  addHistoryEntry,
} from '../controllers/patient.controller.js';

const router = Router();

router.get('/search', searchPatients); // before /:id so "search" isn't captured
router.get('/', listPatients);
router.get('/:id', getPatient);
router.post('/', createPatient);
router.put('/:id', updatePatient);
router.post('/:id/vitals', addVitals);
router.post('/:id/history', addHistoryEntry);

export default router;
