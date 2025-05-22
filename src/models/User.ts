import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

interface Balance {
    currency: mongoose.Types.ObjectId;
    amount: number;
}

export interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    balances: Balance[];
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    isDeleted: boolean;
    deletedAt: Date | null;
    softDelete(): Promise<void>;
    restore(): Promise<void>;
}

const userSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    balances: [{
        currency: {
            type: Schema.Types.ObjectId,
            ref: 'Currency',
            required: true
        },
        amount: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    isAdmin: {
        type: Boolean,
        default: false
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

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Add middleware to handle soft delete
userSchema.pre('find', function () {
    this.where({ isDeleted: false });
});

userSchema.pre('findOne', function () {
    this.where({ isDeleted: false });
});

// Add method for soft delete
userSchema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};

// Add method for restore
userSchema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
};

export const User = mongoose.model<IUser>('User', userSchema); 