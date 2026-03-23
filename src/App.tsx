import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient();

/*
 * ██  MAINTENANCE MODE  ██
 * Remove this wrapper and restore the full router
 * when the command [START-V3] is received.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <Maintenance />
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
