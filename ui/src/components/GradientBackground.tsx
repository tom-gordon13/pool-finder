import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

interface GradientBackgroundProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export function GradientBackground({ children, style }: GradientBackgroundProps) {
    return (
        <LinearGradient
            colors={[
                theme.colors.backgroundGradientStart,
                theme.colors.backgroundGradientMid,
                theme.colors.backgroundGradientEnd
            ]}
            style={[styles.container, style]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
        >
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
