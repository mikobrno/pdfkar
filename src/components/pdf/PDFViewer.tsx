import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { ExtractedData, Highlight } from '../../types';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
  extractedData?: ExtractedData[];
  highlights?: Highlight[];
  onHighlightClick?: (highlight: Highlight) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  extractedData = [],
  highlights = [],
  onHighlightClick
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Convert extracted data to highlights for current page
  const pageHighlights = extractedData
    .filter(data => data.bounding_box.page === pageNumber)
    .map(data => ({
      id: data.id,
      content: { text: data.field_value },
      position: {
        boundingRect: {
          x1: data.bounding_box.left,
          y1: data.bounding_box.top,
          x2: data.bounding_box.left + data.bounding_box.width,
          y2: data.bounding_box.top + data.bounding_box.height,
          width: data.bounding_box.width,
          height: data.bounding_box.height
        },
        rects: [{
          x1: data.bounding_box.left,
          y1: data.bounding_box.top,
          x2: data.bounding_box.left + data.bounding_box.width,
          y2: data.bounding_box.top + data.bounding_box.height,
          width: data.bounding_box.width,
          height: data.bounding_box.height
        }],
        pageNumber: data.bounding_box.page
      },
      comment: {
        text: data.field_name,
        emoji: '📄'
      }
    }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-sm text-gray-600 px-3">
            Page {pageNumber} of {numPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-sm text-gray-600 px-2">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={rotate}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="relative overflow-auto max-h-[800px] bg-gray-100">
        <div className="flex justify-center p-4">
          <div className="relative">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              }
              error={
                <div className="text-center p-8 text-red-600">
                  Failed to load PDF. Please try again.
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                className="shadow-lg"
              />
            </Document>

            {/* Highlight Overlays */}
            {pageHighlights.map(highlight => (
              <div
                key={highlight.id}
                className="absolute bg-yellow-300 bg-opacity-30 border-2 border-yellow-400 cursor-pointer hover:bg-opacity-50 transition-opacity"
                style={{
                  left: highlight.position.boundingRect.x1 * scale,
                  top: highlight.position.boundingRect.y1 * scale,
                  width: highlight.position.boundingRect.width * scale,
                  height: highlight.position.boundingRect.height * scale,
                  transform: `rotate(${rotation}deg)`
                }}
                onClick={() => onHighlightClick?.(highlight)}
                title={`${highlight.comment?.text}: ${highlight.content.text}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};