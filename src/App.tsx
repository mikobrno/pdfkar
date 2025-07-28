import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { useDocuments } from './hooks/useDocuments';
import { useRealTimeUpdates } from './hooks/useRealTimeUpdates';
import { AuthForm } from './components/auth/AuthForm';
import { Sidebar } from './components/layout/Sidebar';
import { FileUpload } from './components/upload/FileUpload';
import { DocumentsTable } from './components/dashboard/DocumentsTable';
import { StatsCards } from './components/dashboard/StatsCards';
import { ReviewInterface } from './components/review/ReviewInterface';
import { PromptManager } from './components/admin/PromptManager';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { Document, ExtractedData } from './types';
import { db } from './lib/supabase';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);

  const { documents, isLoading: documentsLoading } = useDocuments(user?.id);
  
  // Set up real-time updates
  useRealTimeUpdates(user?.id);

  const handleViewDocument = async (document: Document) => {
    setSelectedDocument(document);
    
    if (document.status === 'awaiting_review' || document.status === 'completed') {
      try {
        const { data, error } = await db.getExtractedData(document.id);
        if (error) throw error;
        setExtractedData(data || []);
        setCurrentView('review');
      } catch (error) {
        console.error('Failed to load extracted data:', error);
      }
    }
  };

  const handleReviewComplete = () => {
    setSelectedDocument(null);
    setExtractedData([]);
    setCurrentView('documents');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // Review interface
  if (currentView === 'review' && selectedDocument && extractedData.length > 0) {
    return (
      <ReviewInterface
        document={selectedDocument}
        extractedData={extractedData}
        onComplete={handleReviewComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Přehled</h1>
                <p className="text-gray-600">
                  Vítejte zpět! Zde je přehled vaší aktivity zpracování dokumentů.
                </p>
              </div>
              
              <StatsCards documents={documents} />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <DocumentsTable 
                    documents={documents.slice(0, 10)} 
                    onViewDocument={handleViewDocument}
                  />
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Rychlé akce</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setCurrentView('upload')}
                        className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <div className="font-medium text-indigo-900">Nahrát dokumenty</div>
                        <div className="text-sm text-indigo-600">Přidat nové soubory ke zpracování</div>
                      </button>
                      <button
                        onClick={() => setCurrentView('review')}
                        className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                      >
                        <div className="font-medium text-orange-900">Fronta kontrol</div>
                        <div className="text-sm text-orange-600">
                          {documents.filter(d => d.status === 'awaiting_review').length} dokumentů čeká
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'upload' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Nahrát dokumenty</h1>
                <p className="text-gray-600">
                  Nahrajte PDF dokumenty pro inteligentní zpracování a extrakci dat.
                </p>
              </div>
              <FileUpload />
            </div>
          )}

          {currentView === 'documents' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Všechny dokumenty</h1>
                <p className="text-gray-600">
                  Spravujte a prohlížejte všechny vaše zpracované dokumenty.
                </p>
              </div>
              <DocumentsTable documents={documents} onViewDocument={handleViewDocument} />
            </div>
          )}

          {currentView === 'review' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Fronta kontrol</h1>
                <p className="text-gray-600">
                  Dokumenty čekající na lidskou kontrolu a validaci.
                </p>
              </div>
              <DocumentsTable 
                documents={documents.filter(d => d.status === 'awaiting_review')} 
                onViewDocument={handleViewDocument}
              />
            </div>
          )}

          {currentView === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytika</h1>
                <p className="text-gray-600">
                  Poznatky a metriky o výkonu zpracování vašich dokumentů.
                </p>
              </div>
              <AnalyticsDashboard documents={documents} />
            </div>
          )}

          {currentView === 'admin' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Správa</h1>
                <p className="text-gray-600">
                  Spravujte nastavení systému, prompty a konfigurace.
                </p>
              </div>
              <PromptManager />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;