import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Transaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { User, IUser } from '../models/User';
import { checkTransactionFraud } from '../utils/fraudDetection';

export const deposit = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount, description } = req.body;
        const userId = req.user._id;

        // Check for fraud
        const fraudCheck = await checkTransactionFraud(req.user, amount, TransactionType.DEPOSIT);
        if (fraudCheck.isFlagged) {
            return res.status(400).json({ message: 'Transaction flagged for review', reason: fraudCheck.reason });
        }

        // Create transaction
        const transaction = await Transaction.create([{
            sender: userId,
            amount,
            type: TransactionType.DEPOSIT,
            description,
            status: TransactionStatus.PENDING,
            isFlagged: false
        }], { session });

        // Update user balance
        await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: amount } },
            { session }
        );

        // Update transaction status
        await Transaction.findByIdAndUpdate(
            transaction[0]._id,
            { status: TransactionStatus.COMPLETED },
            { session }
        );

        await session.commitTransaction();
        res.status(201).json(transaction[0]);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Error processing deposit', error });
    } finally {
        session.endSession();
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
    const session = await mongoose.startSession();
    session.startTransaction();

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
        const transaction = await Transaction.create([{
            sender: userId,
            amount,
            type: TransactionType.WITHDRAWAL,
            description,
            status: TransactionStatus.PENDING,
            isFlagged: false
        }], { session });

        // Update user balance
        await User.findByIdAndUpdate(
            userId,
            { $inc: { balance: -amount } },
            { session }
        );

        // Update transaction status
        await Transaction.findByIdAndUpdate(
            transaction[0]._id,
            { status: TransactionStatus.COMPLETED },
            { session }
        );

        await session.commitTransaction();
        res.status(201).json(transaction[0]);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Error processing withdrawal', error });
    } finally {
        session.endSession();
    }
};

export const transfer = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { recipientId, amount, description, currencyId } = req.body;
        const senderId = req.user._id;

        // Check for fraud
        const fraudCheck = await checkTransactionFraud(req.user, amount, TransactionType.TRANSFER);
        if (fraudCheck.isFlagged) {
            return res.status(400).json({ message: 'Transaction flagged for review', reason: fraudCheck.reason });
        }

        // Check sufficient balance
        const sender = await User.findById(senderId);
        if (!sender || getBalanceForCurrency(sender, currencyId) < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Check recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        // Create transaction
        const transaction = await Transaction.create([{
            sender: senderId,
            recipient: recipientId,
            amount,
            type: TransactionType.TRANSFER,
            description,
            status: TransactionStatus.PENDING,
            isFlagged: false
        }], { session });

        // Update balances
        await User.findByIdAndUpdate(
            senderId,
            { $inc: { balance: -amount } },
            { session }
        );

        await User.findByIdAndUpdate(
            recipientId,
            { $inc: { balance: amount } },
            { session }
        );

        // Update transaction status
        await Transaction.findByIdAndUpdate(
            transaction[0]._id,
            { status: TransactionStatus.COMPLETED },
            { session }
        );

        await session.commitTransaction();
        res.status(201).json(transaction[0]);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Error processing transfer', error });
    } finally {
        session.endSession();
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