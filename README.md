# Pool Finder App

A React Native app that helps users find public pools with lap swim hours in their area.

## Features

- Interactive map view showing nearby pools
- List view with distance from current location
- Detailed pool information including lap swim schedules
- Call, get directions, and visit pool websites directly from the app

## Tech Stack

### Frontend
- **React Native** with **Expo** (SDK 54)
- **TypeScript** for type safety
- **Zustand** for state management
- **React Navigation** for navigation
- **React Query** for API data caching
- **React Native Maps** for map functionality
- **Expo Location** for geolocation

### Development
- **Docker** and **Docker Compose** for containerization
- **Node.js 20** runtime

## Project Structure

```
pool-finder-app/
├── ui/
│   ├── src/
│   │   ├── navigation/        # Navigation configuration
│   │   │   └── AppNavigator.tsx
│   │   ├── screens/          # Screen components
│   │   │   ├── MapScreen.tsx
│   │   │   ├── PoolListScreen.tsx
│   │   │   └── PoolDetailScreen.tsx
│   │   ├── store/            # Zustand stores
│   │   │   └── poolStore.ts
│   │   ├── types/            # TypeScript types
│   │   │   └── pool.ts
│   │   ├── components/       # Reusable components
│   │   └── services/         # API services
│   ├── App.tsx               # Main app component
│   ├── Dockerfile
│   └── package.json
├── api/                      # Express API
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml        # Docker Compose configuration
└── .env.example
```

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Expo Go app on your phone (iOS or Android)

### Running with Docker Compose

1. **Start the development server:**

```bash
docker-compose up
```

This will:
- Build the Docker images for `api` and `ui`
- Install dependencies
- Start the Expo dev server in tunnel mode

2. **Connect with Expo Go:**

Once the server is running, you'll see a QR code in the terminal.

- **iOS**: Scan the QR code with your Camera app
- **Android**: Scan the QR code with the Expo Go app

The app will load on your device!

### Running Locally (without Docker)

If you prefer to run without Docker:

**API:**

```bash
cd api
npm install
npm start
```

**UI:**

```bash
cd ui
npm install
npm start
```

3. **Run on a platform:**

- Press `i` for iOS simulator (macOS only)
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Development Commands

### Docker Commands

```bash
# Start services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down

# Rebuild after dependency changes
docker-compose up --build

# View logs
docker-compose logs -f ui
docker-compose logs -f api
```

### NPM Commands (from ui/)

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web

# Type check
npx tsc --noEmit
```

## State Management with Zustand

The app uses Zustand for simple, lightweight state management. The main store is `poolStore` which manages:

- User location
- List of pools
- Selected pool for detail view
- Loading and error states
- Search filters

Example usage:

```typescript
import { usePoolStore } from './src/store/poolStore';

function MyComponent() {
  const { pools, userLocation, setUserLocation } = usePoolStore();

  // Use state...
}
```

## Environment Setup

Copy `.env.example` to `.env` and fill in the values:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Next Steps

### API Integration
- Add PostgreSQL with PostGIS for location queries
- Implement Google Places API integration
- Build web scraping service for pool schedules

### App Features
- Search and filter functionality
- Favorite pools
- Notifications for lap swim hours
- User-submitted pool data
- Community reviews and updates

### UI Improvements
- Bottom sheet for pool details on map
- Filter panel for search options
- Loading skeletons
- Error boundary components

## Troubleshooting

### Docker Issues

**Port already in use:**
```bash
# Find and kill process using port 8081
lsof -ti:8081 | xargs kill -9

# Or change ports in docker-compose.yml
```

**Container won't start:**
```bash
# Remove containers and volumes
docker-compose down -v

# Rebuild from scratch
docker-compose up --build
```

### Expo Issues

**Can't connect to dev server:**
- Make sure your phone and computer are on the same network
- Try using tunnel mode: `npx expo start --tunnel`
- Check firewall settings

**Dependencies not updating:**
```bash
# In Docker
docker-compose down
docker-compose up --build

# Locally (from ui/)
rm -rf node_modules package-lock.json
npm install
```

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT
