import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { usePoolSchedule } from '../hooks/usePools';
import { usePoolStore } from '../store/poolStore';
import { HeatmapGrid } from '../components/HeatmapGrid';
import { NowView } from '../components/NowView';
import { theme } from '../theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREV = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Whole-hour slots from 6 AM to 9 PM
const TIME_SLOTS: number[] = [];
for (let h = 6; h <= 21; h++) TIME_SLOTS.push(h);

function formatHour(h: number): string {
  const totalMins = Math.round(h * 60);
  const hh = Math.floor(totalMins / 60);
  const mm = totalMins % 60;
  const period = hh < 12 ? 'AM' : 'PM';
  const hh12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${hh12}:${String(mm).padStart(2, '0')} ${period}`;
}

function getTodayIndex(): number {
  return (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6
}

function getCurrentHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

type ViewMode = 'now' | 'lanes';
type LaneViewMode = 'detailed' | 'compact';

export default function LaneAvailabilityScreen() {
  const { selectedLocation } = usePoolStore();
  const [viewMode, setViewMode] = useState<ViewMode>('now');
  const [laneViewMode, setLaneViewMode] = useState<LaneViewMode>('detailed');
  const [selectedDayIndex, setSelectedDayIndex] = useState(getTodayIndex);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = usePoolSchedule(selectedLocation);

  const selectedDay = DAYS[selectedDayIndex];

  // Build heatmap rows: one row per pool, columns = whole-hour TIME_SLOTS
  // Each slot carries lanes at :00 and lanesHalf at :30 (may differ)
  const heatmapRows = useMemo(() => {
    if (!data?.pools) return [];
    return data.pools
      .filter(p => p.slots.some(s => s.dayOfWeek === selectedDay))
      .map(pool => {
        const slotMap = new Map<number, number>();
        for (const s of pool.slots) {
          if (s.dayOfWeek === selectedDay) slotMap.set(s.startHour, s.lanes);
        }
        return {
          poolId: pool.poolId,
          poolName: pool.poolName,
          website: pool.website,
          slots: TIME_SLOTS.map(t => ({
            time: t,
            lanes: slotMap.get(t) ?? 0,
            lanesHalf: slotMap.get(t + 0.5) ?? 0,
          })),
        };
      });
  }, [data, selectedDay]);

  // Selected pool details for the detail card
  const selectedPoolEntry = useMemo(() => {
    if (!selectedPoolId || !data?.pools) return null;
    return data.pools.find(p => p.poolId === selectedPoolId) ?? null;
  }, [selectedPoolId, data]);

  const selectedPoolSlotsForDay = useMemo(() => {
    if (!selectedPoolEntry) return [];
    return selectedPoolEntry.slots
      .filter(s => s.dayOfWeek === selectedDay)
      .sort((a, b) => a.startHour - b.startHour);
  }, [selectedPoolEntry, selectedDay]);

  const handleSelectPool = (poolId: string) => {
    setSelectedPoolId(prev => (prev === poolId ? null : poolId));
  };

  // Week label
  const weekLabel = useMemo(() => {
    if (data?.weekStart) {
      const d = new Date(data.weekStart + 'T00:00:00');
      const end = new Date(d);
      end.setDate(d.getDate() + 6);
      const fmt = (dt: Date) =>
        dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(d)} \u2013 ${fmt(end)}`;
    }
    return '';
  }, [data?.weekStart]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading schedules…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load schedules.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Lane Availability</Text>
        {weekLabel ? <Text style={styles.weekLabel}>{weekLabel}</Text> : null}
      </View>

      {/* Stale data indicator */}
      {data._metadata?.stale && (
        <View style={styles.staleDataBanner}>
          <Text style={styles.staleDataText}>
            {data._metadata.isRefreshing
              ? '⟳ Refreshing schedule data...'
              : '⚠ Showing older schedule data'}
          </Text>
        </View>
      )}

      {/* View mode tabs */}
      <View style={styles.viewModeTabs}>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'now' && styles.viewModeTabSelected]}
          onPress={() => setViewMode('now')}
        >
          <Text style={[styles.viewModeTabText, viewMode === 'now' && styles.viewModeTabTextSelected]}>
            Now
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'lanes' && styles.viewModeTabSelected]}
          onPress={() => setViewMode('lanes')}
        >
          <Text style={[styles.viewModeTabText, viewMode === 'lanes' && styles.viewModeTabTextSelected]}>
            Lanes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day picker and view toggle - only show for lanes view */}
      {viewMode === 'lanes' && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayPickerScroll}
            contentContainerStyle={styles.dayPickerContent}
          >
            {DAYS.map((day, i) => {
              const isToday = i === getTodayIndex();
              const isSelected = i === selectedDayIndex;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    isSelected && styles.dayChipSelected,
                    isToday && !isSelected && styles.dayChipToday,
                  ]}
                  onPress={() => {
                    setSelectedDayIndex(i);
                    setSelectedTime(null);
                  }}
                >
                  <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>
                    {DAY_ABBREV[i]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Lane view toggle */}
          <View style={styles.laneViewToggle}>
            <TouchableOpacity
              style={[
                styles.laneViewToggleButton,
                laneViewMode === 'detailed' && styles.laneViewToggleButtonActive,
              ]}
              onPress={() => setLaneViewMode('detailed')}
            >
              <Text
                style={[
                  styles.laneViewToggleText,
                  laneViewMode === 'detailed' && styles.laneViewToggleTextActive,
                ]}
              >
                Detailed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.laneViewToggleButton,
                laneViewMode === 'compact' && styles.laneViewToggleButtonActive,
              ]}
              onPress={() => setLaneViewMode('compact')}
            >
              <Text
                style={[
                  styles.laneViewToggleText,
                  laneViewMode === 'compact' && styles.laneViewToggleTextActive,
                ]}
              >
                Overview
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Now view */}
      {viewMode === 'now' && (
        <NowView pools={heatmapRows} currentHour={getCurrentHour()} />
      )}

      {/* Heatmap - only show for lanes view */}
      {viewMode === 'lanes' && (
        <>
          {heatmapRows.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No lap lane data for {selectedDay}.</Text>
            </View>
          ) : (
            <HeatmapGrid
              pools={heatmapRows}
              timeSlots={TIME_SLOTS}
              selectedTime={selectedTime}
              onSelectTime={setSelectedTime}
              onSelectPool={handleSelectPool}
              selectedPoolId={selectedPoolId}
              currentHour={getTodayIndex() === selectedDayIndex ? getCurrentHour() : undefined}
              viewMode={laneViewMode}
            />
          )}

          {/* Detail card for selected pool + time - only in detailed mode */}
          {laneViewMode === 'detailed' && selectedPoolEntry && selectedTime !== null && (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selectedPoolEntry.poolName}</Text>
          <Text style={styles.detailTime}>
            {formatHour(selectedTime)} \u2013 {formatHour(selectedTime + 1)}
          </Text>
          {(() => {
            if (selectedTime === null) return null;
            const slotOh = selectedPoolSlotsForDay.find(s => s.startHour === selectedTime);
            const slotHalf = selectedPoolSlotsForDay.find(s => s.startHour === selectedTime + 0.5);
            if (!slotOh && !slotHalf) return <Text style={styles.detailClosed}>Closed</Text>;
            const lanesOh = slotOh?.lanes ?? 0;
            const lanesHalf = slotHalf?.lanes ?? 0;
            if (lanesOh === lanesHalf) {
              return lanesOh > 0
                ? <Text style={styles.detailLanes}>{lanesOh} lane{lanesOh !== 1 ? 's' : ''} open all hour</Text>
                : <Text style={styles.detailClosed}>Closed</Text>;
            }
            return (
              <View>
                <Text style={styles.detailLanes}>:00 – :30 · {lanesOh} lane{lanesOh !== 1 ? 's' : ''}</Text>
                <Text style={styles.detailLanes}>:30 – :00 · {lanesHalf} lane{lanesHalf !== 1 ? 's' : ''}</Text>
              </View>
            );
          })()}
        </View>
      )}

          {/* Legend */}
          <View style={styles.legend}>
        {[
          { label: '7-8 lanes', color: theme.colors.statusOpen.bg },
          { label: '5-6 lanes', color: theme.colors.statusModerate.bg },
          { label: '3-4 lanes', color: theme.colors.statusLimited.bg },
          { label: '1-2 lanes', color: theme.colors.statusScarce.bg },
          { label: 'Closed', color: theme.colors.statusClosed.bg },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 90,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  weekLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  staleDataBanner: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 6,
  },
  staleDataText: {
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  loadingSubtext: {
    marginTop: 6,
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  errorText: {
    color: theme.colors.statusFull.text,
    fontSize: 15,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  dayPickerScroll: {
    flexGrow: 0,
  },
  dayPickerContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayChipToday: {
    borderColor: theme.colors.primary,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  dayChipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  detailCard: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
  },
  detailTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailTime: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  detailLanes: {
    color: theme.colors.statusOpen.text,
    fontSize: 15,
    fontWeight: '600',
  },
  detailClosed: {
    color: theme.colors.statusClosed.text,
    fontSize: 15,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  viewModeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  viewModeTabSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  viewModeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  viewModeTabTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  laneViewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  laneViewToggleButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  laneViewToggleButtonActive: {
    backgroundColor: 'rgba(64,168,208,0.15)',
  },
  laneViewToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  laneViewToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
