import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, darkMode }) => {
  const [page, setPage] = useState(1);
  const totalPages = 3;

  if (!isOpen) return null;

  const nextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="p-4 fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 text-sm">
      <div
        className={`p-6 border rounded-none shadow-lg max-w-md w-full relative ${
          darkMode
            ? "bg-gray-800 text-white border-white"
            : "bg-white text-black border-black"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 border rounded-none active:opacity-80"
        >
          <X size={20} />
        </button>

        {page === 1 && (
          <h2 className="text-lg font-semibold mb-6">Info & Disclaimer</h2>
        )}
        {page === 2 && (
          <h2 className="text-lg font-semibold mb-6">How to Export Chats</h2>
        )}
        {page === 3 && (
          <h2 className="text-lg font-semibold mb-6">Menu Explanation</h2>
        )}

        <div className="mb-4">
          {page === 1 && (
            <>
              <p className="mb-3">
                This tool does not store any data on a server. All information
                remains only in your browser. No messages or statistics are
                uploaded.
              </p>
              <p className="mb-3">
                This project is Open Source, and the entire source code is
                publicly available on
                <a
                  href="https://github.com/frievoe97/whatsapp-dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`no-underline ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {" "}
                  GitHub
                </a>
                .
              </p>
              <p>
                This project is licensed under the MIT License. You are free to
                use, modify, and distribute the code, as long as the license is
                included.
              </p>
            </>
          )}
          {page === 2 && (
            <>
              <p className="mb-3">
                To export a chat from WhatsApp without media, follow these
                steps:
              </p>
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
              <p className="mt-3">
                You can upload the .txt file here via "Select File".
              </p>
            </>
          )}
          {page === 3 && (
            <>
              <p className="mb-3">
                The menu allows you to configure the following settings:
              </p>
              <ul className="list-disc list-inside">
                <li>
                  <strong>Dark Mode:</strong> Toggle between light and dark
                  themes.
                </li>
                <li>
                  <strong>Date Filters:</strong> Select a start and end date to
                  filter messages.
                </li>
                <li>
                  <strong>Sender Selection:</strong> Choose specific
                  participants whose messages should be included.
                </li>
                <li>
                  <strong>Weekday Selection:</strong> Filter messages by the
                  days they were sent.
                </li>
                <li>
                  <strong>Minimum Message Share:</strong> Set a threshold for
                  sender message percentage.
                </li>
              </ul>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={prevPage}
            className={`p-2 border rounded-none active:bg-gray-300 dark:active:bg-gray-600 ${
              darkMode ? "border-white" : "border-black"
            } ${page === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={page === 1}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={nextPage}
            className={`p-2 border rounded-none active:bg-gray-300 dark:active:bg-gray-600 ${
              darkMode ? "border-white" : "border-black"
            } ${page === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={page === totalPages}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
