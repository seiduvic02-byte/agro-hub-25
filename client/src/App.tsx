import { lazy, Suspense, useEffect } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import CookiePreferences from "@/components/CookiePreferences";
import Home from "./pages/Home";
import PolicyPage from "./pages/PolicyPage";

const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const Workspace = lazy(() => import("./pages/Workspace"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const PriceIntelligence = lazy(() => import("./pages/PriceIntelligence"));

function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="loading-dots" />
      <span>Opening Agro Hub…</span>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/produce/:slug" component={ListingDetail} />
        <Route path="/seller/:id" component={SellerProfile} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/privacy" component={PolicyPage} />
        <Route path="/terms" component={PolicyPage} />
        <Route path="/workspace" component={Workspace} />
        <Route path="/prices" component={PriceIntelligence} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("app-ready");
    return () => document.documentElement.classList.remove("app-ready");
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
          <CookiePreferences />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
