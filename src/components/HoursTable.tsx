import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LapSwimHours } from '../types/pool';

// Day ordering so the table is always Sun -> Sat
const DAY_ORDER = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DAY_ABBREV: Record<string, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

interface Props {
  hours: LapSwimHours[] | undefined;
}

/**
 * Returns the full day name (e.g. "Monday") for the current local date.
 */
function getTodayName(): string {
  return DAY_ORDER[new Date().getDay()];
}

/**
 * Groups an array of LapSwimHours by dayOfWeek, preserving multiple
 * sessions per day (e.g. morning + midday swims).
 */
function groupByDay(hours: LapSwimHours[]): Record<string, LapSwimHours[]> {
  const grouped: Record<string, LapSwimHours[]> = {};
  for (const h of hours) {
    if (!grouped[h.dayOfWeek]) {
      grouped[h.dayOfWeek] = [];
    }
    grouped[h.dayOfWeek].push(h);
  }
  return grouped;
}

export default function HoursTable({ hours }: Props) {
  if (!hours || hours.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Hours not available</Text>
      </View>
    );
  }

  const today = getTodayName();
  const grouped = groupByDay(hours);

  // Only show days that have at least one entry
  const activeDays = DAY_ORDER.filter(day => grouped[day]);

  return (
    <View style={styles.table}>
      {/* Header row */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerCell, styles.dayCell]}>Day</Text>
        <Text style={[styles.cell, styles.headerCell, styles.timeCell]}>Open</Text>
        <Text style={[styles.cell, styles.headerCell, styles.timeCell]}>Close</Text>
      </View>

      {activeDays.map((day, dayIndex) => {
        const sessions = grouped[day];
        const isToday = day === today;

        return sessions.map((session, sessionIndex) => {
          const isFirstSession = sessionIndex === 0;
          const isLastSession = sessionIndex === sessions.length - 1;
          const isLastDay = dayIndex === activeDays.length - 1;

          return (
            <View
              key={`${day}-${sessionIndex}`}
              style={[
                styles.row,
                isToday && styles.todayRow,
                isLastSession && !isLastDay && styles.dayBorderBottom,
              ]}
            >
              {/* Show the day abbreviation only on the first session row */}
              <View style={[styles.cell, styles.dayCell]}>
                {isFirstSession ? (
                  <View style={styles.dayLabelContainer}>
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.todayDayText,
                      ]}
                    >
                      {DAY_ABBREV[day] ?? day}
                    </Text>
                    {isToday && (
                      <View style={styles.todayDot} />
                    )}
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.cell,
                  styles.timeCell,
                  styles.timeText,
                  isToday && styles.todayTimeText,
                ]}
              >
                {session.openTime}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.timeCell,
                  styles.timeText,
                  isToday && styles.todayTimeText,
                ]}
              >
                {session.closeTime}
              </Text>
            </View>
          );
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  headerRow: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
  },
  todayRow: {
    backgroundColor: '#E8F1FB',
  },
  dayBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cell: {
    paddingHorizontal: 8,
  },
  headerCell: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayCell: {
    width: 56,
  },
  timeCell: {
    flex: 1,
  },
  dayLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  todayDayText: {
    color: '#0066CC',
    fontWeight: '700',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0066CC',
    marginLeft: 2,
  },
  timeText: {
    fontSize: 14,
    color: '#555555',
  },
  todayTimeText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
});
