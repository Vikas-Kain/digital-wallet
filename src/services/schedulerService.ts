import cron from 'node-cron';
import { Transaction, TransactionStatus } from '../models/Transaction';
import { User } from '../models/User';
import { checkTransactionFraud } from './fraudDetection';
import { sendFraudAlert } from './emailService';

// Run daily at midnight
export const scheduleFraudScan = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('Running daily fraud scan...');
        try {
            // Get all pending transactions from the last 24 hours
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const transactions = await Transaction.find({
                createdAt: { $gte: yesterday },
                status: TransactionStatus.PENDING
            }).populate({
                path: 'sender',
                model: 'User'
            });

            for (const transaction of transactions) {
                const user = await User.findById(transaction.sender);
                if (!user) continue;

                const fraudCheck = await checkTransactionFraud(user, transaction.amount, transaction.type);

                if (fraudCheck.isFlagged) {
                    // Update transaction status
                    transaction.status = TransactionStatus.FLAGGED;
                    transaction.flagReason = fraudCheck.reason;
                    await transaction.save();

                    // Send alert to user
                    await sendFraudAlert(user.email, {
                        amount: transaction.amount,
                        type: transaction.type,
                        createdAt: transaction.createdAt,
                        flagReason: fraudCheck.reason
                    });
                }
            }

            console.log(`Fraud scan completed. Processed ${transactions.length} transactions.`);
        } catch (error) {
            console.error('Error in fraud scan:', error);
        }
    });
}; 