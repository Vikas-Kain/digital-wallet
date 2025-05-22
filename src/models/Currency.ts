import mongoose, { Document, Schema } from 'mongoose';

export interface ICurrency extends Document {
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number;  // Exchange rate relative to base currency (USD)
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const currencySchema = new Schema<ICurrency>({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    symbol: {
        type: String,
        required: true,
        trim: true
    },
    exchangeRate: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for faster queries
currencySchema.index({ code: 1 });
currencySchema.index({ isActive: 1 });

export const Currency = mongoose.model<ICurrency>('Currency', currencySchema); 