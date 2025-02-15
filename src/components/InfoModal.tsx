import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface InfoModalProps {
  /** Determines if the modal is visible */
  isOpen: boolean;
  /** Callback function invoked when the modal is closed */
  onClose: () => void;
  /** Toggle dark mode styling */
  darkMode: boolean;
}

/**
 * Interface to define the structure of each modal page.
 */
interface ModalPage {
  /** The header title of the page */
  title: string;
  /** The content (as JSX) of the page */
  content: JSX.Element;
}

/**
 * InfoModal Component
 *
 * This modal displays multiple pages of information (such as an Info/Disclaimer,
 * instructions on exporting chats, and a menu explanation). It includes navigation
 * controls to move between pages and supports dark mode styling.
 *
 * All current features of the original component have been retained.
 */
const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, darkMode }) => {
  // Using 0-based index for pages. (Display value is index + 1.)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Define the content for each page in an array
  const pages: ModalPage[] = [
    {
      title: 'Info & Disclaimer',
      content: (
        <>
          <p className="mb-3">
            This tool does not store any data on a server. All information remains only in your
            browser. No messages or statistics are uploaded.
          </p>
          <p className="mb-3">
            This project is Open Source, and the entire source code is publicly available on
            <a
              href="https://github.com/frievoe97/whatsapp-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className={`no-underline ${darkMode ? 'text-white' : 'text-black'}`}
            >
              {' '}
              GitHub
            </a>
            .
          </p>
          <p>
            This project is licensed under the MIT License. You are free to use, modify, and
            distribute the code, as long as the license is included.
          </p>
        </>
      ),
    },
    {
      title: 'How to Export Chats',
      content: (
        <>
          <p className="mb-3">To export a chat from WhatsApp without media, follow these steps:</p>
          <h3 className="font-semibold">iOS:</h3>
          <ol className="list-decimal ml-4 mb-3">
            <li>Open WhatsApp and go to the chat you want to export.</li>
            <li>Tap on the contact or group name at the top.</li>
            <li>Scroll down and select "Export Chat".</li>
            <li>Choose "Without Media" when prompted.</li>
            <li>Save or share the exported .txt file.</li>
          </ol>
          <h3 className="font-semibold">Android:</h3>
          <ol className="list-decimal ml-4">
            <li>Open WhatsApp and go to the chat you want to export.</li>
            <li>Tap on the three dots (menu) in the top right corner.</li>
            <li>Select "More" and then "Export Chat".</li>
            <li>Choose "Without Media" when prompted.</li>
            <li>Save or share the exported .txt file.</li>
          </ol>
          <p className="mt-3">You can upload the .txt file here via "Select File".</p>
        </>
      ),
    },
    {
      title: 'Menu Explanation',
      content: (
        <>
          <p className="mb-3">The menu allows you to configure the following settings:</p>
          <ul className="list-disc list-inside">
            <li>
              <strong>Dark Mode:</strong> Toggle between light and dark themes.
            </li>
            <li>
              <strong>Date Filters:</strong> Select a start and end date to filter messages.
            </li>
            <li>
              <strong>Sender Selection:</strong> Choose specific participants whose messages should
              be included.
            </li>
            <li>
              <strong>Weekday Selection:</strong> Filter messages by the days they were sent.
            </li>
            <li>
              <strong>Minimum Message Share:</strong> Set a threshold for sender message percentage.
            </li>
          </ul>
        </>
      ),
    },
  ];

  // Calculate the total number of pages dynamically
  const totalPages = pages.length;

  /**
   * Advances to the next page if not already at the last page.
   */
  const goToNextPage = () => {
    setCurrentPageIndex((prevIndex) => Math.min(prevIndex + 1, totalPages - 1));
  };

  /**
   * Goes back to the previous page if not already at the first page.
   */
  const goToPreviousPage = () => {
    setCurrentPageIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  // If the modal is not open, do not render anything
  if (!isOpen) return null;

  // Define common class names based on the darkMode prop
  const modalBgClasses = darkMode
    ? 'bg-gray-800 text-white border-white'
    : 'bg-white text-black border-black';
  const borderClasses = darkMode ? 'border-white' : 'border-black';

  return (
    <div className="p-4 fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 text-sm">
      <div
        className={`p-6 border rounded-none shadow-lg max-w-md w-full relative ${modalBgClasses}`}
      >
        {/* Close button */}
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
