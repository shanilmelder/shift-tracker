import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check, TriangleAlert } from 'lucide-react-native';
import { theme } from './theme';
import { Card } from './Card';

export interface TempPasswordNoticeProps {
  name: string;
  tempPassword: string;
  emailSent: boolean;
  /** The provider's own reason, shown verbatim so the manager knows what to fix. */
  emailError?: string;
}

/**
 * The one-time reveal of a generated temporary password, shown after creating an account or
 * resetting one.
 *
 * This is the only moment the password is readable: the server stores a hash, so nothing can
 * retrieve it afterwards and a lost one has to be reissued. The copy says so, because a manager
 * who assumes they can look it up later will close this screen and strand the new starter.
 *
 * Shown whether or not the email went out. Email is the unreliable half of this flow, and a
 * manager who can read the password to someone is what keeps onboarding working when it fails.
 */
export function TempPasswordNotice({ name, tempPassword, emailSent, emailError }: TempPasswordNoticeProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    await Clipboard.setStringAsync(tempPassword);
    setCopied(true);
    // Reverts on its own — a permanently "Copied" button gives no feedback on a second copy.
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.heading}>{name}&apos;s temporary password</Text>

      <View style={styles.passwordRow}>
        <Text style={styles.password} selectable>
          {tempPassword}
        </Text>
        <Pressable
          onPress={() => void copy()}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Copied' : 'Copy password'}
          style={({ pressed }) => [styles.copyButton, pressed ? styles.copyButtonPressed : null]}
        >
          {copied ? (
            <Check size={18} color={theme.colors.success} />
          ) : (
            <Copy size={18} color={theme.colors.textSecondary} />
          )}
        </Pressable>
      </View>

      {emailSent ? (
        <Text style={styles.body}>Emailed to them. They&apos;ll be asked to choose their own password when they sign in.</Text>
      ) : (
        <View style={styles.warning}>
          <TriangleAlert size={16} color={theme.colors.warning} />
          <Text style={styles.warningText}>
            The email couldn&apos;t be sent, so pass this on yourself.
            {emailError ? ` (${emailError})` : ''}
          </Text>
        </View>
      )}

      <Text style={styles.caption}>
        This won&apos;t be shown again. If it&apos;s lost, reset their password to issue a new one.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  heading: { ...theme.typography.label, color: theme.colors.textSecondary },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  password: {
    ...theme.typography.value,
    color: theme.colors.textPrimary,
    // Dashed groups of look-alike-free characters — see the API's temp-password generator.
    letterSpacing: 1,
    flexShrink: 1,
  },
  copyButton: {
    width: theme.minTapTarget,
    height: theme.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonPressed: { opacity: 0.6 },
  body: { ...theme.typography.body, color: theme.colors.textSecondary },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  warningText: { ...theme.typography.body, color: theme.colors.warning, flexShrink: 1 },
  caption: { ...theme.typography.caption, color: theme.colors.textMuted },
});
