# WiFi Access Manager 📶

A comprehensive web application for discovering, managing, and sharing WiFi access points with community-driven features.

## 🌟 Features

- **📍 Interactive Map Interface** - Discover WiFi access points near you with real-time location tracking
- **🔐 Secure Password Sharing** - Share WiFi passwords securely within your organization
- **📊 Speed Testing** - Test and track connection speeds for each access point
- **⭐ Community Ratings** - Rate and review access points based on your experience
- **🚫 Service Restrictions** - Report blocked services (VPN, streaming, torrenting, etc.)
- **📱 QR Code Generation** - Quick connection sharing via QR codes
- **🏢 Organization Support** - Team collaboration for managing shared access points
- **🔍 WiGLE.net Integration** - Search and import existing WiFi networks from the world's largest WiFi database

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- PostgreSQL with PostGIS extension (or use Docker)
- Redis (or use Docker)

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/gitayam/access_point_repo.git
cd access_point_repo/wifi-access-manager
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

4. Start the development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Production Deployment with Docker

```bash
docker-compose up --build
```

Access the application at http://localhost:8080

## 🏗️ Architecture

- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Caching**: Redis
- **Real-time**: Socket.io for live updates
- **Maps**: Leaflet with OpenStreetMap
- **Authentication**: JWT-based authentication

## 📝 API Documentation

### Key Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/access-points/nearby` - Find nearby access points
- `POST /api/access-points` - Add new access point
- `POST /api/speed-test/run` - Run speed test
- `GET /api/wigle/search` - Search WiGLE database

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting on API endpoints
- Input validation with Zod
- SQL injection prevention
- XSS protection headers

## 🐛 Known Issues

- Speed test uses mock data on Apple Silicon (M1/M2) devices
- Frontend may show ECONNREFUSED errors during backend restart
- Duplicate key constraints may occur when re-adding same access point

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WiGLE.net](https://wigle.net) for WiFi network data
- [OpenStreetMap](https://www.openstreetmap.org) for mapping services
- [Leaflet](https://leafletjs.com) for interactive maps
- Community contributors and testers

---

**Built with ❤️ for the WiFi community**