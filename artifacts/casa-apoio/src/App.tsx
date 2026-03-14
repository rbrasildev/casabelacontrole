import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Components & Layout
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import { Dashboard } from "@/pages/Dashboard";
import { Residents } from "@/pages/Residents";
import { Finances } from "@/pages/Finances";
import { Inventory } from "@/pages/Inventory";
import { Activities } from "@/pages/Activities";
import { Reports } from "@/pages/Reports";

// Configure react-query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/residentes" component={Residents} />
        <Route path="/financeiro" component={Finances} />
        <Route path="/estoque" component={Inventory} />
        <Route path="/atividades" component={Activities} />
        <Route path="/relatorios" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
