import { Request, Response } from 'express';
import { Currency } from '../models/Currency';
import { Transaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { User } from '../models/User';

export const createCurrency = async (req: Request, res: Response) => {
    try {
        const { code, name, symbol, exchangeRate } = req.body;

        const existingCurrency = await Currency.findOne({ code });
        if (existingCurrency) {
            return res.status(400).json({ message: 'Currency code already exists' });
        }

        const currency = await Currency.create({
            code,
            name,
            symbol,
            exchangeRate
        });

        res.status(201).json(currency);
    } catch (error) {
        res.status(500).json({ message: 'Error creating currency', error });
    }
};

export const getCurrencies = async (req: Request, res: Response) => {
    try {
        const currencies = await Currency.find({ isActive: true });
        res.json(currencies);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching currencies', error });
    }
};

export const updateExchangeRate = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const { exchangeRate } = req.body;

        const currency = await Currency.findOneAndUpdate(
            { code },
            { exchangeRate },
            { new: true }
        );

        if (!currency) {
            return res.status(404).json({ message: 'Currency not found' });
        }

        res.json(currency);
    } catch (error) {
        res.status(500).json({ message: 'Error updating exchange rate', error });
    }
};

export const exchangeCurrency = async (req: Request, res: Response) => {
    try {
        const { fromCurrency, toCurrency, amount } = req.body;
        const userId = req.user._id;

        // Get both currencies
        const [sourceCurrency, targetCurrency] = await Promise.all([
            Currency.findOne({ code: fromCurrency }),
            Currency.findOne({ code: toCurrency })
        ]);

        if (!sourceCurrency || !targetCurrency) {
            return res.status(404).json({ message: 'Currency not found' });
        }

        // Calculate exchange rate and target amount
        const exchangeRate = targetCurrency.exchangeRate / sourceCurrency.exchangeRate;
        const targetAmount = amount * exchangeRate;

        // Create exchange transaction
        const transaction = await Transaction.create({
            sender: userId,
            amount,
            currency: sourceCurrency._id,
            type: TransactionType.EXCHANGE,
            status: TransactionStatus.PENDING,
            exchangeRate,
            targetCurrency: targetCurrency._id,
            targetAmount
        });

        // Update user balances
        await User.findByIdAndUpdate(
            userId,
            {
                $inc: {
                    'balances.$[source].amount': -amount,
                    'balances.$[target].amount': targetAmount
                }
            },
            {
                arrayFilters: [
                    { 'source.currency': sourceCurrency._id },
                    { 'target.currency': targetCurrency._id }
                ]
            }
        );

        // Update transaction status
        await Transaction.findByIdAndUpdate(
            transaction._id,
            { status: TransactionStatus.COMPLETED }
        );

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Error exchanging currency', error });
    }
}; 