interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div className="p-4 fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div
        className={`p-6 rounded-none shadow-lg max-w-md w-full ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <h2 className="text-lg font-semibold mb-8">Info & Disclaimer</h2>

        <p className="mb-3">
          This tool <strong>does not store any data on a server</strong>. All
          information remains only in your browser. No messages or statistics
          are uploaded.
        </p>

        <p className="mb-3">
          This project is <strong>Open Source</strong>, and the entire source
          code is publicly available on{" "}
          <a
            href="https://github.com/frievoe97/whatsapp-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className={`no-underline ${
              darkMode ? "text-white" : "text-black"
            } hover:text-inherit`}
          >
            GitHub
          </a>
          .
        </p>

        <p>
          This project is licensed under the <strong>MIT License</strong>, one
          of the most open and permissive licenses available. This means you are{" "}
          <strong>free to use, modify, and distribute</strong> the code, as long
          as the license is included.
        </p>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 border rounded-none 
                ${
                  darkMode
                    ? "border-white hover:border-gray-300 active:bg-gray-600"
                    : "border-black hover:border-gray-700 active:bg-gray-300"
                } 
                ${darkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
