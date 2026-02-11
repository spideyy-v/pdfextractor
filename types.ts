
export interface PDFPagePreview {
  index: number;
  thumbnail: string;
  textContent: string;
}

export interface PDFData {
  name: string;
  size: number;
  pages: PDFPagePreview[];
  rawBytes: Uint8Array;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  PROCESSING = 'PROCESSING'
}
