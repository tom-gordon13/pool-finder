import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]; // Every hour from 6am to 9pm

interface PoolSlot {
  poolId: string;
  poolName: string;
  slots: { time: number; lanes: number; lanesHalf: number }[];
}

interface PoolWeekViewProps {
  pool: PoolSlot;
  weekData: Map<string, PoolSlot>; // dayOfWeek -> pool data for that day
  onBack: () => void;
}

function getStatusColor(lanes: number) {
  if (lanes <= 0) return { bg: 'rgba(255,255,255,0.06)', text: '#6b727c' }; // closed
  if (lanes <= 2) return { bg: '#D85A30', text: '#fff' }; // scarce/full
  if (lanes <= 4) return { bg: '#EF9F27', text: '#fff' }; // limited/busy
  if (lanes <= 6) return { bg: '#1D9E75', text: '#fff' }; // moderate/open
  return { bg: '#5DCAA5', text: '#fff' }; // open/very open
}

function formatTimeLabel(hour: number): string {
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

function getTodayDayName(): string {
  const dayIndex = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6
  return DAYS_FULL[dayIndex];
}

function getCurrentHour(): number {
  return new Date().getHours();
}

function getCurrentMinutes(): number {
  return new Date().getMinutes();
}

export function PoolWeekView({ pool, weekData, onBack }: PoolWeekViewProps) {
  const currentDay = getTodayDayName();
  const currentHour = getCurrentHour();
  const currentMinutes = getCurrentMinutes();
  const currentTimePosition = (currentMinutes / 60) * 100; // Percentage through the hour

  // Build grid data: for each day and time slot, get the lane count
  const gridData = useMemo(() => {
    const grid: { [day: string]: { [time: number]: number } } = {};

    DAYS_FULL.forEach(day => {
      grid[day] = {};
      const dayData = weekData.get(day);

      if (dayData) {
        TIME_SLOTS.forEach(time => {
          const slot = dayData.slots.find(s => s.time === time);
          grid[day][time] = slot ? slot.lanes : 0;
        });
      } else {
        TIME_SLOTS.forEach(time => {
          grid[day][time] = 0;
        });
      }
    });

    return grid;
  }, [weekData]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Best times</Text>

        {/* Calendar Grid */}
        <View style={styles.grid}>
          {/* Header row with day labels */}
          <View style={styles.gridRow}>
            <View style={styles.timeLabel} />
            {DAYS_SHORT.map((day, idx) => {
              const isToday = DAYS_FULL[idx] === currentDay;
              return (
                <View key={day} style={styles.dayLabel}>
                  <Text style={[styles.dayLabelText, isToday && styles.dayLabelTextToday]}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Time rows */}
          {TIME_SLOTS.map(time => {
            const isCurrentHourRow = time === currentHour;
            return (
              <View key={time} style={styles.gridRow}>
                <View style={styles.timeLabel}>
                  <Text style={[
                    styles.timeLabelText,
                    isCurrentHourRow && styles.timeLabelTextCurrent
                  ]}>
                    {formatTimeLabel(time)}
                  </Text>
                </View>
                {DAYS_FULL.map(day => {
                const lanes = gridData[day][time];
                const color = getStatusColor(lanes);
                const isCurrentDay = day === currentDay;
                const isCurrentHour = time === currentHour;
                const isCurrentCell = isCurrentDay && isCurrentHour;
                const isDimmed = !isCurrentDay;

                return (
                  <TouchableOpacity
                    key={`${day}-${time}`}
                    style={[
                      styles.cell,
                      { backgroundColor: color.bg },
                      isDimmed && styles.cellDimmed,
                      isCurrentCell && styles.cellCurrentCell
                    ]}
                    activeOpacity={0.7}
                  >
                    {/* Current hour indicator line - only in current day column */}
                    {isCurrentCell && (
                      <View style={[
                        styles.currentHourLine,
                        { top: `${currentTimePosition}%` }
                      ]} />
                    )}

                    {lanes > 0 && (
                      <Text style={[styles.cellText, { color: color.text }]}>
                        {lanes}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  grid: {
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 3,
  },
  currentHourLine: {
    position: 'absolute',
    left: -8,
    right: -8,
    marginTop: -1.5,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 1.5,
    zIndex: 10,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  timeLabel: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  timeLabelText: {
    fontSize: 10,
    color: '#6b727c',
  },
  timeLabelTextCurrent: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  dayLabel: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dayLabelTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellDimmed: {
    opacity: 0.65,
  },
  cellCurrentCell: {
    borderWidth: 2,
    borderColor: '#5DCAA5',
    shadowColor: '#5DCAA5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  cellText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
