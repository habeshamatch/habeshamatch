import { QueryClient } from '@tanstack/react-query';

// Shared cache for server data (React Query). Cached results are shown instantly when returning
// to a screen and refreshed in the background, which saves data on slow connections.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // treat data as fresh for a minute
      gcTime: 10 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
