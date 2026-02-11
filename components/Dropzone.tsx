
import React, { useRef, useState } from 'react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, isLoading }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`relative group max-w-2xl mx-auto mt-12 transition-all duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept="application/pdf"
        onChange={handleInputChange}
      />
      
      <div className={`
        border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300
        ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 bg-white hover:border-blue-400'}
      `}>
        <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 mb-2">Drop your PDF here</h3>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
          We'll extract the pages so you can pick exactly what you need. AI will help you search through them.
        </p>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          Select PDF File
        </button>
        
        <p className="mt-4 text-xs text-slate-400">Supported formats: .pdf (Max 50MB)</p>
      </div>
    </div>
  );
};

export default Dropzone;
