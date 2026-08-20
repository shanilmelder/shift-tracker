import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The single shared confirmation dialog. The constitution's non-negotiables require explicit
 * confirmation before any destructive action (deleting a shift, removing a staff member,
 * cancelling a shift, etc.) — every screen that performs such an action MUST route through
 * this component rather than acting on a single tap.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.actionButton} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  dialog: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  actionButton: {
    minWidth: 100,
  },
});
