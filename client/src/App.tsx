import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Mood from "./pages/Mood";
import Triggers from "./pages/Triggers";
import Routines from "./pages/Routines";
import Breathing from "./pages/Breathing";
import Settings from "./pages/Settings";
import Export from "./pages/Export";
import Analytics from "./pages/Analytics";
import Correlations from "./pages/Correlations";
import Predictions from "./pages/Predictions";
import Reminders from "./pages/Reminders";
import RoutinesEnhanced from "./pages/RoutinesEnhanced";
import Achievements from "./pages/Achievements";
import NotificationCenter from "./pages/NotificationCenter";
import CrisisMode from "./pages/CrisisMode";
import EmergencyContacts from "./pages/EmergencyContacts";
import PresetMessages from "./pages/PresetMessages";
import TechniqueLibrary from "./pages/TechniqueLibrary";
import Symptoms from "./pages/Symptoms";
import SOSButton from "./components/SOSButton";
import ConnectionGate from "./components/ConnectionGate";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/signin"} component={SignIn} />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/mood"} component={Mood} />
      <Route path={"/triggers"} component={Triggers} />
      <Route path={"/routines"} component={Routines} />
      <Route path={"/breathing"} component={Breathing} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/export"} component={Export} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/correlations"} component={Correlations} />
      <Route path={"/predictions"} component={Predictions} />
      <Route path={"/reminders"} component={Reminders} />
      <Route path={"/routines/analytics"} component={RoutinesEnhanced} />
      <Route path={"/achievements"} component={Achievements} />
      <Route path={"/notifications"} component={NotificationCenter} />
      <Route path={"/crisis"} component={CrisisMode} />
      <Route path={"/emergency-contacts"} component={EmergencyContacts} />
      <Route path={"/preset-messages"} component={PresetMessages} />
      <Route path={"/techniques"} component={TechniqueLibrary} />
      <Route path={"/symptoms"} component={Symptoms} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <ConnectionGate />
          <SOSButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
