import React, { useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Dimensions,
} from 'react-native';
import { theme } from '../theme';

const CELL_W = 56;
const CELL_GAP = 8;
const TIME_HEADER_H = 40;
const CELL_ROW_H = 54;
const NAME_ROW_H = 28;
const SCREEN_WIDTH = Dimensions.get('window').width;

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
    viewMode?: 'detailed' | 'compact';
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
    if (lanes <= 2) return theme.colors.statusScarce;   // 1-2: orange-red
    if (lanes <= 4) return theme.colors.statusLimited;  // 3-4: yellow
    if (lanes <= 6) return theme.colors.statusModerate; // 5-6: light green
    return theme.colors.statusOpen;                     // 7-8: dark green
};

const getStatusLabel = (lanes: number): string => {
    if (lanes <= 0) return 'Closed';
    if (lanes <= 2) return 'Scarce';   // 1-2
    if (lanes <= 4) return 'Limited';  // 3-4
    if (lanes <= 6) return 'Moderate'; // 5-6
    return 'Open';                     // 7-8
};

export function HeatmapGrid({
    pools,
    timeSlots,
    selectedTime,
    onSelectTime,
    onSelectPool,
    selectedPoolId,
    currentHour,
    viewMode = 'detailed',
}: HeatmapGridProps) {
    const scrollViewRef = useRef<ScrollView>(null);

    // Dynamic sizing based on view mode
    // In compact mode, calculate cell width to fill the screen
    const gridPadding = 24; // Account for container margins
    const availableWidth = SCREEN_WIDTH - gridPadding;
    const totalCells = timeSlots.length;

    let cellWidth: number;
    let cellGap: number;

    if (viewMode === 'compact') {
        // Calculate to fill the screen width
        cellGap = 1;
        const totalGapWidth = cellGap * (totalCells - 1);
        cellWidth = (availableWidth - totalGapWidth) / totalCells;
    } else {
        cellWidth = CELL_W;
        cellGap = CELL_GAP;
    }

    const cellHeight = viewMode === 'compact' ? 32 : 42;

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

        // Calculate pixel position using dynamic cell width
        return slotIdx * (cellWidth + cellGap) + progressInSlot * cellWidth;
    };

    const currentTimePosition = getCurrentTimePosition();

    // Scroll to current hour on mount (only in detailed mode)
    useEffect(() => {
        if (currentHour !== undefined && viewMode === 'detailed') {
            // Find the hour column that contains the current time (rounded down)
            const currentHourFloor = Math.floor(currentHour);
            const idx = timeSlots.findIndex(t => t >= currentHourFloor);
            if (idx !== -1) {
                // Scroll so current hour is the leftmost visible column
                const x = idx * (cellWidth + cellGap);
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ x, animated: false });
                }, 100);
            }
        }
    }, [currentHour, timeSlots, viewMode, cellWidth, cellGap]);

    return (
        <View style={styles.outerContainer}>
            <View style={styles.gridContainer}>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    scrollEnabled={viewMode === 'detailed'}
                    contentContainerStyle={viewMode === 'compact' ? { flex: 1 } : undefined}
                >
                    <View style={viewMode === 'compact' ? { flex: 1 } : undefined}>
                        {/* ── Time header row ── */}
                        <View style={styles.headerRow}>
                            {timeSlots.map((slot, colIdx) => {
                                const isSel = slot === selectedTime;
                                const isCur = currentHour !== undefined && slot === currentHour;
                                const period = getPeriod(slot);
                                const isPM = period === 'PM';
                                const columnBg = 'transparent';

                                return (
                                    <TouchableOpacity
                                        key={`h-${slot}`}
                                        onPress={() => onSelectTime(slot)}
                                        style={[
                                            styles.timeHeaderCell,
                                            { backgroundColor: columnBg, width: cellWidth + cellGap }
                                        ]}
                                    >
                                        {isSel && <View style={styles.timeHeaderHighlight} />}
                                        <View style={styles.timeHeaderContent}>
                                            <Text style={[
                                                styles.timeHeaderText,
                                                isSel && styles.timeHeaderTextSelected,
                                                isCur && styles.timeHeaderTextCurrent,
                                                viewMode === 'compact' && styles.timeHeaderTextCompact,
                                            ]}>
                                                {formatHour(slot)}
                                            </Text>
                                            {viewMode === 'detailed' && (
                                                <Text style={[
                                                    styles.periodText,
                                                    isPM && styles.periodTextPM,
                                                    isSel && styles.periodTextSelected,
                                                ]}>
                                                    {period}
                                                </Text>
                                            )}
                                        </View>
                                        {viewMode === 'detailed' && isCur && !isSel && <View style={styles.currentDot} />}
                                        {viewMode === 'detailed' && isSel && <View style={styles.selectedBar} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* ── Per-pool sections ── */}
                        {pools.map((p, rowIndex) => {
                            const isActive = selectedPoolId === p.poolId;
                            const rowBg = 'transparent';

                            const selectedSlot = selectedTime !== null
                                ? p.slots.find(s => s.time === selectedTime)
                                : undefined;
                            const openNow = selectedSlot?.lanes ?? 0;
                            const nowColor = getCellColor(openNow);

                            return (
                                <View
                                    key={`section-${p.poolId}`}
                                    style={[styles.poolSection, { backgroundColor: rowBg }]}
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
                                        {/* Current time indicator - only over cell row */}
                                        {currentTimePosition !== null && (
                                            <View style={[
                                                styles.currentTimeIndicatorLine,
                                                { left: currentTimePosition }
                                            ]} />
                                        )}
                                        {p.slots.map((slotData, colIdx) => {
                                            const isSel = slotData.time === selectedTime;
                                            const isCur = currentHour !== undefined && slotData.time === currentHour;
                                            const split = slotData.lanesHalf !== slotData.lanes;
                                            const cA = getCellColor(slotData.lanes);
                                            const cB = getCellColor(slotData.lanesHalf);
                                            const columnBg = 'transparent';

                                            return (
                                                <TouchableOpacity
                                                    key={`c-${p.poolId}-${slotData.time}`}
                                                    onPress={() => onSelectTime(slotData.time)}
                                                    style={[
                                                        styles.cellContainer,
                                                        { backgroundColor: columnBg, width: cellWidth + cellGap }
                                                    ]}
                                                >
                                                    {split && viewMode === 'detailed' ? (
                                                        <View style={[styles.cell, styles.cellSplit, { width: cellWidth, height: cellHeight }, isSel && { borderColor: '#fff', borderWidth: 2 }]}>
                                                            <View style={[styles.cellHalf, styles.cellHalfLeft, { backgroundColor: cA.bg }]}>
                                                                <Text style={[styles.cellHalfText, { color: cA.text }]}>
                                                                    {slotData.lanes > 0 ? slotData.lanes : '·'}
                                                                </Text>
                                                            </View>
                                                            <View style={[styles.cellHalf, styles.cellHalfRight, { backgroundColor: cB.bg }]}>
                                                                <Text style={[styles.cellHalfText, { color: cB.text }]}>
                                                                    {slotData.lanesHalf > 0 ? slotData.lanesHalf : '·'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        <View style={[
                                                            styles.cell,
                                                            {
                                                                width: cellWidth,
                                                                height: cellHeight,
                                                                backgroundColor: cA.bg,
                                                                borderColor: isSel && viewMode === 'detailed' ? '#fff' : 'transparent',
                                                                borderWidth: isSel && viewMode === 'detailed' ? 2 : 0,
                                                            },
                                                        ]}>
                                                            {viewMode === 'detailed' && (
                                                                <Text style={[
                                                                    styles.cellText,
                                                                    { color: cA.text },
                                                                    isSel && { fontWeight: '900', fontSize: 18 },
                                                                ]}>
                                                                    {slotData.lanes > 0 ? slotData.lanes : '·'}
                                                                </Text>
                                                            )}
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
    timeHeaderTextCompact: {
        fontSize: 8,
        fontWeight: '600',
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
        top: -3,
        bottom: -3,
        width: 2,
        backgroundColor: '#fff',
        borderRadius: 1,
        zIndex: 5,
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 2,
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
        borderRadius: 5,
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
