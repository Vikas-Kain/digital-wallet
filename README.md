# Digital Wallet System

A robust digital wallet system with multi-currency support, fraud detection, and real-time transaction monitoring.

##  Features

- **Multi-Currency Support**
  - Support for multiple currencies with real-time exchange rates
  - Currency conversion and exchange functionality
  - Admin-managed exchange rates

- **Advanced Security**
  - Real-time fraud detection
  - Suspicious transaction monitoring
  - Email alerts for flagged activities
  - JWT-based authentication
  - Role-based access control

- **Transaction Management**
  - Deposit and withdrawal operations
  - Peer-to-peer transfers
  - Transaction history with detailed records
  - Soft delete functionality for data integrity

- **Admin Features**
  - Currency management
  - Exchange rate updates
  - Flagged transaction monitoring
  - User management

## Tech Stack

- Node.js & Express
- TypeScript
- MongoDB with Mongoose
- JWT for authentication
- Node-cron for scheduled tasks
- Nodemailer for email alerts

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd digital-wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/digital-wallet
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

## Testing the System

### 1. Setup Postman Environment

Import the provided `postman_collection.json` and set up these environment variables:
```
baseUrl: http://localhost:3000/api
userToken: (set after login)
adminToken: (set after admin login)
usdCurrencyId: (set after creating USD currency)
recipientId: (set after creating second user)
```

### 2. Test Flow

#### A. User Management
1. Register a regular user:
   ```json
   POST /api/users/register
   {
       "email": "test@example.com",
       "password": "password123",
       "firstName": "John",
       "lastName": "Doe"
   }
   ```

2. Register an admin user:
   ```json
   POST /api/users/register
   {
       "email": "admin@example.com",
       "password": "admin123",
       "firstName": "Admin",
       "lastName": "User",
       "isAdmin": true
   }
   ```

3. Login and save tokens:
   ```json
   POST /api/users/login
   {
       "email": "test@example.com",
       "password": "password123"
   }
   ```

#### B. Currency Setup (Admin)
1. Create USD currency:
   ```json
   POST /api/currencies
   {
       "code": "USD",
       "name": "US Dollar",
       "symbol": "$",
       "exchangeRate": 1.0
   }
   ```

2. Create EUR currency:
   ```json
   POST /api/currencies
   {
       "code": "EUR",
       "name": "Euro",
       "symbol": "€",
       "exchangeRate": 1.1
   }
   ```

#### C. Transaction Flow
1. Make a deposit:
   ```json
   POST /api/transactions/deposit
   {
       "amount": 1000,
       "currencyId": "{{usdCurrencyId}}",
       "description": "Initial deposit"
   }
   ```

2. Make a withdrawal:
   ```json
   POST /api/transactions/withdraw
   {
       "amount": 100,
       "currencyId": "{{usdCurrencyId}}",
       "description": "ATM withdrawal"
   }
   ```

3. Transfer to another user:
   ```json
   POST /api/transactions/transfer
   {
       "recipientId": "{{recipientId}}",
       "amount": 50,
       "currencyId": "{{usdCurrencyId}}",
       "description": "Payment for services"
   }
   ```

#### D. Fraud Detection Demo
1. Make multiple rapid transactions to trigger fraud detection
2. Make a large withdrawal to test amount-based flags
3. Check console for email alerts (in development mode)

#### E. Admin Features
1. View flagged transactions:
   ```
   GET /api/transactions/flagged
   ```

2. Update exchange rates:
   ```json
   PUT /api/currencies/EUR/exchange-rate
   {
       "exchangeRate": 1.1
   }
   ```

## Key Features to Demonstrate

1. **Multi-Currency Support**
   - Show currency creation and management
   - Demonstrate exchange rate updates
   - Test currency conversion

2. **Security Features**
   - JWT authentication
   - Role-based access control
   - Fraud detection system
   - Email alerts

3. **Transaction Management**
   - Atomic transactions
   - Balance updates
   - Transaction history
   - Soft delete functionality

4. **Error Handling**
   - Insufficient balance
   - Invalid currency
   - Unauthorized access
   - Invalid transactions

## Performance Features

- MongoDB indexes for faster queries
- Scheduled fraud scans
- Concurrent transaction handling
- Soft delete for data integrity

## Security Considerations

- Password hashing with bcrypt
- JWT token expiration
- Input validation
- Rate limiting
- CORS configuration
- Helmet security headers

## API Documentation

Full API documentation is available in the Postman collection. Import `postman_collection.json` to access detailed endpoint documentation and test examples. 