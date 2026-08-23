import React, { useRef } from 'react';
import { Animated, PanResponder, View, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Trash2 } from 'lucide-react-native';
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

/** How far the red panel behind the row can be revealed before resistance sets in. Wide enough
 * that the icon and either label sit fully inside the revealed strip. */
const REVEAL_WIDTH = 120;
/** Drag distance past which releasing counts as "delete this". */
const TRIGGER_DISTANCE = 80;
/** Horizontal movement before the swipe takes over from a tap or a vertical scroll. */
const CLAIM_THRESHOLD = 8;
/** Fraction of the drag that still moves the row once it is past REVEAL_WIDTH — the rubber band. */
const OVERDRAG_RESISTANCE = 0.25;
/** Hard stop, so a fast flick cannot drag the row clean off its own panel. */
const MAX_TRANSLATE = REVEAL_WIDTH + 48;
/** Fixed width for the label slot, so crossfading the two labels cannot shift the icon. Sized
 * for the longer of them ("Release") at `typography.label`. */
const LABEL_WIDTH = 58;

/**
 * Swipe-left-to-delete for a list row, built from `Animated` + `PanResponder` rather than
 * `react-native-gesture-handler`'s Swipeable. Same reasoning as DateField: that would pull in
 * gesture-handler *and* reanimated, plus a babel plugin and a root-level provider, where this
 * needs neither and no native module beyond the haptics below.
 *
 * The gesture is only claimed once the finger has moved horizontally past CLAIM_THRESHOLD and
 * is travelling more horizontally than vertically — so tapping the row still reaches the
 * child's `onPress`, and a vertical drag still scrolls the list.
 *
 * The drag is continuously legible rather than a binary reveal. As the row moves the trash icon
 * scales and fades up from nothing, and past TRIGGER_DISTANCE the panel deepens to full danger
 * red, the label switches to "Release", and the icon pops — so the finger can see
 * whether letting go right now would actually do anything. Crossing that line in either
 * direction fires a selection haptic, and committing fires a heavier one. Past REVEAL_WIDTH the
 * row keeps moving at OVERDRAG_RESISTANCE, which reads as the panel pushing back.
 *
 * Releasing past the trigger springs the row back and calls `onDelete`, which is expected to
 * raise a ConfirmDialog. Deliberately: the row never stays open waiting for a second tap, so
 * there is no "open" state to reset when the user cancels, and no path where a single
 * uninterrupted gesture destroys data.
 */
export function SwipeToDelete({ children, onDelete, label = 'Delete', accessibilityLabel }: SwipeToDeleteProps): React.JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;
  /** 0 → 1 as the drag crosses TRIGGER_DISTANCE. Drives every "armed" visual at once, and is
   * animated rather than set outright so the change reads as a transition, not a jump. */
  const armed = useRef(new Animated.Value(0)).current;
  /** Mirrors `armed` in JS — the source of truth for edge detection, since an Animated.Value's
   * current value is not readable synchronously without a listener. */
  const isArmed = useRef(false);

  // The PanResponder is built once, so it would otherwise capture the first `onDelete`.
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const setArmed = (next: boolean): void => {
    if (isArmed.current === next) return;
    isArmed.current = next;
    // Arming is the moment worth feeling; disarming gets the same light tick so the boundary
    // is symmetric. Web has no haptics API, and calling into it there logs a warning.
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    Animated.timing(armed, { toValue: next ? 1 : 0, duration: 140, useNativeDriver: true }).start();
  };

  const reset = (): void => {
    isArmed.current = false;
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }),
      Animated.timing(armed, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start();
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > CLAIM_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_event, gesture) => {
        // Left-only. Past the panel's width the row keeps going, but at a fraction of the
        // finger's speed, so the edge is felt rather than hit.
        const dx = Math.min(0, gesture.dx);
        const overdrag = Math.max(0, -dx - REVEAL_WIDTH);
        const next = Math.max(-MAX_TRANSLATE, dx + overdrag * (1 - OVERDRAG_RESISTANCE));
        translateX.setValue(next);
        setArmed(dx <= -TRIGGER_DISTANCE);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx <= -TRIGGER_DISTANCE) {
          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDeleteRef.current();
        }
        reset();
      },
      onPanResponderTerminate: reset,
    }),
  ).current;

  // Distance travelled, as a 0 → 1 ramp that reaches full at the trigger point. The icon rides
  // this so it grows with the drag instead of appearing all at once.
  const progress = translateX.interpolate({
    inputRange: [-TRIGGER_DISTANCE, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Grows with the drag, then gets a small extra kick the moment it arms.
  const iconScale = Animated.add(
    progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
    armed.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }),
  );

  return (
    <View style={styles.container}>
      <View style={styles.actionPanelBase} pointerEvents="none">
        {/* Two stacked panels rather than an interpolated backgroundColor: color interpolation
            is not supported by the native driver, and dropping to the JS driver for it would
            put the whole animation back on the bridge mid-gesture. */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.actionPanelArmed, { opacity: armed }]} />
        <Animated.View style={[styles.actionContent, { opacity: progress }]}>
          {/* The icon is wrapped rather than animated directly: lucide renders a
              react-native-svg component, and `createAnimatedComponent` on it depends on that
              component forwarding refs and native props. An Animated.View around it is a
              plain, stable transform target. */}
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Trash2 size={20} color={theme.colors.primaryText} />
          </Animated.View>
          <View style={styles.labelSlot}>
            <Animated.Text
              style={[styles.actionLabel, styles.labelStacked, { opacity: Animated.subtract(1, armed) }]}
              numberOfLines={1}
            >
              {label}
            </Animated.Text>
            <Animated.Text style={[styles.actionLabel, styles.labelStacked, { opacity: armed }]} numberOfLines={1}>
              Release
            </Animated.Text>
          </View>
        </Animated.View>
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
  actionPanelBase: {
    ...StyleSheet.absoluteFillObject,
    // Muted until armed, so "let go now and something happens" is a visible state change and
    // not just a wider red stripe.
    backgroundColor: theme.colors.chartNegative,
    borderRadius: theme.radius.md,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: theme.spacing.lg,
    overflow: 'hidden',
  },
  actionPanelArmed: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  labelSlot: {
    width: LABEL_WIDTH,
    // Both labels are absolutely positioned, so the slot has no intrinsic height of its own.
    height: theme.typography.label.lineHeight,
    justifyContent: 'center',
  },
  labelStacked: {
    ...StyleSheet.absoluteFillObject,
    textAlign: 'right',
    textAlignVertical: 'center',
  },
  actionLabel: {
    ...theme.typography.label,
    color: theme.colors.primaryText,
  },
  row: {
    backgroundColor: theme.colors.background,
  },
});
