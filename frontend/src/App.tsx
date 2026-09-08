import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { MainLayout } from './components/layout/MainLayout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import { Research } from './pages/Research';
import { PdfViewerPage } from './pages/PdfViewerPage';
import { History } from './pages/History';
import { Analytics } from './pages/Analytics';
import { Evaluation } from './pages/Evaluation';
import { Verification } from './pages/Verification';
import { Collections } from './pages/Collections';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="library" element={<Library />} />
                <Route path="research" element={<Research />} />
                <Route path="documents/:documentId" element={<PdfViewerPage />} />
                <Route path="collections" element={<Collections />} />
                <Route path="history" element={<History />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="evaluation" element={<Evaluation />} />
                <Route path="verification" element={<Verification />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
