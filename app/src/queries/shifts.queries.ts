import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as shiftsApi from '../api/shifts.api';

export const shiftKeys = {
  list: (params: shiftsApi.ListShiftsParams) => ['shifts', 'list', params] as const,
  detail: (id: string) => ['shifts', 'detail', id] as const,
};

/**
 * Every shift-related screen reads through these hooks rather than calling `shifts.api.ts`
 * directly, so there is exactly one cache for "what shifts does the current user see" —
 * shared between the calendar, shift detail, and (once built) the manager's schedule screens.
 * Offline behavior (stale cache rendering while disconnected) comes for free from the
 * persisted QueryClient configured in `src/offline/query-client.ts`.
 */
export function useShiftsList(params: shiftsApi.ListShiftsParams = {}) {
  return useQuery({
    queryKey: shiftKeys.list(params),
    queryFn: () => shiftsApi.listShifts(params),
  });
}

export function useShiftDetail(shiftId: string) {
  return useQuery({
    queryKey: shiftKeys.detail(shiftId),
    queryFn: () => shiftsApi.getShift(shiftId),
    enabled: Boolean(shiftId),
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: shiftsApi.createShift,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shifts', 'list'] });
    },
  });
}

export function useUpdateShift(shiftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: shiftsApi.UpdateShiftInput) => shiftsApi.updateShift(shiftId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shiftKeys.detail(shiftId) });
      void queryClient.invalidateQueries({ queryKey: ['shifts', 'list'] });
    },
  });
}
