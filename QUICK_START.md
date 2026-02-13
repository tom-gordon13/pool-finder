# Quick Start Guide

## First Time Setup

1. **Clone and navigate to the project:**
```bash
cd pool-finder-app
```

2. **Start with Docker (Recommended):**
```bash
docker-compose up
```

**OR start locally:**
```bash
npm install
npm start
```

3. **Connect your device:**
   - Install **Expo Go** app on your phone
   - Scan the QR code shown in terminal
   - App will load on your device

## Common Commands

### Docker
```bash
# Start development server
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild after changing dependencies
docker-compose up --build

# View logs
docker-compose logs -f app
```

### NPM
```bash
# Start Expo dev server
npm start

# Type checking
npm run type-check

# Docker shortcuts
npm run docker:up
npm run docker:down
npm run docker:build
```

## Project Structure at a Glance

```
src/
├── screens/       # UI screens (Map, List, Detail)
├── store/         # Zustand state management
├── services/      # API calls
├── hooks/         # React Query hooks
├── navigation/    # React Navigation setup
└── types/         # TypeScript interfaces
```

## Making Your First Changes

### Add a new pool property:

1. **Update the type** (src/types/pool.ts):
```typescript
export interface Pool {
  // ... existing fields
  amenities?: string[];  // Add this
}
```

2. **Update the mock data** (src/services/poolService.ts):
```typescript
{
  id: '1',
  name: 'Community Pool',
  amenities: ['Hot Tub', 'Sauna'],  // Add this
  // ... rest of fields
}
```

3. **Display in UI** (src/screens/PoolDetailScreen.tsx):
```typescript
{selectedPool.amenities && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Amenities</Text>
    {selectedPool.amenities.map((amenity, i) => (
      <Text key={i}>{amenity}</Text>
    ))}
  </View>
)}
```

### Add a new screen:

1. **Create component** (src/screens/SettingsScreen.tsx):
```typescript
export default function SettingsScreen() {
  return <View><Text>Settings</Text></View>;
}
```

2. **Add to navigation** (src/navigation/AppNavigator.tsx):
```typescript
export type RootStackParamList = {
  // ... existing screens
  Settings: undefined;
};

// In Stack.Navigator:
<Stack.Screen name="Settings" component={SettingsScreen} />
```

3. **Navigate from another screen**:
```typescript
import { useNavigation } from '@react-navigation/native';

function MyComponent() {
  const navigation = useNavigation();

  return (
    <Button onPress={() => navigation.navigate('Settings' as never)}>
      Go to Settings
    </Button>
  );
}
```

### Add state to Zustand store:

**In src/store/poolStore.ts:**
```typescript
interface PoolState {
  // ... existing state
  favoritePoolIds: string[];
  addFavorite: (poolId: string) => void;
  removeFavorite: (poolId: string) => void;
}

export const usePoolStore = create<PoolState>((set) => ({
  // ... existing state
  favoritePoolIds: [],

  addFavorite: (poolId) => set((state) => ({
    favoritePoolIds: [...state.favoritePoolIds, poolId],
  })),

  removeFavorite: (poolId) => set((state) => ({
    favoritePoolIds: state.favoritePoolIds.filter(id => id !== poolId),
  })),
}));
```

**Use in a component:**
```typescript
const { favoritePoolIds, addFavorite } = usePoolStore();

const isFavorite = favoritePoolIds.includes(pool.id);
```

## Troubleshooting

### "Cannot connect to Metro bundler"
```bash
# Kill any process using port 8081
lsof -ti:8081 | xargs kill -9

# Restart
npm start
```

### "Module not found" errors
```bash
# With Docker - rebuild
docker-compose down
docker-compose up --build

# Without Docker
rm -rf node_modules package-lock.json
npm install
```

### Map not showing
- Google Maps requires API key for production
- Works without key in development (OpenStreetMap fallback)
- Add key to `.env`: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key`

### Location permissions denied
- Check phone settings
- Uninstall and reinstall app
- Clear Expo Go cache

## Environment Variables

Create a `.env` file (use `.env.example` as template):

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

Access in code:
```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, sets up providers |
| `src/store/poolStore.ts` | Global state management |
| `src/navigation/AppNavigator.tsx` | Screen routing |
| `src/services/poolService.ts` | API calls and mock data |
| `docker-compose.yml` | Development environment |

## Next Steps

1. **Customize the UI** - Update colors, fonts, layouts in screen files
2. **Add real data** - Connect to backend API by updating `poolService.ts`
3. **Implement search** - Add search bar and filtering
4. **Add features** - Favorites, notifications, user accounts

## Getting Help

- Check `README.md` for detailed documentation
- See `PROJECT_STRUCTURE.md` for architecture overview
- Review code comments in each file
- Google error messages with "Expo" or "React Native"

## Useful Resources

- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Zustand](https://docs.pmnd.rs/zustand/)
- [React Query](https://tanstack.com/query/)
- [React Native Docs](https://reactnative.dev/)
