
import React, { useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import Dropzone from './components/Dropzone';
import { AppStatus, PDFData } from './types';
import { parsePDF, extractPages } from './services/pdfService';
import { suggestPagesByQuery } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [pdfData, setPdfData] = useState<PDFData | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setStatus(AppStatus.LOADING);
    setError(null);
    try {
      const data = await parsePDF(file);
      setPdfData(data);
      setStatus(AppStatus.READY);
      setSelectedIndices(new Set());
    } catch (err) {
      setError('Failed to process PDF. Please try another file.');
      setStatus(AppStatus.IDLE);
      console.error(err);
    }
  };

  const togglePageSelection = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!pdfData) return;
    if (selectedIndices.size === pdfData.pages.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(pdfData.pages.map(p => p.index)));
    }
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || !pdfData || isAiLoading) return;

    setIsAiLoading(true);
    try {
      const suggestedIndices = await suggestPagesByQuery(aiQuery, pdfData.pages);
      setSelectedIndices(new Set(suggestedIndices));
    } catch (err) {
      setError('AI Search failed. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!pdfData || selectedIndices.size === 0) return;
    setStatus(AppStatus.PROCESSING);
    try {
      // Explicitly type the sorting parameters to ensure TypeScript can perform arithmetic operations.
      // This also ensures that the resulting array matches the required number[] type for extractPages.
      const sortedIndices = Array.from(selectedIndices).sort((a: number, b: number) => a - b);
      const newPdfBytes = await extractPages(pdfData.rawBytes, sortedIndices);
      
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extracted_${pdfData.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate PDF.');
    } finally {
      setStatus(AppStatus.READY);
    }
  };

  const reset = () => {
    setPdfData(null);
    setSelectedIndices(new Set());
    setStatus(AppStatus.IDLE);
    setAiQuery('');
    setError(null);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {status === AppStatus.IDLE && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Dropzone onFileSelect={handleFileSelect} isLoading={status === AppStatus.LOADING} />
          </div>
        )}

        {status === AppStatus.LOADING && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800">Reading PDF Content...</h3>
              <p className="text-slate-500">Extracting text and generating previews</p>
            </div>
          </div>
        )}

        {pdfData && (status === AppStatus.READY || status === AppStatus.PROCESSING) && (
          <div className="animate-in fade-in duration-500">
            {/* Control Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 sticky top-20 z-40 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={reset}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                  title="Upload different file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h2 className="font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">{pdfData.name}</h2>
                  <p className="text-xs text-slate-500">{pdfData.pages.length} pages • {(pdfData.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              {/* AI SEARCH */}
              <form onSubmit={handleAiSearch} className="relative flex-1 max-w-lg w-full">
                <input 
                  type="text"
                  placeholder="Ask AI to find pages (e.g. 'Pages with invoices')"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                />
                <button 
                  type="submit"
                  disabled={isAiLoading || !aiQuery.trim()}
                  className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
                >
                  {isAiLoading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </form>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={handleSelectAll}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 px-4"
                >
                  {selectedIndices.size === pdfData.pages.length ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={selectedIndices.size === 0 || status === AppStatus.PROCESSING}
                  className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  {status === AppStatus.PROCESSING ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Export {selectedIndices.size > 0 ? `(${selectedIndices.size})` : ''}
                </button>
              </div>
            </div>

            {/* Page Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {pdfData.pages.map((page) => (
                <div 
                  key={page.index}
                  onClick={() => togglePageSelection(page.index)}
                  className={`
                    group relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200
                    ${selectedIndices.has(page.index) 
                      ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50' 
                      : 'border-slate-200 bg-white hover:border-blue-300'}
                  `}
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                    <img 
                      src={page.thumbnail} 
                      alt={`Page ${page.index + 1}`}
                      className={`w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 ${selectedIndices.has(page.index) ? 'opacity-90' : ''}`}
                    />
                    
                    {/* Checkbox Overlay */}
                    <div className={`
                      absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                      ${selectedIndices.has(page.index) 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white/80 border-slate-300 text-transparent'}
                    `}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    {/* Page Number Badge */}
                    <div className="absolute bottom-2 left-2 bg-slate-800/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Page {page.index + 1}
                    </div>
                  </div>
                  
                  {/* Quick Info/Search Snippet if relevant */}
                  <div className="p-3 bg-white">
                    <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                      {page.textContent.trim().substring(0, 40)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Persistent Selection Indicator (Mobile) */}
      {selectedIndices.size > 0 && status === AppStatus.READY && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden animate-in fade-in slide-in-from-bottom-10">
          <button 
            onClick={handleDownload}
            className="bg-slate-900 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 font-semibold active:scale-95 transition-transform"
          >
            <span>Download {selectedIndices.size} Pages</span>
            <div className="bg-blue-500 rounded-full p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
