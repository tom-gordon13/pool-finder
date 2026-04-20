import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePoolStore } from '../store/poolStore';
import { theme } from '../theme';

interface Location {
  id: string;
  name: string;
}

// TODO: Fetch from API endpoint GET /locations
const AVAILABLE_LOCATIONS: Location[] = [
  { id: 'boulder', name: 'Boulder, CO' },
];

export function LocationSelector() {
  const { selectedLocation, setSelectedLocation } = usePoolStore();

  const currentLocation = AVAILABLE_LOCATIONS.find(loc => loc.id === selectedLocation);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => {
          // For now, just showing the single location
          // TODO: Add picker/dropdown when multiple locations are available
        }}
      >
        <Text style={styles.locationText}>
          {currentLocation?.name || 'Select a location'}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  locationText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  chevron: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
