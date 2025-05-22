import mongoose, { Document, Schema } from 'mongoose';

export enum TransactionType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    TRANSFER = 'TRANSFER',
    EXCHANGE = 'EXCHANGE'
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    FLAGGED = 'FLAGGED'
}

export interface ITransaction extends Document {
    sender: mongoose.Types.ObjectId;
    recipient?: mongoose.Types.ObjectId;
    amount: number;
    currency: mongoose.Types.ObjectId;
    type: TransactionType;
    status: TransactionStatus;
    description?: string;
    isFlagged: boolean;
    flagReason?: string;
    exchangeRate?: number;  // For exchange transactions
    targetCurrency?: mongoose.Types.ObjectId;  // For exchange transactions
    targetAmount?: number;  // For exchange transactions
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
    deletedAt: Date | null;
}

const transactionSchema = new Schema<ITransaction>({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: Schema.Types.ObjectId,
        ref: 'Currency',
        required: true
    },
    type: {
        type: String,
        enum: Object.values(TransactionType),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(TransactionStatus),
        default: TransactionStatus.PENDING
    },
    description: {
        type: String,
        trim: true
    },
    isFlagged: {
        type: Boolean,
        default: false
    },
    flagReason: {
        type: String,
        trim: true
    },
    exchangeRate: {
        type: Number,
        min: 0
    },
    targetCurrency: {
        type: Schema.Types.ObjectId,
        ref: 'Currency'
    },
    targetAmount: {
        type: Number,
        min: 0
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ recipient: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ currency: 1 });

// Add middleware to handle soft delete
transactionSchema.pre('find', function () {
    this.where({ isDeleted: false });
});

transactionSchema.pre('findOne', function () {
    this.where({ isDeleted: false });
});

// Add method for soft delete
transactionSchema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};

// Add method for restore
transactionSchema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
};

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema); 