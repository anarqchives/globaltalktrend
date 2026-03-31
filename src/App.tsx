import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/*
 * ██  MAINTENANCE MODE  ██
 * Remove this wrapper and restore the full router
 * when the command [START-V3] is received.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ErrorBoundary>
        <Maintenance />
      </ErrorBoundary>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
