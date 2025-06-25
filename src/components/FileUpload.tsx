
import React, { useCallback, useState } from 'react';
import { Upload, FileText, Image } from 'lucide-react';
import { UploadedFile } from '@/pages/Index';
import { detectFileType, formatFileSize } from '@/utils/fileUtils';

interface FileUploadProps {
  onFilesAdded: (files: UploadedFile[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesAdded }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  const processFiles = (fileList: File[]) => {
    const supportedFiles: UploadedFile[] = [];
    
    fileList.forEach(file => {
      const fileType = detectFileType(file);
      if (fileType) {
        supportedFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: formatFileSize(file.size),
          type: fileType.type,
          format: fileType.format,
          status: 'pending'
        });
      }
    });

    if (supportedFiles.length > 0) {
      onFilesAdded(supportedFiles);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragging 
            ? 'border-blue-400 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.txt,.doc,.docx,.rtf,.html"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-full">
              <Upload className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-600 mb-4">
              Support for images and documents up to 10MB each
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Image className="h-4 w-4" />
              <span>PNG, JPG, GIF, BMP, WEBP, SVG</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>TXT, DOC, DOCX, RTF, HTML</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
