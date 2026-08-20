import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  accessibilityLabel?: string;
}

/** Shared tappable row used across schedule lists, staff lists, request lists, etc. */
export function ListRow({ title, subtitle, onPress, right, accessibilityLabel }: ListRowProps): React.JSX.Element {
  const content = (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}${subtitle ? `, ${subtitle}` : ''}`}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: theme.minTapTarget,
  },
  pressed: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  row: {
    minHeight: theme.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  textBlock: {
    flexShrink: 1,
  },
  title: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
