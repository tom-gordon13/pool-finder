import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAllPools } from '../hooks/usePools';
import { usePoolStore } from '../store/poolStore';
import { LapSwimHours, Pool } from '../types/pool';
import { theme } from '../theme';
import { GradientBackground } from '../components/GradientBackground';

// ---------------------------------------------------------------------------
// Helpers (Kept from original)
// ---------------------------------------------------------------------------

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function parseTime(timeStr: string): number {
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function isPoolOpenNow(pool: Pool): boolean {
  if (!pool.lapSwimHours || pool.lapSwimHours.length === 0) return false;
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return pool.lapSwimHours.some(h => {
    if (h.dayOfWeek !== todayName) return false;
    const open = parseTime(h.openTime);
    const close = parseTime(h.closeTime);
    return open !== -1 && close !== -1 && currentMinutes >= open && currentMinutes < close;
  });
}

function getTodaySessions(pool: Pool): LapSwimHours[] {
  if (!pool.lapSwimHours) return [];
  const todayName = DAY_NAMES[new Date().getDay()];
  return pool.lapSwimHours.filter(h => h.dayOfWeek === todayName);
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.skeletonLine, { width: '60%', height: 18, marginBottom: 10 }]} />
      <View style={[styles.skeletonLine, { width: '80%', height: 13, marginBottom: 8 }]} />
      <View style={[styles.skeletonLine, { width: '50%', height: 13 }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pool card
// ---------------------------------------------------------------------------

interface PoolCardProps {
  pool: Pool;
  onPress: (pool: Pool) => void;
}

function PoolCard({ pool, onPress }: PoolCardProps) {
  const openNow = isPoolOpenNow(pool);
  const todaySessions = getTodaySessions(pool);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(pool)}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.poolName} numberOfLines={1}>
          {pool.name}
        </Text>
        <View style={[styles.badge, openNow ? styles.badgeOpen : styles.badgeClosed]}>
          <Text style={[styles.badgeText, { color: openNow ? theme.colors.statusOpen.text : theme.colors.statusFull.text }]}>
            {openNow ? 'OPEN' : 'CLOSED'}
          </Text>
        </View>
      </View>

      <Text style={styles.poolAddress} numberOfLines={2}>
        {pool.address}
      </Text>

      {todaySessions.length > 0 ? (
        <View style={styles.todayHours}>
          <Text style={styles.todayLabel}>Today: </Text>
          <Text style={styles.todayTimes}>
            {todaySessions.map(s => `${s.openTime} – ${s.closeTime}`).join('  |  ')}
          </Text>
        </View>
      ) : (
        <Text style={styles.noHoursToday}>No lap swim scheduled today</Text>
      )}

    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function PoolListScreen() {
  const navigation = useNavigation();
  const { selectedLocation, setSelectedPool } = usePoolStore();
  const { data: pools, isLoading, isError, isFetching } = useAllPools(selectedLocation);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPools = useMemo(() => {
    if (!pools) return [];
    if (!searchQuery.trim()) return pools;
    const q = searchQuery.toLowerCase();
    return pools.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }, [pools, searchQuery]);

  const handlePoolPress = (pool: Pool) => {
    setSelectedPool(pool);
    navigation.navigate('PoolDetail' as never);
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={{ padding: 16, marginTop: 90 }}>
            <View style={[styles.skeletonLine, { width: '100%', height: 40, borderRadius: 10 }]} />
          </View>
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} />
          ))}
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Search bar */}
        <View style={[styles.searchBarContainer, { marginTop: 90 }]}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pools..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {isError && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Could not reach server. Showing cached data.
            </Text>
          </View>
        )}

        <FlatList
          data={filteredPools}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PoolCard pool={item} onPress={handlePoolPress} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No pools match your search' : 'No pools found'}
              </Text>
            </View>
          }
          ListHeaderComponent={
            filteredPools.length > 0 ? (
              <Text style={styles.resultCount}>
                {filteredPools.length} pool{filteredPools.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
          refreshing={isFetching && !isLoading}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  offlineBanner: {
    backgroundColor: 'rgba(200,150,50,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#deb887',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  resultCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  poolName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOpen: {
    backgroundColor: theme.colors.statusOpen.bg,
  },
  badgeClosed: {
    backgroundColor: theme.colors.statusFull.bg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  poolAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  todayHours: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  todayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  todayTimes: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    flexShrink: 1,
  },
  noHoursToday: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  distance: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Skeleton
  skeletonLine: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
  },

  // Empty state
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
});
