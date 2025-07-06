
import React, { useState } from 'react';
import { Play, Loader2, CheckCircle, Eye, Combine } from 'lucide-react';
import { UploadedFile } from '@/pages/Index';
import { convertToPDF, convertImagesToPdf } from '@/utils/pdfConverter';

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
  const [currentFile, setCurrentFile] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [mergeImages, setMergeImages] = useState(false);

  const pendingFiles = files.filter(file => file.status === 'pending');
  const completedFiles = files.filter(file => file.status === 'completed');
  const pendingImages = pendingFiles.filter(file => file.type === 'image');

  const startConversion = async () => {
    if (pendingFiles.length === 0) return;

    onStartConversion(true);
    setProgress(0);

    // Handle image merging if enabled and there are multiple images
    if (mergeImages && pendingImages.length > 1) {
      try {
        setCurrentFile('Merging images into single PDF...');
        setIsOcrProcessing(true);
        
        const imageFiles = pendingImages.map(f => f.file);
        const mergedPdfBlob = await convertImagesToPdf(imageFiles, (progress) => {
          setProgress(progress * 0.8);
        });
        
        const pdfUrl = URL.createObjectURL(mergedPdfBlob);
        
        // Mark all images as completed with the same merged PDF
        pendingImages.forEach(file => {
          onUpdateStatus(file.id, 'completed', pdfUrl);
        });
        
        setIsOcrProcessing(false);
        setProgress(80);
        
        // Process remaining non-image files
        const nonImageFiles = pendingFiles.filter(file => file.type !== 'image');
        await processRemainingFiles(nonImageFiles, 80);
        
      } catch (error) {
        console.error('Merge conversion error:', error);
        setIsOcrProcessing(false);
        pendingImages.forEach(file => {
          onUpdateStatus(file.id, 'error');
        });
      }
    } else {
      // Regular individual conversion
      await processRemainingFiles(pendingFiles, 0);
    }

    onStartConversion(false);
    setCurrentFile('');
  };

  const processRemainingFiles = async (filesToProcess: typeof pendingFiles, startProgress: number) => {
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setCurrentFile(file.name);
      
      try {
        onUpdateStatus(file.id, 'converting');
        
        if (file.type === 'image') {
          setIsOcrProcessing(true);
        }
        
        const pdfUrl = await convertToPDF(file.file, file.type);
        
        setIsOcrProcessing(false);
        onUpdateStatus(file.id, 'completed', pdfUrl);
        
        const currentProgress = startProgress + ((i + 1) / filesToProcess.length) * (100 - startProgress);
        setProgress(currentProgress);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Conversion error:', error);
        setIsOcrProcessing(false);
        onUpdateStatus(file.id, 'error');
      }
    }
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
            {currentFile && (
              <p className="text-sm text-gray-500">
                Processing: {currentFile}
              </p>
            )}
            {isOcrProcessing && (
              <div className="inline-flex items-center space-x-2 text-blue-600">
                <Eye className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Extracting text with OCR...</span>
              </div>
            )}
          </div>
        )}

        {!isConverting && pendingFiles.length > 0 && (
          <div className="space-y-4">
            {pendingImages.length > 1 && (
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="mergeImages"
                  checked={mergeImages}
                  onChange={(e) => setMergeImages(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="mergeImages" className="flex items-center space-x-2 text-sm text-blue-700 font-medium cursor-pointer">
                  <Combine className="h-4 w-4" />
                  <span>Merge {pendingImages.length} images into single PDF</span>
                </label>
              </div>
            )}
            
            <button
              onClick={startConversion}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              <Play className="h-5 w-5" />
              <span>
                {mergeImages && pendingImages.length > 1 
                  ? `Merge Images & Convert ${pendingFiles.length} Files` 
                  : `Convert ${pendingFiles.length} Files to PDF`
                }
              </span>
            </button>
            <p className="text-xs text-gray-500">
              Images will be processed with OCR for text extraction{mergeImages && pendingImages.length > 1 ? ' and merged into a single high-quality PDF' : ''}
            </p>
          </div>
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
