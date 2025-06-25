
import React from 'react';
import { X, FileText, Image, AlertCircle } from 'lucide-react';
import { UploadedFile } from '@/pages/Index';

interface FileListProps {
  files: UploadedFile[];
  onRemoveFile: (id: string) => void;
  onUpdateStatus: (id: string, status: UploadedFile['status'], pdfUrl?: string) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, onRemoveFile }) => {
  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-600';
      case 'converting': return 'bg-blue-100 text-blue-600';
      case 'completed': return 'bg-green-100 text-green-600';
      case 'error': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return 'Ready';
      case 'converting': return 'Converting...';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto">
      {files.map((file) => (
        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {file.type === 'image' ? (
                <Image className="h-5 w-5 text-blue-500" />
              ) : (
                <FileText className="h-5 w-5 text-purple-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {file.name}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{file.format.toUpperCase()}</span>
                <span>•</span>
                <span>{file.size}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
              {getStatusText(file.status)}
            </span>
            
            {file.status === 'error' && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            
            <button
              onClick={() => onRemoveFile(file.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
