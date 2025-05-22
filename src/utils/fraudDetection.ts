import { Transaction, TransactionType } from '../models/Transaction';
import { IUser } from '../models/User';

interface FraudCheckResult {
    isFlagged: boolean;
    reason?: string;
}

export const checkTransactionFraud = async (
    user: IUser,
    amount: number,
    type: TransactionType
): Promise<FraudCheckResult> => {
    const checks = [
        checkLargeTransaction(amount),
        await checkRapidTransactions(user._id),
        await checkUnusualPattern(user._id, amount, type)
    ];

    for (const check of checks) {
        if (check.isFlagged) {
            return check;
        }
    }

    return { isFlagged: false };
};

const checkLargeTransaction = (amount: number): FraudCheckResult => {
    const LARGE_TRANSACTION_THRESHOLD = 10000; // $10,000
    if (amount > LARGE_TRANSACTION_THRESHOLD) {
        return {
            isFlagged: true,
            reason: `Transaction amount (${amount}) exceeds large transaction threshold`
        };
    }
    return { isFlagged: false };
};

const checkRapidTransactions = async (userId: string): Promise<FraudCheckResult> => {
    const RAPID_TRANSACTION_WINDOW = 5 * 60 * 1000; // 5 minutes
    const RAPID_TRANSACTION_LIMIT = 5;

    const recentTransactions = await Transaction.find({
        sender: userId,
        createdAt: { $gte: new Date(Date.now() - RAPID_TRANSACTION_WINDOW) }
    });

    if (recentTransactions.length >= RAPID_TRANSACTION_LIMIT) {
        return {
            isFlagged: true,
            reason: `Multiple transactions (${recentTransactions.length}) detected within short time window`
        };
    }
    return { isFlagged: false };
};

const checkUnusualPattern = async (
    userId: string,
    amount: number,
    type: TransactionType
): Promise<FraudCheckResult> => {
    const UNUSUAL_AMOUNT_THRESHOLD = 0.5; // 50% increase from average

    const recentTransactions = await Transaction.find({
        sender: userId,
        type,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (recentTransactions.length > 0) {
        const averageAmount = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;
        if (amount > averageAmount * (1 + UNUSUAL_AMOUNT_THRESHOLD)) {
            return {
                isFlagged: true,
                reason: `Transaction amount (${amount}) is significantly higher than average (${averageAmount})`
            };
        }
    }

    return { isFlagged: false };
}; 