import { Router } from 'express';
import {
  dashboardStats,
  dailyVisits,
  monthlyRevenue,
  statusDistribution,
} from '../controllers/analytics.controller.js';

const router = Router();

router.get('/dashboard', dashboardStats);
router.get('/visits/daily', dailyVisits);
router.get('/revenue/monthly', monthlyRevenue);
router.get('/status-distribution', statusDistribution);

export default router;
