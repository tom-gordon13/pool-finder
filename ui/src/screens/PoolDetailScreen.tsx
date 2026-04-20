import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePoolStore } from '../store/poolStore';
import HoursTable from '../components/HoursTable';

// ---------------------------------------------------------------------------
// Action button component
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  label: string;
  color: string;
  onPress: () => void;
}

function ActionButton({ label, color, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function PoolDetailScreen() {
  const navigation = useNavigation();
  const { selectedPool } = usePoolStore();

  if (!selectedPool) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No pool selected</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', `Cannot open: ${url}`);
    }
  };

  const handleCall = () => {
    if (selectedPool.phoneNumber) {
      openUrl(`tel:${selectedPool.phoneNumber.replace(/\D/g, '')}`);
    }
  };

  const handleWebsite = () => {
    if (selectedPool.website) {
      openUrl(selectedPool.website);
    }
  };

  const handleDirections = () => {
    const { latitude, longitude } = selectedPool.location;
    const encodedAddress = encodeURIComponent(selectedPool.address);
    // On iOS, prefer Apple Maps; the geo: URI falls back gracefully
    const url = `https://maps.google.com/?q=${latitude},${longitude}&query=${encodedAddress}`;
    openUrl(url);
  };

  const formattedLastUpdated = selectedPool.lastUpdated
    ? new Date(selectedPool.lastUpdated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Pool header ---- */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Text style={styles.heroIcon}>&#x1F3CA;</Text>
          </View>
          <Text style={styles.poolName}>{selectedPool.name}</Text>
          <Text style={styles.poolAddress}>{selectedPool.address}</Text>
        </View>

        {/* ---- Contact info ---- */}
        {(selectedPool.phoneNumber || selectedPool.website) && (
          <View style={styles.section}>
            <SectionHeader title="Contact" />
            {selectedPool.phoneNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>&#x260E;</Text>
                <Text style={styles.infoText}>{selectedPool.phoneNumber}</Text>
              </View>
            )}
            {selectedPool.website && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>&#x1F310;</Text>
                <Text style={[styles.infoText, styles.linkText]} numberOfLines={1}>
                  {selectedPool.website.replace(/^https?:\/\//, '')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ---- Lap swim hours ---- */}
        <View style={styles.section}>
          <SectionHeader title="Lap Swim Hours" />
          <HoursTable hours={selectedPool.lapSwimHours} />
        </View>

        {/* ---- Action buttons ---- */}
        <View style={styles.actionsSection}>
          {selectedPool.phoneNumber && (
            <ActionButton
              label="Call"
              color="#0066CC"
              onPress={handleCall}
            />
          )}
          {selectedPool.website && (
            <ActionButton
              label="Website"
              color="#34A853"
              onPress={handleWebsite}
            />
          )}
          <ActionButton
            label="Get Directions"
            color="#EA4335"
            onPress={handleDirections}
          />
        </View>

        {/* ---- Last updated ---- */}
        {formattedLastUpdated && (
          <Text style={styles.lastUpdated}>
            Hours last updated: {formattedLastUpdated}
          </Text>
        )}

        {/* Bottom padding for safe area */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Hero / header section
  heroSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F1FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroIcon: {
    fontSize: 30,
  },
  poolName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  poolAddress: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  poolDistance: {
    marginTop: 6,
    fontSize: 13,
    color: '#0066CC',
    fontWeight: '500',
  },

  // Sections
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0066CC',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Info rows (contact)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  linkText: {
    color: '#0066CC',
  },

  // Action buttons
  actionsSection: {
    marginTop: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Last updated
  lastUpdated: {
    marginTop: 20,
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
