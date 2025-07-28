import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../hooks/useAuth';

interface UploadedFile extends File {
  id: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export const FileUpload: React.FC = () => {
  const { user } = useAuth();
  const { uploadDocuments, isUploading } = useDocuments(user?.id);
  const [files, setFiles] = React.useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).substring(2),
      status: 'uploading',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach(file => {
      const interval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, progress: Math.min(f.progress + 10, 90) }
            : f
        ));
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, progress: 100, status: 'success' }
            : f
        ));
      }, 2000);
    });

    // Actually upload the files
    uploadDocuments(acceptedFiles);
  }, [uploadDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    maxSize: 20 * 1024 * 1024 // 20MB
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status === 'uploading'));
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isDragActive ? 'Drop files here' : 'Upload PDF Documents'}
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop your PDF files here, or click to browse
        </p>
        <div className="text-sm text-gray-500">
          <p>Supported format: PDF</p>
          <p>Maximum file size: 20MB</p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Upload Progress</h4>
            {files.some(f => f.status === 'success') && (
              <button
                onClick={clearCompleted}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear Completed
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-200">
            {files.map(file => (
              <div key={file.id} className="px-6 py-4 flex items-center space-x-4">
                <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {file.progress}% uploaded
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {file.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};