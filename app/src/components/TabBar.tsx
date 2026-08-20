import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Calendar, Check, Receipt, Settings, List, Ellipsis, type LucideIcon } from 'lucide-react-native';
import { theme } from './theme';

interface TabDef {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Also considered "on" when the current path falls under any of these prefixes — mirrors
   * the mockup's own grouping (e.g. Requests stays highlighted while viewing Availability). */
  activePrefixes?: string[];
}

const EMPLOYEE_TABS: TabDef[] = [
  { label: 'Home', href: '/(employee)/home', icon: LayoutDashboard },
  { label: 'Schedule', href: '/(employee)/schedule', icon: Calendar, activePrefixes: ['/schedule'] },
  { label: 'Requests', href: '/(employee)/requests', icon: Receipt, activePrefixes: ['/requests', '/availability', '/swaps', '/time-off', '/open-shifts'] },
  { label: 'Me', href: '/(employee)/profile', icon: Settings, activePrefixes: ['/profile', '/team', '/timesheet'] },
];
const EMPLOYEE_CLOCK_TAB: TabDef = { label: 'Clock', href: '/(employee)/clock', icon: Check, activePrefixes: ['/clock'] };

const MANAGER_TABS: TabDef[] = [
  { label: 'Overview', href: '/(manager)/dashboard', icon: LayoutDashboard },
  { label: 'Build', href: '/(manager)/schedule', icon: Calendar, activePrefixes: ['/schedule'] },
  { label: 'Approvals', href: '/(manager)/approvals', icon: Check, activePrefixes: ['/approvals'] },
  { label: 'Team', href: '/(manager)/staff', icon: List, activePrefixes: ['/staff'] },
  { label: 'More', href: '/(manager)/more', icon: Ellipsis, activePrefixes: ['/more', '/reports', '/shift-areas', '/announcements'] },
];

function isActive(tab: TabDef, pathname: string): boolean {
  if (pathname === tab.href.replace(/^\/\([^)]+\)/, '')) return true;
  return (tab.activePrefixes ?? []).some((prefix) => pathname.startsWith(prefix));
}

/**
 * Persistent bottom tab bar (doc/design's Prototype.dc.html — `tabsEmp`/`tabsMgr`). Rendered as
 * a normal flex sibling below each role's `<Stack>`, not absolutely positioned over it, so
 * screen content is pushed up above it automatically rather than every screen needing its own
 * bottom padding to avoid being hidden underneath.
 */
export function TabBar({ role }: { role: 'employee' | 'manager' }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const barStyle = [styles.bar, { paddingBottom: Math.max(theme.spacing.sm, insets.bottom) }];

  if (role === 'employee') {
    return (
      <View style={barStyle}>
        {EMPLOYEE_TABS.slice(0, 2).map((tab) => (
          <TabButton key={tab.href} tab={tab} active={isActive(tab, pathname)} onPress={() => router.push(tab.href as never)} />
        ))}
        <Pressable
          onPress={() => router.push(EMPLOYEE_CLOCK_TAB.href as never)}
          accessibilityRole="button"
          accessibilityLabel={EMPLOYEE_CLOCK_TAB.label}
          style={({ pressed }) => [styles.clockButton, pressed ? styles.clockButtonPressed : null]}
        >
          <Text style={styles.clockButtonLabel}>Clock</Text>
        </Pressable>
        {EMPLOYEE_TABS.slice(2).map((tab) => (
          <TabButton key={tab.href} tab={tab} active={isActive(tab, pathname)} onPress={() => router.push(tab.href as never)} />
        ))}
      </View>
    );
  }

  return (
    <View style={barStyle}>
      {MANAGER_TABS.map((tab) => (
        <TabButton key={tab.href} tab={tab} active={isActive(tab, pathname)} onPress={() => router.push(tab.href as never)} />
      ))}
    </View>
  );
}

function TabButton({ tab, active, onPress }: { tab: TabDef; active: boolean; onPress: () => void }): React.JSX.Element {
  const Icon = tab.icon;
  const color = active ? theme.colors.primary : theme.colors.textMuted;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} style={styles.tabButton}>
      <Icon size={22} color={color} strokeWidth={active ? 2.25 : 2} />
      <Text style={[styles.tabLabel, { color, fontFamily: active ? theme.typography.label.fontFamily : theme.typography.caption.fontFamily }]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  tabButton: {
    width: 64,
    minHeight: theme.minTapTarget,
    alignItems: 'center',
    gap: 5,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 9,
    lineHeight: 12,
  },
  clockButton: {
    width: 58,
    height: 58,
    marginTop: -18,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.overlay,
  },
  clockButtonPressed: {
    backgroundColor: theme.colors.primaryHover,
  },
  clockButtonLabel: {
    ...theme.typography.label,
    fontSize: 10,
    color: theme.colors.primaryText,
  },
});
