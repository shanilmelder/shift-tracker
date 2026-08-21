import React, { useRef } from 'react';
import { Animated, PanResponder, View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';

export interface SwipeToDeleteProps {
  children: React.ReactNode;
  /** Called once the row has been dragged past the trigger distance. The row springs back on
   * its own, so this should open a confirmation — it must not delete anything by itself. */
  onDelete: () => void;
  label?: string;
  /** Names the row for assistive tech, which cannot perform the swipe (see below). */
  accessibilityLabel?: string;
}

/** How far the red panel behind the row can be revealed. */
const REVEAL_WIDTH = 96;
/** Drag distance past which releasing counts as "delete this". */
const TRIGGER_DISTANCE = 72;
/** Horizontal movement before the swipe takes over from a tap or a vertical scroll. */
const CLAIM_THRESHOLD = 8;

/**
 * Swipe-left-to-delete for a list row, built from `Animated` + `PanResponder` rather than
 * `react-native-gesture-handler`'s Swipeable. Same reasoning as DateField: that would pull in
 * gesture-handler *and* reanimated, plus a babel plugin and a root-level provider, where this
 * needs no dependency at all and no native module to be present at runtime.
 *
 * The gesture is only claimed once the finger has moved horizontally past CLAIM_THRESHOLD and
 * is travelling more horizontally than vertically — so tapping the row still reaches the
 * child's `onPress`, and a vertical drag still scrolls the list.
 *
 * Releasing past the trigger springs the row back and calls `onDelete`, which is expected to
 * raise a ConfirmDialog. Deliberately: the row never stays open waiting for a second tap, so
 * there is no "open" state to reset when the user cancels, and no path where a single
 * uninterrupted gesture destroys data.
 */
export function SwipeToDelete({ children, onDelete, label = 'Delete', accessibilityLabel }: SwipeToDeleteProps): React.JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;

  // The PanResponder is built once, so it would otherwise capture the first `onDelete`.
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const springBack = (): void => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > CLAIM_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_event, gesture) => {
        // Left-only, and never further than the panel behind it is wide.
        translateX.setValue(Math.max(-REVEAL_WIDTH, Math.min(0, gesture.dx)));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx <= -TRIGGER_DISTANCE) onDeleteRef.current();
        springBack();
      },
      onPanResponderTerminate: springBack,
    }),
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.actionPanel} pointerEvents="none">
        <Text style={styles.actionLabel}>{label}</Text>
      </View>
      <Animated.View
        style={[styles.row, { transform: [{ translateX }] }]}
        {...responder.panHandlers}
        // A swipe is unreachable with a screen reader, so the same action is exposed as an
        // accessibility action — assistive tech surfaces it in its actions menu.
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[{ name: 'delete', label }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') onDeleteRef.current();
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  actionPanel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: theme.spacing.lg,
  },
  actionLabel: {
    ...theme.typography.label,
    color: theme.colors.primaryText,
  },
  row: {
    backgroundColor: theme.colors.background,
  },
});
