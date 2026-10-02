import { Router } from 'express';
import {
  getAvailability,
  bookAppointment,
  listAppointments,
  changeStatus,
} from '../controllers/appointment.controller.js';

const router = Router();

router.get('/availability', getAvailability); // before /:id paths
router.get('/', listAppointments);
router.post('/', bookAppointment);
router.patch('/:id/status', changeStatus);

export default router;
