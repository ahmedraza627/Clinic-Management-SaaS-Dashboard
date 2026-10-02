import { Router } from 'express';
import { listDoctors } from '../controllers/doctors.controller.js';

const router = Router();

router.get('/', listDoctors);

export default router;
