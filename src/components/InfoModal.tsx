//////////////////////////////
// InfoModal Component
// A modal for displaying informational content and disclaimers with multiple pages.
// Users can navigate through the pages using previous/next buttons.
//////////////////////////////

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

//////////////////////////////
// Interfaces
//////////////////////////////

interface InfoModalProps {
  /** Determines if the modal is visible */
  isOpen: boolean;
  /** Callback function invoked when the modal is closed */
  onClose: () => void;
  /** Toggle dark mode styling */
  darkMode: boolean;
}

/**
 * Defines the structure for each modal page.
 */
interface ModalPage {
  /** The header title of the page */
  title: string;
  /** The content (as JSX) of the page */
  content: JSX.Element;
}

//////////////////////////////
// InfoModal Component Implementation
//////////////////////////////

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, darkMode }) => {
  const { t } = useTranslation();

  // 0-based index for the current modal page.
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  //////////////////////////////
  // Define Modal Pages with Translated Content
  //////////////////////////////
  const pages: ModalPage[] = [
    {
      title: t('InfoModal.InfoAndDisclaimer.title'),
      content: (
        <div
          dangerouslySetInnerHTML={{
            __html: t('InfoModal.InfoAndDisclaimer.content'),
          }}
        />
      ),
    },
    {
      title: t('InfoModal.HowToExportChats.title'),
      content: (
        <div
          dangerouslySetInnerHTML={{
            __html: t('InfoModal.HowToExportChats.content'),
          }}
        />
      ),
    },
    {
      title: t('InfoModal.MenuExplanation.title'),
      content: (
        <div
          dangerouslySetInnerHTML={{
            __html: t('InfoModal.MenuExplanation.content'),
          }}
        />
      ),
    },
  ];

  const totalPages = pages.length;

  //////////////////////////////
  // Navigation Functions
  //////////////////////////////

  const goToNextPage = () => {
    setCurrentPageIndex((prevIndex) => Math.min(prevIndex + 1, totalPages - 1));
  };

  const goToPreviousPage = () => {
    setCurrentPageIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  // If the modal is not open, render nothing.
  if (!isOpen) return null;

  // Determine classes based on dark mode.
  const modalBgClasses = darkMode
    ? 'bg-gray-800 text-white border-white'
    : 'bg-white text-black border-black';
  const borderClasses = darkMode ? 'border-white' : 'border-black';

  //////////////////////////////
  // Render Modal
  //////////////////////////////
  return (
    <div className="p-4 fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 text-sm]">
      <div
        className={`p-6 border rounded-none shadow-lg max-w-md w-full relative ${modalBgClasses}`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 border rounded-none active:opacity-80"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <h2 className="text-lg font-semibold mb-6">{pages[currentPageIndex].title}</h2>

        {/* Modal Content */}
        <div className="mb-4">{pages[currentPageIndex].content}</div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={goToPreviousPage}
            disabled={currentPageIndex === 0}
            className={`p-2 border rounded-none active:bg-gray-300 dark:active:bg-gray-600 ${borderClasses} ${
              currentPageIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm">
            Page {currentPageIndex + 1} of {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPageIndex === totalPages - 1}
            className={`p-2 border rounded-none active:bg-gray-300 dark:active:bg-gray-600 ${borderClasses} ${
              currentPageIndex === totalPages - 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
