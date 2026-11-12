'use client';

import { useState, useRef } from 'react';
import { Select } from '@/components/ui/Select';
import { useCreateMaterial } from '@/hooks/useMaterials';
import { Upload, Loader2, FileText, Download, Trash2 } from 'lucide-react';
import { CreateMaterialResponse } from '@/types/material';

interface MaterialUploaderProps {
  eventId: string;
  onSuccess?: () => void;
}

export function MaterialUploader({ eventId, onSuccess }: MaterialUploaderProps) {
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState('application/pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMaterial = useCreateMaterial();

  const onSelectFile = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setErrorMessage('');
    setSuccessMessage('');
    if (!title.trim()) {
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileNameWithoutExt || file.name);
    }
    if (file.type) {
      setFileType(file.type);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !selectedFile) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsUploadingFile(true);
    try {
      const createResult = await createMaterial.mutateAsync({
        event_id: eventId,
        title: title.trim(),
        file_type: fileType || selectedFile.type || 'application/octet-stream',
      }) as CreateMaterialResponse;

      if (!createResult?.upload_url) {
        throw new Error('Upload URL missing from server response.');
      }

      const uploadResponse = await fetch(createResult.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': fileType || selectedFile.type || 'application/octet-stream',
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
      }

      setTitle('');
      setSelectedFile(null);
      setSuccessMessage('File uploaded to S3 successfully.');
      onSuccess?.();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create upload link or upload file.';
      setErrorMessage(message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Material Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="e.g., Session Slides, Lecture Notes"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select File
        </label>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            onSelectFile(e.dataTransfer.files?.[0] || null);
          }}
          className={`w-full rounded-lg border-2 border-dashed px-4 py-6 text-left transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-gray-50 hover:border-primary-400'
          }`}
        >
          <p className="text-sm font-medium text-gray-800">
            {selectedFile ? selectedFile.name : 'Drag & drop a file here, or click to choose'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {selectedFile
              ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
              : 'Any file type supported by your selected MIME type'}
          </p>
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          File Type (MIME)
        </label>
        <Select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="application/pdf">PDF</option>
          <option value="application/vnd.ms-powerpoint">PowerPoint</option>
          <option value="application/vnd.openxmlformats-officedocument.presentationml.presentation">PowerPoint (New)</option>
          <option value="application/msword">Word</option>
          <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word (New)</option>
          <option value="video/mp4">Video</option>
          <option value="application/zip">ZIP Archive</option>
        </Select>
      </div>

      <button
        type="submit"
        disabled={createMaterial.isPending || isUploadingFile || !title.trim() || !selectedFile}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
      >
        {createMaterial.isPending || isUploadingFile ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Upload size={18} />
        )}
        Upload to S3
      </button>

      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      {successMessage && (
        <p className="text-sm text-emerald-700">{successMessage}</p>
      )}
    </form>
  );
}

// Material List Item
interface MaterialListItemProps {
  material: {
    id: string;
    title: string;
    file_url: string;
    file_type?: string;
  };
  onDownload?: () => void;
  onDelete?: () => void;
  isDownloading?: boolean;
}

export function MaterialListItem({ material, onDownload, onDelete, isDownloading = false }: MaterialListItemProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50/80 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-50 rounded-lg">
          <FileText size={20} className="text-primary-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{material.title}</h4>
          <p className="text-sm text-gray-500">{material.file_type || 'File'}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onDownload && (
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
            title="Download"
          >
            {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
