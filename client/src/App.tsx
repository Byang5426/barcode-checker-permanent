import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ChecklistList from "./pages/ChecklistList";
import Upload from "./pages/Upload";
import ChecklistDetail from "./pages/ChecklistDetail";
import { useAuth } from "./_core/hooks/useAuth";
import { Spinner } from "./components/ui/spinner";

// Base path: deployed under /barcode/ on byang.top
// Used by wouter Router so all routes are relative to /barcode
const APP_BASE = "/barcode";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <Component />;
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <WouterRouter base={APP_BASE}>
      <Switch>
        <Route path="/login" component={Login} />
        {user ? (
          <>
            <Route path="/" component={Home} />
            <Route path="/checklists" component={ChecklistList} />
            <Route path="/upload" component={Upload} />
            <Route path="/checklist/:id" component={ChecklistDetail} />
          </>
        ) : (
          <Route path="*" component={() => {
            window.location.href = `${APP_BASE}/login`;
            return null;
          }} />
        )}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
