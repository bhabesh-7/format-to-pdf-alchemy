
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createWorker } from 'tesseract.js';
import { readFileAsText, readFileAsDataURL } from './fileUtils';

export const convertToPDF = async (file: File, type: 'image' | 'document'): Promise<string> => {
  const pdf = new jsPDF();
  
  if (type === 'image') {
    return convertImageToPDF(file, pdf);
  } else {
    return convertDocumentToPDF(file, pdf);
  }
};

const convertImageToPDF = async (file: File, pdf: jsPDF): Promise<string> => {
  const dataUrl = await readFileAsDataURL(file);
  
  return new Promise(async (resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        // Get PDF page dimensions
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);
        
        // Original image dimensions
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;
        
        // Calculate aspect ratio
        const aspectRatio = originalWidth / originalHeight;
        
        // Calculate display dimensions to fit page while maintaining aspect ratio
        let displayWidth = originalWidth;
        let displayHeight = originalHeight;
        
        if (displayWidth > maxWidth) {
          displayWidth = maxWidth;
          displayHeight = displayWidth / aspectRatio;
        }
        
        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = displayHeight * aspectRatio;
        }
        
        // Create high-resolution canvas - use much higher scale for better quality
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        // Use high DPI scaling - increase canvas resolution significantly
        const dpiScale = 4; // Increase from 2 to 4 for much better quality
        canvas.width = originalWidth * dpiScale;
        canvas.height = originalHeight * dpiScale;
        
        // Scale the context to match the DPI
        ctx.scale(dpiScale, dpiScale);
        
        // Enable highest quality rendering settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Additional quality settings
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw image at original size with high quality
        ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
        
        // Convert to highest quality data URL
        const format = file.type.includes('png') ? 'image/png' : 'image/jpeg';
        const quality = format === 'image/jpeg' ? 1.0 : undefined; // Maximum quality
        const imgData = canvas.toDataURL(format, quality);
        
        // Center the image on the PDF page
        const x = (pageWidth - displayWidth) / 2;
        const y = (pageHeight - displayHeight) / 2;
        
        // Add image to PDF with proper format and compression settings
        const pdfFormat = format === 'image/png' ? 'PNG' : 'JPEG';
        
        try {
          pdf.addImage(imgData, pdfFormat, x, y, displayWidth, displayHeight, undefined, 'MEDIUM');
          
          // Perform OCR on the image
          console.log('Starting OCR processing...');
          const worker = await createWorker('eng');
          const ocrResult = await worker.recognize(dataUrl);
          await worker.terminate();
          
          console.log('OCR completed, extracted text:', ocrResult.data.text);
          
          // Add invisible text layer for OCR text
          if (ocrResult.data.text && ocrResult.data.text.trim()) {
            pdf.setTextColor(255, 255, 255, 0); // Make text invisible
            pdf.setFontSize(12);
            
            // Add OCR text as invisible text layer
            if (ocrResult.data.words && ocrResult.data.words.length > 0) {
              ocrResult.data.words.forEach(word => {
                if (word.text && word.bbox) {
                  // Calculate text position relative to the image position on PDF
                  const textX = x + (word.bbox.x0 / originalWidth) * displayWidth;
                  const textY = y + (word.bbox.y0 / originalHeight) * displayHeight;
                  
                  // Calculate font size based on word height
                  const wordHeight = word.bbox.y1 - word.bbox.y0;
                  const fontSize = Math.max(8, (wordHeight / originalHeight) * displayHeight * 0.8);
                  
                  pdf.setFontSize(fontSize);
                  pdf.text(word.text, textX, textY);
                }
              });
            } else {
              // Fallback: add all text at the top of the image
              pdf.text(ocrResult.data.text, x, y + 20);
            }
          }
          
          const pdfBlob = pdf.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          resolve(pdfUrl);
        } catch (error) {
          console.error('Error during PDF generation or OCR:', error);
          // Fallback with different compression if the high-quality version fails
          try {
            pdf.addImage(imgData, pdfFormat, x, y, displayWidth, displayHeight);
            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            resolve(pdfUrl);
          } catch (fallbackError) {
            reject(new Error('Failed to add image to PDF'));
          }
        }
      } catch (error) {
        console.error('Error in image processing:', error);
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous'; // Handle CORS issues
    img.src = dataUrl;
  });
};

const convertDocumentToPDF = async (file: File, pdf: jsPDF): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'txt' || extension === 'html') {
    return convertTextToPDF(file, pdf, extension === 'html');
  } else if (extension === 'doc' || extension === 'docx') {
    // For now, treat as text. In a real application, you'd use libraries like mammoth.js
    return convertTextToPDF(file, pdf, false);
  } else {
    return convertTextToPDF(file, pdf, false);
  }
};

const convertTextToPDF = async (file: File, pdf: jsPDF, isHtml: boolean): Promise<string> => {
  const text = await readFileAsText(file);
  
  if (isHtml) {
    // Create a temporary div to render HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    tempDiv.style.width = '800px';
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '14px';
    tempDiv.style.lineHeight = '1.5';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    
    document.body.appendChild(tempDiv);
    
    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdf.internal.pageSize.getWidth() - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let position = 10;
      const pageHeight = pdf.internal.pageSize.getHeight() - 20;
      
      if (imgHeight > pageHeight) {
        // Split across multiple pages if needed
        let remainingHeight = imgHeight;
        let sourceY = 0;
        
        while (remainingHeight > 0) {
          const currentHeight = Math.min(remainingHeight, pageHeight);
          const currentCanvas = document.createElement('canvas');
          const currentCtx = currentCanvas.getContext('2d');
          
          if (currentCtx) {
            currentCanvas.width = canvas.width;
            currentCanvas.height = (currentHeight * canvas.width) / imgWidth;
            
            currentCtx.drawImage(
              canvas,
              0, sourceY,
              canvas.width, (currentHeight * canvas.width) / imgWidth,
              0, 0,
              canvas.width, (currentHeight * canvas.width) / imgWidth
            );
            
            const currentImgData = currentCanvas.toDataURL('image/png');
            pdf.addImage(currentImgData, 'PNG', 10, position, imgWidth, currentHeight);
            
            remainingHeight -= currentHeight;
            sourceY += (currentHeight * canvas.width) / imgWidth;
            
            if (remainingHeight > 0) {
              pdf.addPage();
              position = 10;
            }
          }
        }
      } else {
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      }
      
      document.body.removeChild(tempDiv);
    } catch (error) {
      document.body.removeChild(tempDiv);
      throw error;
    }
  } else {
    // Handle plain text
    const lines = text.split('\n');
    const pageHeight = pdf.internal.pageSize.getHeight();
    const lineHeight = 6;
    const margin = 20;
    let yPosition = margin;
    
    pdf.setFontSize(12);
    
    for (const line of lines) {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Handle long lines by wrapping them
      const maxLineWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
      const words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = pdf.getTextWidth(testLine);
        
        if (textWidth > maxLineWidth && currentLine) {
          pdf.text(currentLine, margin, yPosition);
          yPosition += lineHeight;
          currentLine = word;
          
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        pdf.text(currentLine, margin, yPosition);
        yPosition += lineHeight;
      }
    }
  }
  
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  return pdfUrl;
};
