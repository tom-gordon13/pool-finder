import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';

interface PoolDetailCardProps {
    pool: any; // Using any for now
    selectedTime: string;
}

const getCellColor = (open: number | undefined | null, total: number) => {
    if (open === undefined || open === null) return theme.colors.statusClosed;
    if (open === 0) return theme.colors.statusFull;
    if (open <= 2) return theme.colors.statusScarce;   // 1-2: orange-red
    if (open <= 4) return theme.colors.statusLimited;  // 3-4: yellow
    if (open <= 6) return theme.colors.statusModerate; // 5-6: light green
    return theme.colors.statusOpen;                    // 7-8: dark green
};

export function PoolDetailCard({ pool, selectedTime }: PoolDetailCardProps) {
    if (!pool) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Tap a pool for details</Text>
            </View>
        );
    }

    const openNow = pool.lanes[selectedTime];
    const color = getCellColor(openNow, pool.totalLanes);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{pool.name}</Text>
                        {pool.website && (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(pool.website)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={styles.linkIcon}
                            >
                                <MaterialIcons name="open-in-new" size={16} color="#6b8ca8" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.subtitle}>
                        {pool.distance} · {pool.length} · {pool.totalLanes} lanes
                    </Text>
                </View>
                <View style={styles.statContainer}>
                    <Text style={[styles.statValue, { color: color.text }]}>
                        {openNow ?? '–'}
                    </Text>
                    <Text style={styles.statLabel}>of {pool.totalLanes} at {selectedTime}</Text>
                </View>
            </View>

            {/* Lane Visualizer */}
            <View style={styles.laneVisualizer}>
                {[...Array(pool.totalLanes)].map((_, i) => {
                    const isOpen = i < (openNow ?? 0);
                    return (
                        <View key={i} style={[
                            styles.laneBlock,
                            {
                                backgroundColor: isOpen ? color.text + '18' : 'rgba(255,255,255,0.02)',
                                borderColor: isOpen ? color.text + '25' : 'rgba(255,255,255,0.03)'
                            }
                        ]} />
                    );
                })}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionButton, styles.primaryAction]}>
                    <Text style={styles.primaryActionText}>📍 Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>🔔 Notify</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>★ Save</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 18,
        borderRadius: 20,
        backgroundColor: theme.colors.cardBackground,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        marginTop: 16,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 19,
        fontWeight: '800',
        color: theme.colors.textPrimary,
    },
    linkIcon: {
        padding: 2,
    },
    subtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    statContainer: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 48,
        fontWeight: '900',
        lineHeight: 48,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textTertiary,
        marginTop: 3,
    },
    laneVisualizer: {
        flexDirection: 'row',
        gap: 5,
        marginBottom: 16,
    },
    laneBlock: {
        flex: 1,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        padding: 11,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        alignItems: 'center',
    },
    primaryAction: {
        borderColor: theme.colors.primaryBorder,
        backgroundColor: theme.colors.primaryGlow,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4a7090',
    },
    primaryActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.primary,
    }
});
