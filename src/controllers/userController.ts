import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const generateToken = (id: string): string => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, firstName, lastName, isAdmin } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            isAdmin: isAdmin || false
        });

        res.status(201).json({
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            token: generateToken(updatedUser._id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error });
    }
};

export const getTopUsers = async (req: Request, res: Response) => {
    try {
        // Get all users and sort them by their total balance across all currencies
        const users = await User.find()
            .select('-password')
            .populate('balances.currency', 'code name symbol');

        // Calculate total balance for each user
        const usersWithTotalBalance = users.map(user => {
            const totalBalance = user.balances.reduce((sum, balance) => sum + balance.amount, 0);
            return {
                ...user.toObject(),
                totalBalance
            };
        });

        // Sort users by total balance in descending order
        const sortedUsers = usersWithTotalBalance.sort((a, b) => b.totalBalance - a.totalBalance);

        // Get top 10 users
        const topUsers = sortedUsers.slice(0, 10);

        res.json(topUsers);
    } catch (error) {
        console.error('Error getting top users:', error);
        res.status(500).json({
            message: 'Error getting top users',
            error: error instanceof Error ? error.message : error
        });
    }
}; 