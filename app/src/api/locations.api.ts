import { apiRequest } from './client';

export interface MyLocation {
  id: string;
  name: string;
  address: string;
  timezone: string;
}

export function getMyLocation(): Promise<MyLocation> {
  return apiRequest<MyLocation>('/locations/mine');
}
