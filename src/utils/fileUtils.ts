
export interface FileTypeInfo {
  type: 'image' | 'document';
  format: string;
}

export const detectFileType = (file: File): FileTypeInfo | null => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Image formats
  const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
  if (extension && imageFormats.includes(extension)) {
    return { type: 'image', format: extension };
  }
  
  // Document formats
  const documentFormats = ['txt', 'doc', 'docx', 'rtf', 'html'];
  if (extension && documentFormats.includes(extension)) {
    return { type: 'document', format: extension };
  }
  
  return null;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
