import React, { useRef, useState } from "react";

interface FileUploadProps {
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
}

export default function FileUpload({
  onUploadComplete,
  onUploadError,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      setFile(null);
      return;
    }
    setFile(selected);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "http://localhost:8000/api/upload", true);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          setSuccess("Upload successful!");
          setFile(null);
          setUploadProgress(100);
          if (onUploadComplete) onUploadComplete(JSON.parse(xhr.responseText));
        } else {
          setError("Upload failed: " + xhr.statusText);
          if (onUploadError) onUploadError(xhr.statusText);
        }
      };
      xhr.onerror = () => {
        setIsUploading(false);
        setError("Upload failed: Network error");
        if (onUploadError) onUploadError("Network error");
      };
      xhr.send(formData);
    } catch (err: any) {
      setIsUploading(false);
      setError("Upload failed: " + err.message);
      if (onUploadError) onUploadError(err.message);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (dropped.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      setFile(null);
      return;
    }
    setFile(dropped);
    setError(null);
    setSuccess(null);
  };
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6">
          {/* Upload Area */}{" "}
          <div
            className={`
              relative rounded-xl p-8 text-center cursor-pointer
              transition-all duration-300 hover:bg-blue-50/50
              ${file ? "bg-blue-50" : ""}
              ${isUploading ? "pointer-events-none opacity-75" : ""}
            `}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center space-y-4">
              {/* Upload Icon */}
              <div
                className={`
                w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-colors duration-300
                ${file ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"}
              `}
              >
                {file ? "📄" : "📤"}
              </div>

              {/* Upload Text */}
              <div className="space-y-2">
                {file ? (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm text-blue-600">📄</span>
                    <span className="text-sm font-medium text-blue-700 max-w-[200px] truncate">
                      {file.name}
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Drag & drop a PDF here, or click to select
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF files only</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer hidden"
            />
          </div>
          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </span>
                <span className="font-medium text-blue-600">
                  {uploadProgress}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {/* Upload Button */}
          <div className="mt-8 space-y-2">
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>Upload PDF</span>
                </>
              )}
            </button>
          </div>
          {/* Status Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-red-600">❌</span>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✅</span>
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
