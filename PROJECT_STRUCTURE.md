# Pool Finder - Project Structure

## Overview

This is a React Native mobile application built with Expo that helps users find public pools with lap swim hours in their area. The project is containerized with Docker for easy development and deployment.

## Directory Structure

```
pool-finder-app/
│
├── src/
│   ├── components/          # Reusable UI components (to be added)
│   │
│   ├── hooks/              # Custom React hooks
│   │   └── usePools.ts     # Hook for fetching pool data with React Query
│   │
│   ├── navigation/         # React Navigation setup
│   │   └── AppNavigator.tsx # Main navigation configuration
│   │
│   ├── screens/           # Screen components
│   │   ├── MapScreen.tsx       # Map view with pool markers
│   │   ├── PoolListScreen.tsx  # List of nearby pools
│   │   └── PoolDetailScreen.tsx # Individual pool details
│   │
│   ├── services/          # API and external service integrations
│   │   └── poolService.ts  # Pool data fetching functions
│   │
│   ├── store/             # Zustand state management
│   │   └── poolStore.ts    # Global app state
│   │
│   └── types/             # TypeScript type definitions
│       └── pool.ts         # Pool-related interfaces
│
├── assets/               # Images, fonts, etc.
│
├── App.tsx              # Root component with providers
├── index.ts             # Entry point
├── app.json             # Expo configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
│
├── Dockerfile          # Docker image definition
├── docker-compose.yml  # Docker Compose configuration
├── .dockerignore      # Files to exclude from Docker build
├── .gitignore         # Files to exclude from Git
│
├── .env.example       # Environment variable template
├── README.md          # Main documentation
└── PROJECT_STRUCTURE.md # This file
```

## Key Files Explained

### App.tsx
The root component that sets up:
- React Query client for API caching
- Navigation container
- Global providers

### src/store/poolStore.ts
Zustand store that manages:
- User location state
- Pool data (list and selected pool)
- Loading and error states
- Search filters (radius, show open now)

**Key Actions:**
- `setUserLocation()` - Update user's current position
- `setPools()` - Set the list of pools
- `setSelectedPool()` - Select a pool for detail view
- `setSearchRadius()` - Update search radius
- `clearPools()` - Clear all pool data

### src/services/poolService.ts
API service layer with functions:
- `fetchNearbyPools()` - Get pools near a location
- `fetchPoolById()` - Get specific pool details
- `searchPools()` - Search pools by name/address
- `getMockPools()` - Mock data for development

### src/hooks/usePools.ts
React Query hooks for data fetching:
- `useNearbyPools()` - Auto-fetch pools when location changes
- `useSearchPools()` - Manual search trigger

### src/screens/

**MapScreen.tsx**
- Displays interactive map with user location
- Shows pool markers
- Requests location permissions
- Handles loading and error states

**PoolListScreen.tsx**
- Lists pools in a scrollable list
- Shows distance from user
- Navigation to pool details

**PoolDetailScreen.tsx**
- Detailed pool information
- Lap swim schedule
- Contact actions (call, website, directions)

## State Management Flow

```
User Location Changed
    ↓
useNearbyPools Hook
    ↓
poolService.fetchNearbyPools()
    ↓
React Query Cache
    ↓
poolStore.setPools()
    ↓
Screens Re-render
```

## Docker Setup

### Dockerfile
- Uses Node 20 slim image
- Installs system dependencies
- Copies project files
- Exposes Expo ports (8081, 19000-19002)
- Runs Expo in tunnel mode for Docker networking

### docker-compose.yml
- Defines `app` service for React Native
- Mounts source code for hot reloading
- Uses named volume for node_modules
- Includes placeholders for future backend and database services

## Data Flow

1. **Location Acquisition**
   - MapScreen requests location permissions
   - Expo Location API gets current position
   - Stored in `poolStore.userLocation`

2. **Pool Fetching**
   - `useNearbyPools` hook triggers when location available
   - Calls `poolService.fetchNearbyPools()`
   - Currently returns mock data
   - Results stored in `poolStore.pools`

3. **Pool Selection**
   - User taps pool marker or list item
   - `poolStore.setSelectedPool()` called
   - Navigation to PoolDetailScreen
   - Screen reads from `poolStore.selectedPool`

## Future Backend Integration

The architecture is ready for backend integration:

1. **Update poolService.ts**
   - Set `useMockData = false`
   - Configure `EXPO_PUBLIC_API_URL` in `.env`
   - API functions already implemented

2. **Uncomment docker-compose services**
   - Backend API service
   - PostgreSQL with PostGIS

3. **Add authentication**
   - User accounts
   - Favorite pools
   - Submitted corrections

## Development Workflow

### Starting Development

```bash
# With Docker
docker-compose up

# Without Docker
npm install
npm start
```

### Making Changes

1. Edit files in `src/`
2. Changes hot-reload automatically
3. Check TypeScript errors: `npm run type-check`
4. Test on physical device via Expo Go

### Adding New Screens

1. Create component in `src/screens/`
2. Add type to `RootStackParamList` in `AppNavigator.tsx`
3. Add screen to Stack.Navigator
4. Add navigation calls in other screens

### Adding New State

1. Define types in `src/types/`
2. Add state and actions to appropriate Zustand store
3. Use hooks in components: `const { state } = usePoolStore()`

## Technology Decisions

### Why Zustand?
- Lightweight (1kb)
- Simple API compared to Redux
- No boilerplate
- Works perfectly with React hooks
- Easy to test

### Why React Query?
- Automatic caching and refetching
- Loading/error state management
- Background updates
- Optimistic updates support
- Perfect for API integration

### Why Expo?
- Fast development setup
- Over-the-air updates
- Easy native module access
- Great development tools
- Simplified deployment

### Why Docker?
- Consistent development environment
- Easy onboarding for new developers
- Matches production environment
- Simple multi-service orchestration
- No local Node version conflicts

## Next Steps

1. **Implement Backend API**
   - Google Places integration
   - Web scraping service
   - PostgreSQL database

2. **Enhanced UI**
   - Bottom sheets
   - Filter panels
   - Loading skeletons
   - Error boundaries

3. **Advanced Features**
   - User accounts
   - Favorite pools
   - Push notifications
   - Offline support

4. **Testing**
   - Unit tests for services
   - Component tests
   - E2E tests with Detox

5. **Deployment**
   - EAS Build for app stores
   - Backend deployment (AWS/GCP)
   - CI/CD pipeline
