# SkillX - Skill Swap Platform

A web platform where people exchange skills instead of money. Users can list what they can teach and what they want to learn, and get AI-powered matches for skill swaps.

## Features

- **AI Matchmaking**: Smart skill compatibility scoring using Cosine Similarity
- **Real-time Chat**: Socket.io powered messaging between matched users
- **Video Calls**: WebRTC video calls for skill swap sessions
- **Skill Verification**: Monaco Editor coding tests & quiz systems
- **Gamification**: Badges, points, and leaderboards
- **Modern UI**: Beautiful React frontend with TailwindCSS

## Tech Stack

### Frontend
- React.js with Vite
- TailwindCSS for styling
- Redux Toolkit for state management
- Socket.io client for real-time features
- Monaco Editor for code editing
- React Router for navigation

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- Socket.io for real-time communication
- JWT for authentication
- bcryptjs for password hashing

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SkillX_full_project
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   PORT=4000
   MONGO_URI=mongodb://127.0.0.1:27017/skillx
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   CLIENT_ORIGIN=http://localhost:5173
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas (update MONGO_URI in .env)
   ```

5. **Run the application**
   ```bash
   # Terminal 1 - Start the server
   cd server
   npm run dev

   # Terminal 2 - Start the client
   cd client
   npm run dev
   ```

6. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000

## Usage

1. **Sign Up**: Create an account with your skills to teach and learn
2. **Find Matches**: Browse AI-powered skill matches
3. **Start Chat**: Message your matches to arrange skill swaps
4. **Video Calls**: Conduct skill swap sessions via video
5. **Take Tests**: Verify your skills and earn badges
6. **Track Progress**: Monitor your learning journey

## API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### Matches
- `GET /matches` - Get user matches
- `POST /matches/accept/:matchId` - Accept a match
- `GET /matches/:matchId/messages` - Get match messages
- `POST /matches/:matchId/messages` - Send message

### Users
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update profile
- `GET /users/stats` - Get user statistics

### Tests
- `GET /tests` - Get available tests
- `POST /tests/run` - Run code
- `POST /tests/submit` - Submit test

### Sessions
- `POST /sessions/start` - Start session
- `POST /sessions/end` - End session
- `GET /sessions` - Get user sessions

## Project Structure

```
SkillX_full_project/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store
│   │   └── main.jsx       # App entry point
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth middleware
│   │   ├── utils/         # Utility functions
│   │   └── index.js       # Server entry point
│   └── package.json
└── README.md
```

## Features in Detail

### AI Matchmaking
- Uses cosine similarity to calculate skill compatibility
- Considers both skills to teach and skills to learn
- Provides compatibility scores (0-100%)

### Real-time Features
- Live chat between matched users
- Typing indicators
- Online status
- Video call signaling

### Skill Verification
- Monaco Editor integration for code editing
- Multiple programming languages support
- Automated test case evaluation
- Points and badges system

### Security
- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- Input validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@skillx.com or create an issue in the repository.
