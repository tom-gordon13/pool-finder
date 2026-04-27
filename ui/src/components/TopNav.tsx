import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { usePoolStore } from '../store/poolStore';
import { locations } from '../data/locations';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function TopNav() {
  const { selectedLocation, setSelectedLocation } = usePoolStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownHeight] = useState(new Animated.Value(0));

  const currentLocation = locations.find(l => l.id === selectedLocation);

  const toggleDropdown = () => {
    const toValue = isDropdownOpen ? 0 : locations.length * 56 + 16;

    Animated.spring(dropdownHeight, {
      toValue,
      useNativeDriver: false,
      tension: 65,
      friction: 10,
    }).start();

    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocation(locationId);
    toggleDropdown();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={toggleDropdown}
          activeOpacity={0.7}
        >
          <MaterialIcons name="location-on" size={20} color={theme.colors.primary} />
          <Text style={styles.locationText}>{currentLocation?.name || 'Select Location'}</Text>
          <MaterialIcons
            name={isDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.dropdown, { height: dropdownHeight }]}>
        <View style={styles.dropdownContent}>
          {locations.map((location) => (
            <TouchableOpacity
              key={location.id}
              style={[
                styles.dropdownItem,
                selectedLocation === location.id && styles.dropdownItemSelected,
              ]}
              onPress={() => handleSelectLocation(location.id)}
            >
              <MaterialIcons
                name="location-on"
                size={20}
                color={selectedLocation === location.id ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.dropdownItemText,
                  selectedLocation === location.id && styles.dropdownItemTextSelected,
                ]}
              >
                {location.name}
              </Text>
              {selectedLocation === location.id && (
                <MaterialIcons name="check" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  topBar: {
    backgroundColor: theme.colors.backgroundGradientEnd,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  dropdown: {
    backgroundColor: theme.colors.backgroundGradientEnd,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownContent: {
    padding: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(64,168,208,0.1)',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dropdownItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
