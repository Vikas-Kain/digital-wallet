import nodemailer from 'nodemailer';

// Create a mock transporter for development
const transporter = nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'test@example.com',
        pass: process.env.EMAIL_PASS || 'password'
    }
});

export const sendAlert = async (to: string, subject: string, text: string) => {
    try {
        // In development, just log the email
        if (process.env.NODE_ENV === 'development') {
            console.log('Email Alert:', {
                to,
                subject,
                text
            });
            return;
        }

        // Sending mock email
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'alerts@digitalwallet.com',
            to,
            subject,
            text
        });
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

export const sendFraudAlert = async (userEmail: string, transactionDetails: any) => {
    const subject = 'Suspicious Transaction Alert';
    const text = `
        Dear User,
        
        We have detected a suspicious transaction on your account:
        
        Amount: ${transactionDetails.amount}
        Type: ${transactionDetails.type}
        Date: ${transactionDetails.createdAt}
        Reason: ${transactionDetails.flagReason}
        
        Please review this transaction and contact support if you did not authorize it.
        
        Best regards,
        Digital Wallet Security Team
    `;

    await sendAlert(userEmail, subject, text);
}; 