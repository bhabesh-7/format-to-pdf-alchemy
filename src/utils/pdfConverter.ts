import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Get PDF page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);
      
      // Original image dimensions
      let imgWidth = img.naturalWidth || img.width;
      let imgHeight = img.naturalHeight || img.height;
      
      // Calculate aspect ratio
      const aspectRatio = imgWidth / imgHeight;
      
      // Scale to fit page while maintaining aspect ratio
      if (imgWidth > maxWidth) {
        imgWidth = maxWidth;
        imgHeight = imgWidth / aspectRatio;
      }
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspectRatio;
      }
      
      // Create high-quality canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      // Set canvas size to maintain quality
      const scale = Math.min(2, Math.max(imgWidth / (img.naturalWidth || img.width), 1));
      canvas.width = imgWidth * scale;
      canvas.height = imgHeight * scale;
      
      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw image with high quality
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to high-quality data URL
      const format = file.type.includes('png') ? 'image/png' : 'image/jpeg';
      const quality = format === 'image/jpeg' ? 0.95 : undefined;
      const imgData = canvas.toDataURL(format, quality);
      
      // Center the image on the PDF page
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      
      // Add image to PDF with proper format
      const pdfFormat = format === 'image/png' ? 'PNG' : 'JPEG';
      pdf.addImage(imgData, pdfFormat, x, y, imgWidth, imgHeight);
      
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      resolve(pdfUrl);
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
