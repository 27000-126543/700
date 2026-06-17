import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import Login from "@/pages/Login";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Monitoring from "@/pages/Monitoring";
import AlertList from "@/pages/AlertList";
import ApprovalList from "@/pages/ApprovalList";
import Inventory from "@/pages/Inventory";
import Procurement from "@/pages/Procurement";
import Diagnosis from "@/pages/Diagnosis";
import Permissions from "@/pages/Permissions";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="alerts" element={<AlertList />} />
          <Route path="approvals" element={<ApprovalList />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="diagnosis" element={<Diagnosis />} />
          <Route path="permissions" element={<Permissions />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
