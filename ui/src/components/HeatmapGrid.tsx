import React, { useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { theme } from '../theme';

const CELL_W = 44;
const CELL_GAP = 4;
const TIME_HEADER_H = 40;
const CELL_ROW_H = 48;
const NAME_ROW_H = 28;

interface PoolRow {
    poolId: string;
    poolName: string;
    slots: { time: number; lanes: number; lanesHalf: number }[];
}

interface HeatmapGridProps {
    pools: PoolRow[];
    timeSlots: number[];
    selectedTime: number | null;
    onSelectTime: (time: number) => void;
    onSelectPool: (poolId: string) => void;
    selectedPoolId: string | null;
    currentHour?: number;
}

function formatHour(h: number): string {
    const totalMins = Math.round(h * 60);
    const hh = Math.floor(totalMins / 60);
    const mm = totalMins % 60;
    const period = hh < 12 ? 'AM' : 'PM';
    const hh12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    return mm === 0 ? `${hh12}` : `${hh12}:${String(mm).padStart(2, '0')}`;
}

const getCellColor = (lanes: number) => {
    if (lanes <= 0) return theme.colors.statusClosed;
    if (lanes <= 2) return theme.colors.statusScarce;
    if (lanes <= 5) return theme.colors.statusLimited;
    return theme.colors.statusOpen;
};

const getStatusLabel = (lanes: number): string => {
    if (lanes <= 0) return 'Closed';
    if (lanes <= 2) return 'Scarce';
    if (lanes <= 5) return 'Limited';
    return 'Open';
};

export function HeatmapGrid({
    pools,
    timeSlots,
    selectedTime,
    onSelectTime,
    onSelectPool,
    selectedPoolId,
    currentHour,
}: HeatmapGridProps) {
    // One ref per scroll view: header + one per pool
    const headerScrollRef = useRef<ScrollView>(null);
    const poolScrollRefs = useRef<(ScrollView | null)[]>([]);
    // Track current scroll X to avoid feedback loops
    const scrollX = useRef(0);
    const isSyncing = useRef(false);

    // Scroll all views to x
    const syncAllTo = useCallback((x: number) => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        scrollX.current = x;
        headerScrollRef.current?.scrollTo({ x, animated: false });
        poolScrollRefs.current.forEach(ref => ref?.scrollTo({ x, animated: false }));
        isSyncing.current = false;
    }, []);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        syncAllTo(e.nativeEvent.contentOffset.x);
    }, [syncAllTo]);

    // Scroll to current hour on mount
    useEffect(() => {
        if (currentHour !== undefined) {
            const idx = timeSlots.findIndex(t => t >= currentHour);
            if (idx !== -1) {
                const x = Math.max(0, idx * (CELL_W + CELL_GAP) - 80);
                setTimeout(() => syncAllTo(x), 50);
            }
        }
    }, []);

    return (
        <View style={styles.outerContainer}>
            <View style={styles.gridContainer}>

                {/* ── Time header row (synced, not user-scrollable) ── */}
                <ScrollView
                    ref={headerScrollRef}
                    horizontal
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    style={styles.headerScroll}
                >
                    <View style={styles.headerRow}>
                        {timeSlots.map((slot) => {
                            const isSel = slot === selectedTime;
                            const isCur = currentHour !== undefined && slot === currentHour;
                            return (
                                <TouchableOpacity
                                    key={`h-${slot}`}
                                    onPress={() => onSelectTime(slot)}
                                    style={styles.timeHeaderCell}
                                >
                                    {isSel && <View style={styles.timeHeaderHighlight} />}
                                    <Text style={[
                                        styles.timeHeaderText,
                                        isSel && styles.timeHeaderTextSelected,
                                        isCur && styles.timeHeaderTextCurrent,
                                    ]}>
                                        {formatHour(slot)}
                                    </Text>
                                    {isCur && !isSel && <View style={styles.currentDot} />}
                                    {isSel && <View style={styles.selectedBar} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* ── Per-pool sections: full-width name row + synced cell scroll ── */}
                {pools.map((p, index) => {
                    const isActive = selectedPoolId === p.poolId;
                    const bg = index % 2 === 0
                        ? 'rgba(255,255,255,0.015)'
                        : 'rgba(0,0,0,0.005)';

                    const selectedSlot = selectedTime !== null
                        ? p.slots.find(s => s.time === selectedTime)
                        : undefined;
                    const openNow = selectedSlot?.lanes ?? 0;
                    const nowColor = getCellColor(openNow);

                    return (
                        <View
                            key={`section-${p.poolId}`}
                            style={[styles.poolSection, { backgroundColor: isActive ? theme.colors.primaryGlow : bg }]}
                        >
                            {/* Full-width pool name — does not scroll */}
                            <TouchableOpacity
                                style={styles.nameRow}
                                onPress={() => onSelectPool(p.poolId)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[styles.poolName, isActive && styles.poolNameActive]}
                                    numberOfLines={1}
                                >
                                    {p.poolName}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: nowColor.bg }]}>
                                    <Text style={[styles.statusText, { color: nowColor.text }]}>
                                        {getStatusLabel(openNow)}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* Cell scroll — synced with header and all other pools */}
                            <ScrollView
                                ref={el => { poolScrollRefs.current[index] = el; }}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                scrollEventThrottle={16}
                                onScroll={handleScroll}
                                style={styles.cellRowScroll}
                            >
                                <View style={styles.poolRow}>
                                    {p.slots.map((slotData) => {
                                        const isSel = slotData.time === selectedTime;
                                        const split = slotData.lanesHalf !== slotData.lanes;
                                        const cA = getCellColor(slotData.lanes);
                                        const cB = getCellColor(slotData.lanesHalf);

                                        return (
                                            <TouchableOpacity
                                                key={`c-${p.poolId}-${slotData.time}`}
                                                onPress={() => onSelectTime(slotData.time)}
                                                style={styles.cellContainer}
                                            >
                                                {split ? (
                                                    <View style={[styles.cell, styles.cellSplit, isSel && { borderColor: cA.text, borderWidth: 1 }]}>
                                                        <View style={[styles.cellHalf, styles.cellHalfLeft, { backgroundColor: cA.bg }]}>
                                                            <Text style={[styles.cellHalfText, { color: isSel ? cA.text : cA.text + 'bb' }]}>
                                                                {slotData.lanes > 0 ? slotData.lanes : '·'}
                                                            </Text>
                                                        </View>
                                                        <View style={[styles.cellHalf, styles.cellHalfRight, { backgroundColor: cB.bg }]}>
                                                            <Text style={[styles.cellHalfText, { color: isSel ? cB.text : cB.text + 'bb' }]}>
                                                                {slotData.lanesHalf > 0 ? slotData.lanesHalf : '·'}
                                                            </Text>
                                                        </View>
                                                        {isSel && <View style={[styles.cellGlow, { shadowColor: cA.glow }]} />}
                                                    </View>
                                                ) : (
                                                    <View style={[
                                                        styles.cell,
                                                        {
                                                            backgroundColor: cA.bg,
                                                            borderColor: isSel ? cA.text : 'transparent',
                                                            borderWidth: isSel ? 1 : 0,
                                                        },
                                                    ]}>
                                                        {isSel && <View style={[styles.cellGlow, { shadowColor: cA.glow }]} />}
                                                        <Text style={[
                                                            styles.cellText,
                                                            { color: isSel ? cA.text : cA.text + 'aa' },
                                                            isSel && { fontWeight: '900', fontSize: 16 },
                                                        ]}>
                                                            {slotData.lanes > 0 ? slotData.lanes : '·'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    );
                })}

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

    // Time header
    headerScroll: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: TIME_HEADER_H,
        paddingBottom: 4,
    },
    timeHeaderCell: {
        width: CELL_W + CELL_GAP,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingTop: 10,
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

    // Pool section
    poolSection: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
    },
    nameRow: {
        height: NAME_ROW_H,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 8,
        paddingTop: 6,
    },
    poolName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#8aacca',
    },
    poolNameActive: {
        color: '#b0d8f0',
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        flexShrink: 0,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    cellRowScroll: {
        // sized by poolRow content
    },
    poolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: CELL_ROW_H,
        paddingBottom: 6,
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
        overflow: 'hidden',
    },
    cellSplit: {
        flexDirection: 'row',
    },
    cellHalf: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellHalfLeft: {
        borderTopLeftRadius: 9,
        borderBottomLeftRadius: 9,
    },
    cellHalfRight: {
        borderTopRightRadius: 9,
        borderBottomRightRadius: 9,
    },
    cellHalfText: {
        fontSize: 11,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
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
    },
});
