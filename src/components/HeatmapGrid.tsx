import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { theme } from '../theme';

const CELL_W = 44;
const CELL_GAP = 4;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface HeatmapGridProps {
    timeSlots: string[];
    currentHour: string;
    selectedTime: string;
    onSelectTime: (time: string) => void;
    pools: any[]; // Using any for now to facilitate porting, strictly typing later
    selectedPoolId: string | null;
    onSelectPool: (poolId: string | null) => void;
}

const shortTime = (t: string) => t.replace(" AM", "a").replace(" PM", "p");

const getCellColor = (open: number | undefined | null, total: number) => {
    if (open === undefined || open === null) return theme.colors.statusClosed;
    const pct = total > 0 ? open / total : 0;
    if (open === 0) return theme.colors.statusFull;
    if (pct < 0.3) return theme.colors.statusScarce;
    if (pct < 0.6) return theme.colors.statusLimited;
    return theme.colors.statusOpen;
};

const getStatusLabel = (open: number | undefined | null, total: number) => {
    if (open === undefined || open === null) return "Closed";
    const pct = total > 0 ? open / total : 0;
    if (open === 0) return "Full";
    if (pct < 0.3) return "Scarce";
    if (pct < 0.6) return "Limited";
    return "Open";
};

export function HeatmapGrid({
    timeSlots,
    currentHour,
    selectedTime,
    onSelectTime,
    pools,
    selectedPoolId,
    onSelectPool,
}: HeatmapGridProps) {
    const scrollRef = useRef<ScrollView>(null);

    // Scroll to current hour on mount
    useEffect(() => {
        if (scrollRef.current) {
            const idx = timeSlots.indexOf(currentHour);
            if (idx !== -1) {
                scrollRef.current.scrollTo({
                    x: Math.max(0, idx * (CELL_W + CELL_GAP) - 80),
                    animated: false,
                });
            }
        }
    }, []);

    return (
        <View style={styles.outerContainer}>
            <View style={styles.gridContainer}>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.grid}>
                        {/* Header Row */}
                        <View style={styles.headerRow}>
                            {timeSlots.map((slot) => {
                                const isSel = slot === selectedTime;
                                const isCur = slot === currentHour;
                                return (
                                    <TouchableOpacity
                                        key={`h-${slot}`}
                                        onPress={() => onSelectTime(slot)}
                                        style={styles.timeHeaderCell}
                                    >
                                        {/* Selection Highlight */}
                                        {isSel && <View style={styles.timeHeaderHighlight} />}

                                        <Text style={[
                                            styles.timeHeaderText,
                                            isSel && styles.timeHeaderTextSelected,
                                            isCur && styles.timeHeaderTextCurrent
                                        ]}>
                                            {shortTime(slot)}
                                        </Text>

                                        {/* Indicator Dots */}
                                        {isCur && !isSel && <View style={styles.currentDot} />}
                                        {isSel && <View style={styles.selectedBar} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Pool Rows */}
                        {pools.map((p, index) => {
                            const openNow = p.lanes[selectedTime] ?? 0;
                            const nowColor = getCellColor(openNow, p.totalLanes);
                            const isActive = selectedPoolId === p.id;
                            const rowBg = index % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.005)';

                            return (
                                <View key={p.id}>
                                    {/* Pool Label */}
                                    <TouchableOpacity
                                        style={[styles.poolLabel, { backgroundColor: isActive ? theme.colors.primaryGlow : rowBg }]}
                                        onPress={() => onSelectPool(isActive ? null : p.id)}
                                    >
                                        <View style={styles.poolInfo}>
                                            <Text style={[styles.poolName, isActive && styles.poolNameActive]} numberOfLines={1}>{p.name}</Text>
                                            <Text style={styles.poolDetails}>{p.distance} · {p.length} · {p.totalLanes} lanes</Text>
                                        </View>

                                        <View style={[styles.statusBadge, { backgroundColor: nowColor.bg }]}>
                                            <Text style={[styles.statusText, { color: nowColor.text }]}>
                                                {getStatusLabel(openNow, p.totalLanes)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    <View style={[styles.poolRow, { backgroundColor: isActive ? theme.colors.primaryGlow : rowBg }]}>
                                        {/* Cells */}
                                        {timeSlots.map((slot) => {
                                            const open = p.lanes[slot];
                                            const c = getCellColor(open, p.totalLanes);
                                            const isSel = slot === selectedTime;

                                            return (
                                                <TouchableOpacity
                                                    key={`c-${p.id}-${slot}`}
                                                    onPress={() => onSelectTime(slot)}
                                                    style={styles.cellContainer}
                                                >
                                                    <View style={[
                                                        styles.cell,
                                                        { backgroundColor: c.bg, borderColor: isSel ? c.text : 'transparent', borderWidth: isSel ? 1 : 0 }
                                                    ]}>
                                                        {isSel && (
                                                            <View style={[styles.cellGlow, { shadowColor: c.glow }]} />
                                                        )}
                                                        <Text style={[
                                                            styles.cellText,
                                                            { color: isSel ? c.text : (open !== undefined ? c.text + 'aa' : c.text) },
                                                            isSel && { fontWeight: '900', fontSize: 16 }
                                                        ]}>
                                                            {open ?? '·'}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        paddingHorizontal: 0,
    },
    gridContainer: {
        backgroundColor: 'rgba(255,255,255,0.01)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
        marginHorizontal: 12,
    },
    scrollContent: {
        paddingHorizontal: 0,
    },
    grid: {
        flexDirection: 'column',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingBottom: 8,
        paddingLeft: 12, // Initial padding
    },
    timeHeaderCell: {
        width: CELL_W + CELL_GAP,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingTop: 12,
        paddingBottom: 4,
    },
    timeHeaderHighlight: {
        position: 'absolute',
        top: 2, left: 0, right: 0, bottom: 0,
        backgroundColor: theme.colors.primaryGlow,
        borderWidth: 1,
        borderColor: 'rgba(64,168,208,0.3)',
        borderBottomWidth: 0,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    timeHeaderText: {
        fontSize: 10,
        color: theme.colors.textTertiary,
        fontWeight: '400',
        marginBottom: 4,
    },
    timeHeaderTextSelected: {
        color: '#7ad0f0',
        fontWeight: '800',
    },
    timeHeaderTextCurrent: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    currentDot: {
        width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.primary,
    },
    selectedBar: {
        width: 14, height: 2, borderRadius: 1, backgroundColor: theme.colors.primary,
    },

    // Rows
    poolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        paddingBottom: 8,
    },
    poolLabel: {
        width: '100%',
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.03)',
    },
    poolInfo: {
        flex: 1,
        marginRight: 8,
    },
    poolName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8aacca',
    },
    poolNameActive: {
        color: '#b0d8f0',
    },
    poolDetails: {
        fontSize: 10,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    },

    // Cells
    cellContainer: {
        width: CELL_W + CELL_GAP,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cell: {
        width: CELL_W,
        height: 38,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellGlow: {
        position: 'absolute',
        width: '100%', height: '100%',
        borderRadius: 9,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    cellText: {
        fontSize: 13,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    }
});
