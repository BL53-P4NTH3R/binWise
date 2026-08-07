import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ProtectedRoute } from './components/ui'
import AdminLayout from './components/layout/AdminLayout'

// Shared pages
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

// Admin pages
import DashboardPage from './pages/admin/DashboardPage'
import LiveMapPage from './pages/admin/LiveMapPage'
import BinManagementPage from './pages/admin/BinManagementPage'
import RouteOptimisationPage from './pages/admin/RouteOptimisationPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import AlertsPage from './pages/admin/AlertsPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import SettingsPage from './pages/admin/SettingsPage'

// Driver pages
import DriverHomePage from './pages/driver/DriverHomePage'
import DriverRoutePage from './pages/driver/DriverRoutePage'
import DriverHistoryPage from './pages/driver/DriverHistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
          },
          success: {
            style: {
              background: '#ECFDF5',
              color: '#065F46',
              border: '1px solid #A7F3D0',
            },
            iconTheme: { primary: '#1D9E75', secondary: '#ECFDF5' },
          },
          error: {
            style: {
              background: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA',
            },
            iconTheme: { primary: '#E24B4A', secondary: '#FEF2F2' },
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Admin routes */}
        <Route
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/map" element={<LiveMapPage />} />
          <Route path="/bins" element={<BinManagementPage />} />
          <Route path="/routes" element={<RouteOptimisationPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Driver routes */}
        <Route
          path="/driver"
          element={
            <ProtectedRoute requiredRole="driver">
              <DriverHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/route"
          element={
            <ProtectedRoute requiredRole="driver">
              <DriverRoutePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/history"
          element={
            <ProtectedRoute requiredRole="driver">
              <DriverHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
