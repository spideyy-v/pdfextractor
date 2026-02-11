
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm';
import { PDFDocument } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';
import { PDFData, PDFPagePreview } from '../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

export const parsePDF = async (file: File): Promise<PDFData> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const pages: PDFPagePreview[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;
      const thumbnail = canvas.toDataURL('image/webp', 0.8);
      
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      
      pages.push({
        index: i - 1,
        thumbnail,
        textContent: text
      });
    }
  }

  return {
    name: file.name,
    size: file.size,
    pages,
    rawBytes: bytes
  };
};

export const extractPages = async (originalBytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const newPdfDoc = await PDFDocument.create();
  
  const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
  copiedPages.forEach((page) => newPdfDoc.addPage(page));
  
  return await newPdfDoc.save();
};
