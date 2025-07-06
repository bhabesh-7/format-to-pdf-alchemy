import jsPDF from 'jspdf';
import * as Tesseract from 'tesseract.js';

type FileConversion = {
  file: File;
  type: 'image' | 'pdf';
};

type FileConversionResult = {
  blob: Blob | null;
  error: string | null;
};

const getFileExtension = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpeg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/bmp':
      return 'bmp';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpeg'; // Default to jpeg
  }
};

const performOCR = async (
  canvas: HTMLCanvasElement, 
  onProgress?: (progress: number) => void
): Promise<Tesseract.RecognizeResult> => {
  return new Promise((resolve, reject) => {
    Tesseract.recognize(canvas, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      }
    }).then(result => {
      resolve(result);
    }).catch(error => {
      reject(error);
    });
  });
};

const addOCRTextToPDF = (
  pdf: jsPDF, 
  ocrResult: any, 
  canvasWidth: number, 
  canvasHeight: number,
  pdfWidth: number,
  pdfHeight: number
) => {
  const scaleX = pdfWidth / canvasWidth;
  const scaleY = pdfHeight / canvasHeight;

  // Access words from the data property of the OCR result
  try {
    const words = ocrResult?.data?.words;
    if (words && Array.isArray(words)) {
      words.forEach((word: any) => {
        if (word.text && word.text.trim() && word.bbox) {
          const x = word.bbox.x0 * scaleX;
          const y = word.bbox.y0 * scaleY;
          const width = (word.bbox.x1 - word.bbox.x0) * scaleX;
          const height = (word.bbox.y1 - word.bbox.y0) * scaleY;
          
          // Calculate appropriate font size based on bounding box height
          const fontSize = Math.max(8, Math.min(height * 0.8, 16));
          
          pdf.setFontSize(fontSize);
          pdf.setTextColor(0, 0, 0, 0); // Invisible text
          pdf.text(word.text, x, y + height);
        }
      });
    }
  } catch (error) {
    console.warn('Error adding OCR text layer:', error);
  }
};

export const convertImagesToPdf = async (
  files: File[], 
  enableOCR: boolean = true,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let isFirstPage = true;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Use higher resolution for better quality
          const scale = 2;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          ctx.scale(scale, scale);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0);

          const aspectRatio = img.width / img.height;
          let pdfWidth = 210; // A4 width in mm
          let pdfHeight = 297; // A4 height in mm

          if (aspectRatio > pdfWidth / pdfHeight) {
            pdfHeight = pdfWidth / aspectRatio;
          } else {
            pdfWidth = pdfHeight * aspectRatio;
          }

          if (!isFirstPage) {
            pdf.addPage([pdfWidth, pdfHeight]);
          }
          isFirstPage = false;

          // Add image with higher quality
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

          try {
            // Perform OCR for text layer
            if (enableOCR) {
              const ocrResult = await performOCR(canvas, (progress) => {
                const totalProgress = ((i + progress * 0.8) / files.length) * 100;
                onProgress?.(totalProgress);
              });

              addOCRTextToPDF(pdf, ocrResult, canvas.width, canvas.height, pdfWidth, pdfHeight);
            }
          } catch (ocrError) {
            if (enableOCR) {
              console.warn('OCR failed for image', i + 1, ocrError);
            }
          }

          const totalProgress = ((i + 1) / files.length) * 100;
          onProgress?.(totalProgress);
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  return pdf.output('blob');
};

export const convertToPDF = async (
  file: File, 
  type: 'image' | 'document',
  enableOCR: boolean = true,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (type === 'image') {
    const blob = await convertImageToPdf(file, enableOCR, onProgress);
    return URL.createObjectURL(blob);
  } else {
    const result = await convertPdfToImage(file);
    if (result.blob) {
      const blob = await convertImageToPdf(new File([result.blob], "temp.jpeg", { type: 'image/jpeg' }), enableOCR, onProgress);
      return URL.createObjectURL(blob);
    } else {
      throw new Error(result.error || 'Conversion failed');
    }
  }
};

export const convertImageToPdf = async (
  file: File, 
  enableOCR: boolean = true,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const aspectRatio = img.width / img.height;
        let pdfWidth = 210; // A4 width in mm
        let pdfHeight = 297; // A4 height in mm

        if (aspectRatio > pdfWidth / pdfHeight) {
          pdfHeight = pdfWidth / aspectRatio;
        } else {
          pdfWidth = pdfHeight * aspectRatio;
        }

        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });

        // Add image to PDF
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        try {
          // Perform OCR
          if (enableOCR) {
            onProgress?.(0);
            const ocrResult = await performOCR(canvas, (progress) => {
              onProgress?.(progress * 0.8); // OCR takes 80% of the progress
            });

            // Add invisible text layer for copy functionality
            addOCRTextToPDF(pdf, ocrResult, canvas.width, canvas.height, pdfWidth, pdfHeight);
          }
          
          onProgress?.(100);
        } catch (ocrError) {
          if (enableOCR) {
            console.warn('OCR failed, creating PDF without text layer:', ocrError);
          }
          onProgress?.(100);
        }

        const pdfBlob = pdf.output('blob');
        resolve(pdfBlob);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

export const convertPdfToImage = async (file: File): Promise<FileConversionResult> => {
  try {
    const pdfData = await file.arrayBuffer();
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

    const pdf = await pdfjsLib.getDocument(pdfData).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    const imgData = canvas.toDataURL('image/jpeg');
    const blob = await (await fetch(imgData)).blob();
    const imageFile = new File([blob], 'pdf-preview.jpeg', { type: 'image/jpeg' });

    return { blob: imageFile, error: null };
  } catch (error: any) {
    console.error("Error converting PDF to image:", error);
    return { blob: null, error: error.message || 'Failed to convert PDF to image' };
  }
};

export const handleFileConversion = async (
  conversion: FileConversion,
  onProgress?: (progress: number) => void
): Promise<FileConversionResult> => {
  try {
    if (conversion.type === 'image') {
      const blob = await convertImageToPdf(conversion.file, true, onProgress);
      return { blob, error: null };
    } else if (conversion.type === 'pdf') {
      const result = await convertPdfToImage(conversion.file);
      if (result.blob) {
        const blob = await convertImageToPdf(new File([result.blob], "temp.jpeg", { type: 'image/jpeg' }), true, onProgress);
        return { blob, error: null };
      } else {
        return { blob: null, error: result.error };
      }
    } else {
      return { blob: null, error: 'Unsupported file type' };
    }
  } catch (error: any) {
    console.error("File conversion error:", error);
    return { blob: null, error: error.message || 'File conversion failed' };
  }
};
