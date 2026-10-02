import { Router } from 'express';
import {
  createInvoice,
  listInvoices,
  getInvoice,
  setPaymentStatus,
} from '../controllers/invoice.controller.js';

const router = Router();

router.get('/', listInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.patch('/:id/payment', setPaymentStatus);

export default router;
