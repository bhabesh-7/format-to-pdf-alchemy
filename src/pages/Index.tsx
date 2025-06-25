
import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { FileList } from '@/components/FileList';
import { ConversionProgress } from '@/components/ConversionProgress';
import { FileText, Image, Download } from 'lucide-react';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: string;
  type: 'image' | 'document';
  format: string;
  status: 'pending' | 'converting' | 'completed' | 'error';
  pdfUrl?: string;
}

const Index = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  const addFiles = (newFiles: UploadedFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const updateFileStatus = (id: string, status: UploadedFile['status'], pdfUrl?: string) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, status, pdfUrl } : file
    ));
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const completedFiles = files.filter(file => file.status === 'completed');
  const totalFiles = files.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Format to PDF Converter
            </h1>
            <p className="text-gray-600 text-lg">
              Convert images and documents to PDF format instantly
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-xl mr-4">
                <Image className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Image Conversion</h3>
                <p className="text-gray-600">PNG, JPG, GIF, BMP, WEBP, SVG</p>
              </div>
            </div>
            <p className="text-gray-600">
              Convert any image format to high-quality PDF files with customizable settings.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-xl mr-4">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Document Conversion</h3>
                <p className="text-gray-600">TXT, DOC, DOCX, RTF, HTML</p>
              </div>
            </div>
            <p className="text-gray-600">
              Transform text documents into professional PDF files while preserving formatting.
            </p>
          </div>
        </div>

        {/* Main Conversion Area */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <FileUpload onFilesAdded={addFiles} />
            
            {files.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Uploaded Files ({files.length})
                  </h3>
                  <button
                    onClick={clearAllFiles}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <FileList 
                  files={files} 
                  onRemoveFile={removeFile}
                  onUpdateStatus={updateFileStatus}
                />
              </div>
            )}
          </div>

          {/* Progress and Results Section */}
          <div className="space-y-6">
            {files.length > 0 && (
              <ConversionProgress 
                files={files}
                isConverting={isConverting}
                onStartConversion={setIsConverting}
                onUpdateStatus={updateFileStatus}
              />
            )}

            {completedFiles.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Completed Files ({completedFiles.length})
                  </h3>
                  <Download className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-3">
                  {completedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm font-medium text-gray-700">
                        {file.name.replace(/\.[^/.]+$/, '')}.pdf
                      </span>
                      <a
                        href={file.pdfUrl}
                        download={`${file.name.replace(/\.[^/.]+$/, '')}.pdf`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {totalFiles > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-6 bg-white rounded-xl px-6 py-4 shadow-lg border border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalFiles}</div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedFiles.length}</div>
                <div className="text-sm text-gray-600">Converted</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
