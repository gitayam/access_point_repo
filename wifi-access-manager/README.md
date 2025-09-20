# WiFi Access Point Manager

A comprehensive web application for managing WiFi access points with password sharing, speed testing, and community ratings. Built following 12-factor app principles.

## Features

- 🗺️ **Interactive Map Interface** - View and discover WiFi access points on a map
- 🔐 **Secure Password Sharing** - Share WiFi passwords within organizations
- 📱 **QR Code Generation** - Quick connection via QR codes
- ⚡ **Speed Testing** - Test and track connection speeds
- ⭐ **Rating System** - Community-driven ratings and reviews
- 🏢 **Organization Management** - Share access points within teams
- 🌐 **WiGLE.net Integration** - Import existing access points from WiGLE database
- 📍 **Location-Based Search** - Find nearby access points using geolocation
- 🚫 **Service Blocking Reports** - Track blocked services (VPN, streaming, etc.)

## Tech Stack

### Backend
- Node.js with Express and TypeScript
- PostgreSQL with PostGIS for spatial data
- Redis for caching and sessions
- Socket.io for real-time updates
- JWT authentication
- WiGLE.net API integration

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Leaflet for maps
- React Query for data fetching
- Zustand for state management

## Prerequisites

- Node.js 18+
- PostgreSQL 15+ with PostGIS extension
- Redis 7+
- Docker and Docker Compose (for containerized deployment)

## Installation

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd wifi-access-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
# Start PostgreSQL and Redis using Docker
docker-compose up -d postgres redis

# Run database migrations
cd backend
npm run migrate
```

5. Start development servers:
```bash
# From root directory
npm run dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend on http://localhost:5173

### Production Deployment with Docker

1. Build and start all services:
```bash
docker-compose up --build
```

This will start:
- PostgreSQL database
- Redis cache
- Backend API
- Frontend (served via Nginx)

The application will be available at http://localhost

## Environment Variables

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (change in production!)
- `WIGLE_API_KEY` - WiGLE.net API key
- `WIGLE_API_ID` - WiGLE.net API ID
- `FRONTEND_URL` - Frontend URL for CORS configuration

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Access Points
- `GET /api/access-points/nearby` - Get nearby access points
- `GET /api/access-points/:id` - Get access point details
- `POST /api/access-points` - Create new access point
- `POST /api/access-points/:id/password` - Add/update password
- `POST /api/access-points/:id/rating` - Submit rating
- `GET /api/access-points/:id/qr-code` - Generate QR code

### WiGLE Integration
- `POST /api/wigle/search` - Search WiGLE database
- `GET /api/wigle/statistics` - Get WiGLE statistics

### Speed Testing
- `POST /api/speed-test/run` - Run speed test
- `GET /api/speed-test/history/:accessPointId` - Get test history

### Organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/mine` - Get current organization
- `POST /api/organizations/join` - Join organization
- `POST /api/organizations/leave` - Leave organization

## Project Structure

```
wifi-access-manager/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Express middleware
│   │   └── db/          # Database configuration
│   ├── package.json
│   └── Dockerfile
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/      # Page components
│   │   ├── stores/     # Zustand stores
│   │   └── hooks/      # Custom hooks
│   ├── package.json
│   └── Dockerfile
├── database/           # Database schemas
│   └── schema.sql
├── docker-compose.yml  # Docker orchestration
└── README.md
```

## Security Considerations

- Passwords are encrypted in the database
- JWT tokens for authentication
- Rate limiting on API endpoints
- CORS configuration for frontend
- Environment variables for sensitive data
- HTTPS recommended for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT

## Acknowledgments

- WiGLE.net for their WiFi database API
- OpenStreetMap for map data
- The open-source community for the amazing tools and libraries