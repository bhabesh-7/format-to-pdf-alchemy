
import React, { useState } from 'react';
import { Play, Loader2, CheckCircle } from 'lucide-react';
import { UploadedFile } from '@/pages/Index';
import { convertToPDF } from '@/utils/pdfConverter';

interface ConversionProgressProps {
  files: UploadedFile[];
  isConverting: boolean;
  onStartConversion: (converting: boolean) => void;
  onUpdateStatus: (id: string, status: UploadedFile['status'], pdfUrl?: string) => void;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({
  files,
  isConverting,
  onStartConversion,
  onUpdateStatus
}) => {
  const [progress, setProgress] = useState(0);

  const pendingFiles = files.filter(file => file.status === 'pending');
  const completedFiles = files.filter(file => file.status === 'completed');

  const startConversion = async () => {
    if (pendingFiles.length === 0) return;

    onStartConversion(true);
    setProgress(0);

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      
      try {
        onUpdateStatus(file.id, 'converting');
        
        const pdfUrl = await convertToPDF(file.file, file.type);
        
        onUpdateStatus(file.id, 'completed', pdfUrl);
        
        setProgress(((i + 1) / pendingFiles.length) * 100);
        
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Conversion error:', error);
        onUpdateStatus(file.id, 'error');
      }
    }

    onStartConversion(false);
  };

  if (pendingFiles.length === 0 && completedFiles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Conversion Progress
        </h3>

        {isConverting && (
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              Converting {Math.round(progress)}% complete...
            </p>
          </div>
        )}

        {!isConverting && pendingFiles.length > 0 && (
          <button
            onClick={startConversion}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
          >
            <Play className="h-5 w-5" />
            <span>Convert {pendingFiles.length} Files to PDF</span>
          </button>
        )}

        {isConverting && (
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="font-medium">Converting files...</span>
          </div>
        )}

        {!isConverting && pendingFiles.length === 0 && completedFiles.length > 0 && (
          <div className="inline-flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">All files converted successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
};
