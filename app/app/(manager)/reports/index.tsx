import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SendHorizontal, Sparkles, ChartNoAxesColumn } from 'lucide-react-native';
import { theme, Card } from '../../../src/components';
import { askAssistant, type ChatTurn } from '../../../src/api/assistant.api';
import { ApiError } from '../../../src/types/api/common';

/**
 * Reports, as a conversation rather than four fixed screens. Those remain, one tap away under
 * "Standard" in the header, for the numbers a manager wants to read directly rather than ask
 * about.
 *
 * The model runs server-side and can only answer through a fixed set of typed lookups, so the
 * failure it is prone to is "I can't answer that", not a wrong number invented from nothing.
 * The UI leans into that: every answer shows which lookups produced it, so a figure can be
 * traced rather than trusted blindly.
 */

interface ChatMessage extends ChatTurn {
  id: string;
  toolsUsed?: string[];
  failed?: boolean;
}

/** Shown on the empty state. Concrete rather than generic, because the honest problem with a
 * bounded assistant is that nobody can tell what it covers by looking at a blank box. */
const SUGGESTIONS = [
  'Who is working the morning shift tomorrow?',
  'Who has taken the most time off this month?',
  'Which shifts next week have nobody assigned?',
  'How many overtime hours did we run last month?',
];

/** Tool names are internal identifiers; this is how they read to a manager. */
const TOOL_LABELS: Record<string, string> = {
  who_is_working: 'shift roster',
  shifts_in_range: 'schedule',
  understaffed_shifts: 'coverage gaps',
  time_off_summary: 'time off',
  hours_by_employee: 'hours worked',
  overtime_summary: 'overtime',
  attendance_summary: 'attendance',
  labor_cost: 'labor cost',
  list_staff: 'staff roster',
};

let messageCounter = 0;
const nextId = (): string => `msg-${(messageCounter += 1)}`;

export default function ReportsAssistantScreen(): React.JSX.Element {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isThinking) return;

      // Captured before the state update so the request carries the history as it was *before*
      // this question — the API appends the question itself.
      const history: ChatTurn[] = messages
        .filter((message) => !message.failed)
        .map(({ role, content }) => ({ role, content }));

      setDraft('');
      setMessages((current) => [...current, { id: nextId(), role: 'user', content: trimmed }]);
      setIsThinking(true);

      try {
        const answer = await askAssistant(trimmed, history);
        setMessages((current) => [
          ...current,
          { id: nextId(), role: 'assistant', content: answer.reply, toolsUsed: answer.toolsUsed },
        ]);
      } catch (error) {
        // Rendered as a message rather than an alert so it stays in the transcript next to the
        // question that caused it, and is marked `failed` so it is never sent back as history.
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: 'assistant',
            content: error instanceof ApiError ? error.message : 'Something went wrong reaching the assistant.',
            failed: true,
          },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, messages],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {/* Fixed header rather than the first row of the transcript: a link that scrolls away
          with the conversation is one nobody finds after the first question. */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Pressable
          onPress={() => router.push('/(manager)/reports/standard')}
          accessibilityRole="button"
          accessibilityLabel="Standard reports"
          style={({ pressed }) => [styles.standardLink, pressed ? styles.standardLinkPressed : null]}
        >
          <ChartNoAxesColumn size={16} color={theme.colors.textSecondary} />
          <Text style={styles.standardLinkText}>Standard</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Sparkles size={28} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>Ask about your team</Text>
            <Text style={styles.emptyBody}>
              Questions about shifts, hours, time off, attendance, and cost — answered from your location&apos;s
              live data.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => void send(suggestion)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.suggestion, pressed ? styles.suggestionPressed : null]}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}

        {isThinking ? (
          <View style={[styles.bubble, styles.assistantBubble, styles.thinking]}>
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            <Text style={styles.thinkingText}>Looking it up…</Text>
          </View>
        ) : null}
      </ScrollView>

      <Card style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about shifts, hours, or time off…"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          // Submitting from the keyboard is a nicety; `multiline` means Return still inserts a
          // newline on platforms that ignore this, so the send button remains the real path.
          onSubmitEditing={() => void send(draft)}
          editable={!isThinking}
          accessibilityLabel="Your question"
        />
        <Pressable
          onPress={() => void send(draft)}
          disabled={isThinking || draft.trim().length === 0}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [
            styles.sendButton,
            isThinking || draft.trim().length === 0 ? styles.sendButtonDisabled : null,
            pressed ? styles.sendButtonPressed : null,
          ]}
        >
          <SendHorizontal size={18} color={theme.colors.primaryText} />
        </Pressable>
      </Card>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }): React.JSX.Element {
  const isUser = message.role === 'user';
  // Deduplicated and relabelled: the model often calls one tool twice for a comparison, which
  // is an implementation detail, not two different sources.
  const sources = [...new Set(message.toolsUsed ?? [])].map((tool) => TOOL_LABELS[tool] ?? tool);

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble, message.failed ? styles.failedBubble : null]}>
      <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : null, message.failed ? styles.failedText : null]}>
        {message.content}
      </Text>
      {sources.length > 0 ? <Text style={styles.sources}>From: {sources.join(', ')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  title: { ...theme.typography.title, color: theme.colors.textPrimary },
  standardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.minTapTarget,
    paddingLeft: theme.spacing.sm,
  },
  standardLinkPressed: { opacity: 0.6 },
  standardLinkText: { ...theme.typography.label, color: theme.colors.textSecondary },
  transcript: { flex: 1 },
  transcriptContent: { padding: theme.spacing.md, gap: theme.spacing.sm },

  empty: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  emptyTitle: { ...theme.typography.heading, color: theme.colors.textPrimary },
  emptyBody: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  suggestions: { gap: theme.spacing.sm, marginTop: theme.spacing.md, alignSelf: 'stretch' },
  suggestion: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    minHeight: theme.minTapTarget,
    justifyContent: 'center',
  },
  suggestionPressed: { backgroundColor: theme.colors.surfaceMuted },
  suggestionText: { ...theme.typography.body, color: theme.colors.textPrimary },

  bubble: {
    maxWidth: '88%',
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  failedBubble: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.borderStrong },
  bubbleText: { ...theme.typography.body, color: theme.colors.textPrimary },
  userBubbleText: { color: theme.colors.primaryText },
  failedText: { color: theme.colors.danger },
  sources: { ...theme.typography.caption, color: theme.colors.textMuted },

  thinking: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  thinkingText: { ...theme.typography.body, color: theme.colors.textSecondary },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.sm,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
    // Bounded so a long question scrolls inside the composer instead of pushing the transcript
    // off the screen.
    maxHeight: 120,
    minHeight: theme.minTapTarget - theme.spacing.sm * 2,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: { backgroundColor: theme.colors.primaryHover },
  sendButtonDisabled: { backgroundColor: theme.colors.disabled },
});
