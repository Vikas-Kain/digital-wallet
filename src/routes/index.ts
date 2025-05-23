import express from 'express';
import { protect, admin } from '../middleware/auth';
import * as userController from '../controllers/userController';
import * as transactionController from '../controllers/transactionController';
import * as currencyController from '../controllers/currencyController';

const router = express.Router();

// Auth routes
router.post('/auth/register', userController.register);
router.post('/auth/login', userController.login);

// User routes
router.get('/users/profile', protect, userController.getProfile);
router.put('/users/profile', protect, userController.updateProfile);
router.get('/users/top', protect, admin, userController.getTopUsers);

// Transaction routes
router.post('/transactions/deposit', protect, transactionController.deposit);
router.post('/transactions/withdraw', protect, transactionController.withdraw);
router.post('/transactions/transfer', protect, transactionController.transfer);
router.get('/transactions', protect, transactionController.getTransactions);
router.get('/transactions/flagged', protect, admin, transactionController.getFlaggedTransactions);

// Currency routes
router.get('/currencies', currencyController.getCurrencies);
router.post('/currencies', protect, admin, currencyController.createCurrency);
router.put('/currencies/:code/exchange-rate', protect, admin, currencyController.updateExchangeRate);
router.post('/currencies/exchange', protect, currencyController.exchangeCurrency);

// Admin routes
router.get('/admin/flagged-transactions', protect, admin, transactionController.getFlaggedTransactions);

export default router; 