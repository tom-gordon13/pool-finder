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

const CELL_W = 56;
const CELL_GAP = 8;
const TIME_HEADER_H = 40;
const CELL_ROW_H = 54;
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

function getPeriod(h: number): string {
    const hh = Math.floor(h);
    return hh < 12 ? 'AM' : 'PM';
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
    const scrollViewRef = useRef<ScrollView>(null);

    // Calculate exact position of current time indicator
    const getCurrentTimePosition = (): number | null => {
        if (currentHour === undefined || timeSlots.length === 0) return null;

        // Find the index of the time slot that contains or is just before current time
        const idx = timeSlots.findIndex(t => t > currentHour);
        const slotIdx = idx === -1 ? timeSlots.length - 1 : Math.max(0, idx - 1);

        // Calculate fraction of progress through the current hour slot
        const slotStart = timeSlots[slotIdx];
        const slotEnd = idx === -1 ? slotStart + 0.5 : timeSlots[idx];
        const slotDuration = slotEnd - slotStart;
        const progressInSlot = slotDuration > 0 ? (currentHour - slotStart) / slotDuration : 0;

        // Calculate pixel position
        return slotIdx * (CELL_W + CELL_GAP) + progressInSlot * CELL_W;
    };

    const currentTimePosition = getCurrentTimePosition();

    // Scroll to current hour on mount
    useEffect(() => {
        if (currentHour !== undefined) {
            // Find the hour column that contains the current time (rounded down)
            const currentHourFloor = Math.floor(currentHour);
            const idx = timeSlots.findIndex(t => t >= currentHourFloor);
            if (idx !== -1) {
                // Scroll so current hour is the leftmost visible column
                const x = idx * (CELL_W + CELL_GAP);
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ x, animated: false });
                }, 100);
            }
        }
    }, [currentHour, timeSlots]);

    return (
        <View style={styles.outerContainer}>
            <View style={styles.gridContainer}>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                >
                    <View>
                        {/* ── Time header row ── */}
                        <View style={styles.headerRow}>
                            {timeSlots.map((slot, colIdx) => {
                                const isSel = slot === selectedTime;
                                const isCur = currentHour !== undefined && slot === currentHour;
                                const period = getPeriod(slot);
                                const isPM = period === 'PM';
                                const columnBg = colIdx % 2 === 0
                                    ? 'rgba(255,255,255,0.02)'
                                    : 'rgba(0,0,0,0.02)';

                                return (
                                    <TouchableOpacity
                                        key={`h-${slot}`}
                                        onPress={() => onSelectTime(slot)}
                                        style={[
                                            styles.timeHeaderCell,
                                            { backgroundColor: columnBg }
                                        ]}
                                    >
                                        {isSel && <View style={styles.timeHeaderHighlight} />}
                                        <View style={styles.timeHeaderContent}>
                                            <Text style={[
                                                styles.timeHeaderText,
                                                isSel && styles.timeHeaderTextSelected,
                                                isCur && styles.timeHeaderTextCurrent,
                                            ]}>
                                                {formatHour(slot)}
                                            </Text>
                                            <Text style={[
                                                styles.periodText,
                                                isPM && styles.periodTextPM,
                                                isSel && styles.periodTextSelected,
                                            ]}>
                                                {period}
                                            </Text>
                                        </View>
                                        {isCur && !isSel && <View style={styles.currentDot} />}
                                        {isSel && <View style={styles.selectedBar} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Current time indicator line - positioned to only show over pool cells */}
                        {currentTimePosition !== null && (
                            <View style={[
                                styles.currentTimeIndicatorLine,
                                { left: currentTimePosition, top: TIME_HEADER_H }
                            ]} />
                        )}

                        {/* ── Per-pool sections ── */}
                        {pools.map((p, rowIndex) => {
                            const isActive = selectedPoolId === p.poolId;
                            const rowBg = rowIndex % 2 === 0
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
                                    style={[styles.poolSection, { backgroundColor: isActive ? theme.colors.primaryGlow : rowBg }]}
                                >
                                    {/* Pool name row - fixed width matching the scrollable content */}
                                    <View style={styles.nameRowContainer}>
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
                                    </View>

                                    {/* Cell row */}
                                    <View style={styles.poolRow}>
                                        {p.slots.map((slotData, colIdx) => {
                                            const isSel = slotData.time === selectedTime;
                                            const isCur = currentHour !== undefined && slotData.time === currentHour;
                                            const split = slotData.lanesHalf !== slotData.lanes;
                                            const cA = getCellColor(slotData.lanes);
                                            const cB = getCellColor(slotData.lanesHalf);
                                            const columnBg = colIdx % 2 === 0
                                                ? 'rgba(255,255,255,0.02)'
                                                : 'rgba(0,0,0,0.02)';

                                            return (
                                                <TouchableOpacity
                                                    key={`c-${p.poolId}-${slotData.time}`}
                                                    onPress={() => onSelectTime(slotData.time)}
                                                    style={[
                                                        styles.cellContainer,
                                                        { backgroundColor: columnBg }
                                                    ]}
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
                                                                isSel && { fontWeight: '900', fontSize: 18 },
                                                            ]}>
                                                                {slotData.lanes > 0 ? slotData.lanes : '·'}
                                                            </Text>
                                                        </View>
                                                    )}
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

    // Time header
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: TIME_HEADER_H,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
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
    timeHeaderContent: {
        alignItems: 'center',
        gap: 1,
    },
    timeHeaderText: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        fontWeight: '500',
    },
    timeHeaderTextSelected: {
        color: '#7ad0f0',
        fontWeight: '800',
    },
    timeHeaderTextCurrent: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    periodText: {
        fontSize: 8,
        color: 'rgba(138, 172, 202, 0.5)',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    periodTextPM: {
        color: 'rgba(255, 179, 102, 0.6)',
    },
    periodTextSelected: {
        color: '#7ad0f0',
    },
    currentDot: {
        width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.primary,
    },
    selectedBar: {
        width: 14, height: 2, borderRadius: 1, backgroundColor: theme.colors.primary,
    },
    currentTimeIndicatorLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: 'rgba(64,168,208,0.5)',
        zIndex: 5,
        shadowColor: 'rgba(64,168,208,0.8)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
    },

    // Pool section
    poolSection: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
    },
    nameRowContainer: {
        paddingHorizontal: 12,
    },
    nameRow: {
        height: NAME_ROW_H,
        flexDirection: 'row',
        alignItems: 'center',
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
        height: 42,
        borderRadius: 10,
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
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
    },
    cellHalfRight: {
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
    },
    cellHalfText: {
        fontSize: 13,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    cellGlow: {
        position: 'absolute',
        width: '100%', height: '100%',
        borderRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    cellText: {
        fontSize: 15,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
});
