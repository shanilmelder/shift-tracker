import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { colors } from '../components/theme';

/** The shape this hook needs from a query — satisfied by any TanStack Query result object. */
interface Refetchable {
  refetch: () => Promise<unknown>;
}

/**
 * Pull-to-refresh for every screen that reads server data. Pass the screen's query results
 * (one, or several — the manager schedule has three) and spread the returned element into a
 * scroll container's `refreshControl` prop:
 *
 *   const shifts = useShiftsList(range);
 *   const refreshControl = usePullToRefresh(shifts);
 *   return <FlatList refreshControl={refreshControl} ... />;
 *
 * The spinner is driven by local state rather than any query's own `isRefetching`, because a
 * screen may refresh several queries at once and the gesture should stay active until the
 * last of them settles — otherwise the control snaps back while data is still arriving.
 *
 * This deliberately refetches rather than invalidating the cache: a manual pull is the user
 * saying "I don't trust what's on screen", so it should hit the network even for data
 * TanStack Query still considers fresh.
 */
export function usePullToRefresh(...queries: Refetchable[]): React.JSX.Element {
  const [refreshing, setRefreshing] = useState(false);

  // Held in a ref so `onRefresh` keeps a stable identity across renders while still reaching
  // the current query objects — the rest-args array is newly allocated on every render, so
  // depending on it directly would rebuild the callback (and the RefreshControl) each time.
  const queriesRef = useRef(queries);
  queriesRef.current = queries;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // `refetch()` resolves with an error-carrying result rather than rejecting, so a failed
      // refresh still settles here and the screen's existing error/empty state renders it.
      await Promise.all(queriesRef.current.map((query) => query.refetch()));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
    />
  );
}
