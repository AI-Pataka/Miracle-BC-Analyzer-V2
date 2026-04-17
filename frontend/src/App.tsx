import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ConfigPage } from './pages/ConfigPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { CapabilityDashboard } from './pages/CapabilityDashboard';
import { JourneyDashboard } from './pages/JourneyDashboard';
import { StrategyDashboard } from './pages/StrategyDashboard';
import { IdeaEntry } from './pages/IdeaEntry';
import { AgentConfig } from './pages/AgentConfig';
import { History } from './pages/History';
import { AnalysisViewer } from './pages/AnalysisViewer';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Config page — replaces the old User Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ConfigPage />
              </ProtectedRoute>
            }
          />
          
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          <Route
            path="/idea-entry"
            element={
              <ProtectedRoute>
                <IdeaEntry />
              </ProtectedRoute>
            }
          />

          <Route
            path="/strategy"
            element={
              <ProtectedRoute>
                <StrategyDashboard />
              </ProtectedRoute>
            }
          />

          <Route 
            path="/journeys" 
            element={
              <ProtectedRoute>
                <JourneyDashboard />
              </ProtectedRoute>
            } 
          />

          <Route
            path="/capabilities"
            element={
              <ProtectedRoute>
                <CapabilityDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/agent-config"
            element={
              <ProtectedRoute>
                <AgentConfig />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history/:analysisId"
            element={
              <ProtectedRoute>
                <AnalysisViewer />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/idea-entry" replace />} />
          <Route path="*" element={<Navigate to="/idea-entry" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
