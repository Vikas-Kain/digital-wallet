import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Transaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { User, IUser } from '../models/User';
import { checkTransactionFraud } from '../services/fraudDetection';

export const deposit = async (req: Request, res: Response) => {
    try {
        const { amount, description, currencyId } = req.body;
        const userId = req.user._id;

        console.log('Deposit request:', { amount, description, currencyId, userId });

        // Validate currency exists
        const currency = await mongoose.model('Currency').findById(currencyId);
        if (!currency) {
            return res.status(400).json({ message: 'Invalid currency ID' });
        }

        // Check for fraud
        const fraudCheck = await checkTransactionFraud(req.user, amount, TransactionType.DEPOSIT);
        if (fraudCheck.isFlagged) {
            return res.status(400).json({ message: 'Transaction flagged for review', reason: fraudCheck.reason });
        }

        // Create transaction
        const transaction = await Transaction.create({
            sender: userId,
            amount,
            currency: currencyId,
            type: TransactionType.DEPOSIT,
            description,
            status: TransactionStatus.PENDING,
            isFlagged: false
        });

        console.log('Transaction created:', transaction);

        // Get user and update balance
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        console.log('Current user balances:', user.balances);

        // Find the index of the balance for this currency
        const balanceIndex = user.balances.findIndex(
            (b: { currency: mongoose.Types.ObjectId }) =>
                b.currency.toString() === currencyId
        );

        if (balanceIndex >= 0) {
            // Update existing balance
            user.balances[balanceIndex].amount += amount;
        } else {
            // Add new balance
            user.balances.push({
                currency: currencyId,
                amount: amount
            });
        }

        // Save the updated user
        await user.save();

        console.log('Updated user balances:', user.balances);

        // Update transaction status
        transaction.status = TransactionStatus.COMPLETED;
        await transaction.save();

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({
            message: 'Error processing deposit',
            error: error instanceof Error ? error.message : error
        });
    }
};

// Helper function to get balance for a currency
const getBalanceForCurrency = (user: IUser, currencyId: string): number => {
    const balance = user.balances.find((b: { currency: mongoose.Types.ObjectId }) =>
        b.currency.toString() === currencyId
    );
    return balance ? balance.amount : 0;
};

export const withdraw = async (req: Request, res: Response) => {
    try {
        const { amount, description, currencyId } = req.body;
        const userId = req.user._id;

        // Check for fraud
        const fraudCheck = await checkTransactionFraud(req.user, amount, TransactionType.WITHDRAWAL);
        if (fraudCheck.isFlagged) {
            return res.status(400).json({ message: 'Transaction flagged for review', reason: fraudCheck.reason });
        }

        // Check sufficient balance
        const user = await User.findById(userId);
        if (!user || getBalanceForCurrency(user, currencyId) < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Create transaction
        const transaction = await Transaction.create({
            sender: userId,
            amount,
            currency: currencyId,
            type: TransactionType.WITHDRAWAL,
            description,
            status: TransactionStatus.PENDING,
            isFlagged: false
        });

        // Update user balance
        const balanceIndex = user.balances.findIndex(
            (b: { currency: mongoose.Types.ObjectId }) =>
                b.currency.toString() === currencyId
        );

        if (balanceIndex >= 0) {
            user.balances[balanceIndex].amount -= amount;
            await user.save();
        }

        // Update transaction status
        transaction.status = TransactionStatus.COMPLETED;
        await transaction.save();

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({
            message: 'Error processing withdrawal',
            error: error instanceof Error ? error.message : error
        });
    }
};

export const transfer = async (req: Request, res: Response) => {
    try {
        const { recipientId, amount, description, currencyId } = req.body;
        const senderId = req.user._id;

        console.log('Transfer request:', { recipientId, amount, description, currencyId, senderId });

        // Validate currency exists
        const currency = await mongoose.model('Currency').findById(currencyId);
        if (!currency) {
            return res.status(400).json({ message: 'Invalid currency ID' });
        }

        // Validate recipient ID format
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            return res.status(400).json({ message: 'Invalid recipient ID format' });
        }

        // Check for fraud
        const fraudCheck = await checkTransactionFraud(req.user, amount, TransactionType.TRANSFER);
        if (fraudCheck.isFlagged) {
            return res.status(400).json({ message: 'Transaction flagged for review', reason: fraudCheck.reason });
        }

        // Check sufficient balance
        const sender = await User.findById(senderId);
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found' });
        }

        const senderBalanceIndex = sender.balances.findIndex(
            (b: { currency: mongoose.Types.ObjectId }) =>
                b.currency.toString() === currencyId
        );

        if (senderBalanceIndex === -1 || sender.balances[senderBalanceIndex].amount < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Check recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        // Create transaction
        const transaction = await Transaction.create({
            sender: senderId,
            recipient: recipientId,
            amount,
            currency: currencyId,
            type: TransactionType.TRANSFER,
            description,
            status: TransactionStatus.PENDING,
            isFlagged: false
        });

        console.log('Transaction created:', transaction);

        // Update sender's balance
        sender.balances[senderBalanceIndex].amount -= amount;
        await sender.save();

        // Update recipient's balance
        const recipientBalanceIndex = recipient.balances.findIndex(
            (b: { currency: mongoose.Types.ObjectId }) =>
                b.currency.toString() === currencyId
        );

        if (recipientBalanceIndex >= 0) {
            recipient.balances[recipientBalanceIndex].amount += amount;
        } else {
            recipient.balances.push({
                currency: currencyId,
                amount: amount
            });
        }
        await recipient.save();

        console.log('Updated balances:', {
            sender: sender.balances,
            recipient: recipient.balances
        });

        // Update transaction status
        transaction.status = TransactionStatus.COMPLETED;
        await transaction.save();

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({
            message: 'Error processing transfer',
            error: error instanceof Error ? error.message : error
        });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;
        const transactions = await Transaction.find({
            $or: [{ sender: userId }, { recipient: userId }]
        })
            .sort({ createdAt: -1 })
            .populate('sender', 'firstName lastName email')
            .populate('recipient', 'firstName lastName email');

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
};

export const getFlaggedTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find({ isFlagged: true })
            .sort({ createdAt: -1 })
            .populate('sender', 'firstName lastName email')
            .populate('recipient', 'firstName lastName email');

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching flagged transactions', error });
    }
}; 