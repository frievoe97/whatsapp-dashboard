import React, { ChangeEvent, useMemo, useState, useEffect } from "react";
import { useChat } from "../context/ChatContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// import jsPDF from "jspdf";

interface FileUploadProps {
  onFileUpload: (uploadedFile: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const { messages, setMessages, setIsUploading, darkMode, toggleDarkMode } =
    useChat();

  const [selectedSender, setSelectedSender] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ]);

  const [applyFilters, setApplyFilters] = useState(false);

  const senders = useMemo(() => {
    const uniqueSenders = Array.from(
      new Set(messages.map((msg) => msg.sender))
    );
    return uniqueSenders;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && isInitialLoad) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
      setSelectedSender(senders);
      setIsInitialLoad(false); // Initialisierung abgeschlossen
    }
    // Abhängigkeiten: messages und senders
  }, [messages, senders, isInitialLoad]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMessages([]);
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      if (file) {
        setFileName(file.name);
      } else {
        setFileName("");
      }

      onFileUpload(file);

      // Reset all settings
      setSelectedSender([]); // Temporäres Leeren der Sender
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedWeekdays(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
      setApplyFilters(false);
      setIsInitialLoad(true); // Initialisierungsflag setzen

      setIsUploading(true); // Upload startet

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const fileContent = e.target.result.toString();
          const worker = new Worker(
            new URL("../workers/fileParser.worker.ts", import.meta.url)
          );
          worker.postMessage(fileContent);
          worker.onmessage = (event) => {
            setMessages(event.data);
            worker.terminate();
            setIsUploading(false); // Upload beendet
          };
        }
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const handleSenderChange = (sender: string) => {
    setSelectedSender((prev) =>
      prev.includes(sender)
        ? prev.filter((s) => s !== sender)
        : [...prev, sender]
    );
  };

  const handleWeekdayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const day = event.target.value;
    setSelectedWeekdays((prev) =>
      event.target.checked ? [...prev, day] : prev.filter((d) => d !== day)
    );
  };

  const handleApplyFilters = () => setApplyFilters(true);

  const handleSelectAllWeekdays = () =>
    setSelectedWeekdays(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

  const handleDeselectAllWeekdays = () => setSelectedWeekdays([]);

  const handleResetFilters = () => {
    setSelectedSender(senders);
    setSelectedWeekdays(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    if (messages.length > 0) {
      const firstMessageDate = new Date(messages[0].date);
      const lastMessageDate = new Date(messages[messages.length - 1].date);
      setStartDate(firstMessageDate);
      setEndDate(lastMessageDate);
    }
  };

  const handleDeleteFile = () => {
    setMessages([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedSender([]);
    setSelectedWeekdays([]);
    setIsUploading(false); // Reset upload status
  };

  useEffect(() => {
    if (applyFilters) {
      console.log("Applying filters...");
      console.log("Sender:", selectedSender);
      const filteredMessages = messages.map((msg) => {
        const messageDate = new Date(msg.date);
        const messageDay = messageDate.toLocaleString("en-US", {
          weekday: "short",
        });

        const isWithinDateRange =
          (!startDate || messageDate >= startDate) &&
          (!endDate || messageDate <= endDate);
        const isSenderSelected = selectedSender.includes(msg.sender);
        const isWeekdaySelected = selectedWeekdays.includes(messageDay);

        const isUsed =
          isWithinDateRange && isSenderSelected && isWeekdaySelected;
        return { ...msg, isUsed };
      });

      setMessages(filteredMessages);
      setApplyFilters(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applyFilters,
    startDate,
    endDate,
    selectedSender,
    selectedWeekdays,
    setMessages,
  ]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // const exportToPDF = (): void => {
  //   console.log("Start exportToPDF");

  //   // Hole beide SVGs
  //   const svg1 = document.getElementById(
  //     "aggregate_plot"
  //   ) as SVGSVGElement | null;
  //   const svg2 = document.getElementById(
  //     "timeline_plot"
  //   ) as SVGSVGElement | null;

  //   if (!svg1 || !svg2) {
  //     console.log("SVGs nicht gefunden, Abbruch");
  //     return;
  //   }

  //   console.log("SVGs gefunden:", { svg1, svg2 });

  //   // Typen für die Callback-Funktion
  //   type ImageCallback = (img: HTMLImageElement) => void;

  //   // Funktion zum Konvertieren von SVG in ein Bild über Canvas
  //   const convertSVGToImage = (
  //     svgElement: SVGSVGElement,
  //     callback: ImageCallback,
  //     scaleFactor: number = 3 // Höherer Scale für bessere Auflösung
  //   ): void => {
  //     console.log("Start convertSVGToImage für SVG:", svgElement.id);

  //     const svgData = new XMLSerializer().serializeToString(svgElement);
  //     console.log("SVG serialisiert");

  //     const svgBlob = new Blob([svgData], {
  //       type: "image/svg+xml;charset=utf-8",
  //     });
  //     const url = URL.createObjectURL(svgBlob);
  //     console.log("Blob erstellt und URL erzeugt:", url);

  //     const img = new Image();
  //     const { width, height } = svgElement.getBoundingClientRect();
  //     img.width = width * scaleFactor; // Skalieren für höhere Auflösung
  //     img.height = height * scaleFactor; // Skalieren für höhere Auflösung
  //     console.log("Bildgrößen berechnet:", {
  //       width: img.width,
  //       height: img.height,
  //     });

  //     img.onload = () => {
  //       console.log("Bild geladen für SVG:", svgElement.id);

  //       const canvas = document.createElement("canvas");
  //       canvas.width = img.width || 1; // Sicherstellen, dass die Breite > 0 ist
  //       canvas.height = img.height || 1; // Sicherstellen, dass die Höhe > 0 ist

  //       const ctx = canvas.getContext("2d");
  //       if (ctx) {
  //         console.log("Canvas Kontext gefunden, Zeichnen des Bildes");
  //         ctx.fillStyle = "#FFFFFF"; // Hintergrund weiß setzen, falls benötigt
  //         ctx.fillRect(0, 0, canvas.width, canvas.height);
  //         ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Skalierte Zeichnung

  //         const imgData = canvas.toDataURL("image/png");
  //         console.log("Canvas zu PNG konvertiert");

  //         const newImg = new Image();
  //         newImg.src = imgData;
  //         callback(newImg);
  //       }

  //       URL.revokeObjectURL(url); // URL wieder freigeben
  //       console.log("URL freigegeben");
  //     };

  //     img.onerror = (error) => {
  //       console.error("Fehler beim Laden des Bildes:", error);
  //     };

  //     img.src = url;
  //   };

  //   // PDF-Instanz erstellen (Hochformat, A4)
  //   const pdf = new jsPDF({
  //     orientation: "portrait", // Kann auch auf "landscape" gesetzt werden
  //     unit: "pt", // Maßeinheit in Punkten
  //     format: "a4", // A4-Format
  //   });
  //   console.log("PDF-Instanz erstellt");

  //   // Plot 1 in die PDF einfügen
  //   convertSVGToImage(
  //     svg1,
  //     (img1: HTMLImageElement) => {
  //       console.log("Plot 1 wird zur PDF hinzugefügt");

  //       const plot1Width = 500; // Breite des Plots
  //       const plot1Height = (img1.height / img1.width) * plot1Width || 500; // Höhe des Plots basierend auf der Breite
  //       console.log("Plot 1 Größe berechnet:", { plot1Width, plot1Height });

  //       // Überprüfen, ob Höhe und Breite gültige Werte haben
  //       if (plot1Width > 0 && plot1Height > 0) {
  //         // Überschrift für Plot 1 hinzufügen
  //         pdf.setFontSize(16);
  //         pdf.text("Aggregate Plot", 40, 40); // Überschrift für Plot 1
  //         console.log("Überschrift für Plot 1 hinzugefügt");

  //         // Plot 1 hinzufügen
  //         pdf.addImage(img1, "PNG", 40, 60, plot1Width, plot1Height); // x, y, width, height
  //         console.log("Plot 1 zur PDF hinzugefügt");
  //       }

  //       // Plot 2 in die PDF einfügen
  //       convertSVGToImage(svg2, (img2: HTMLImageElement, scaleFactor = 3) => {
  //         console.log("Plot 2 wird zur PDF hinzugefügt");

  //         const plot2Width = 500;
  //         const plot2Height = (img2.height / img2.width) * plot2Width || 500;
  //         console.log("Plot 2 Größe berechnet:", { plot2Width, plot2Height });

  //         // Überprüfen, ob Höhe und Breite gültige Werte haben
  //         if (plot2Width > 0 && plot2Height > 0) {
  //           // Überschrift für Plot 2 hinzufügen
  //           pdf.setFontSize(16);
  //           pdf.text("Timeline Plot", 40, 80 + plot1Height); // Überschrift für Plot 2, unterhalb des ersten Plots
  //           console.log("Überschrift für Plot 2 hinzugefügt");

  //           // Plot 2 hinzufügen
  //           pdf.addImage(
  //             img2,
  //             "PNG",
  //             40,
  //             100 + plot1Height,
  //             plot2Width,
  //             plot2Height
  //           );
  //           console.log("Plot 2 zur PDF hinzugefügt");
  //         }

  //         // PDF als Datei speichern
  //         try {
  //           pdf.save("plots.pdf");
  //           console.log("PDF erfolgreich gespeichert");
  //         } catch (error) {
  //           console.error("Fehler beim Speichern der PDF:", error);
  //         }
  //       });
  //     },
  //     3
  //   ); // Skalierungsfaktor 3 für höhere Auflösung der Bilder
  // };

  return (
    <div
      className={`border ${
        darkMode ? "border-white" : "border-black"
      } p-4 file-upload grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ${
        darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
      }`}
    >
      {/* a) File Upload + Delete File */}
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row space-x-2">
          <div className="w-full flex flew-row">
            <label
              htmlFor="file-upload"
              className={`cursor-pointer text-sm px-4 py-2 border ${
                darkMode
                  ? "border-white bg-gray-700 text-white"
                  : "border-black bg-white text-black"
              } hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 inline-block`}
            >
              Datei auswählen
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {/* Anzeige des Dateinamens */}
            {fileName && (
              <p className="mt-2 text-sm ml-4">
                {darkMode ? (
                  <span className="text-white">{fileName}</span>
                ) : (
                  <span className="text-black">{fileName}</span>
                )}
              </p>
            )}
          </div>

          <button
            onClick={handleDeleteFile}
            className={`px-4 py-1 text-sm rounded-none border ${
              darkMode
                ? "border-white hover:border-white"
                : "border-black hover:border-black"
            } w-full ${
              darkMode ? "bg-gray-700 text-white " : "bg-white text-black "
            }`}
          >
            Delete File
          </button>
        </div>
      </div>

      {/* f) Dark Mode Toggle */}
      <div className="flex flex-col space-y-2 md:justify-end">
        <button
          onClick={toggleDarkMode}
          className={`px-4 py-1 h-full text-sm rounded-none border ${
            darkMode
              ? "border-white hover:border-white"
              : "border-black hover:border-black"
          } w-full ${
            darkMode ? "bg-gray-700 text-white " : "bg-white text-black "
          }`}
        >
          Switch to {darkMode ? "Light" : "Dark"} Mode
        </button>
      </div>

      {/* Render rest of the filters only if messages.length > 0 */}
      {messages.length > 0 && (
        <>
          {/* b) Select Senders */}
          <div className="flex flex-col space-y-2">
            <h3 className="text-md font-semibold">Select Senders:</h3>
            <div className="flex flex-wrap gap-2">
              {senders.map((sender) => (
                <button
                  key={sender}
                  onClick={() => handleSenderChange(sender)}
                  className={`px-3 py-1 text-sm border rounded-none w-auto ${
                    darkMode
                      ? "border-white hover:border-white"
                      : "border-black hover:border-black"
                  } ${
                    selectedSender.includes(sender)
                      ? darkMode
                        ? "bg-white text-black"
                        : "bg-black text-white"
                      : darkMode
                      ? "text-white "
                      : "text-black "
                  }`}
                >
                  {sender}
                </button>
              ))}
            </div>
          </div>

          {/* c) Select Start and End Date */}
          <div className="flex flex-col space-y-2">
            <h3 className="text-md font-semibold">Select Date:</h3>
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex flex-col">
                <label className="text-sm mb-1">Start Date:</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) =>
                    setStartDate(date || undefined)
                  }
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className={`p-2 border ${
                    darkMode
                      ? "border-white hover:border-white"
                      : "border-black hover:border-black"
                  } w-full ${
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                  }`}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm mb-1">End Date:</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) =>
                    setEndDate(date || undefined)
                  }
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  className={`p-2 border ${
                    darkMode ? "border-white" : "border-black"
                  } w-full ${
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* d) Select Weekdays, Select All, Deselect All */}
          <div className="flex flex-col space-y-2">
            <h3 className="text-md font-semibold">Select Weekdays:</h3>
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex flex-wrap gap-0">
                {weekdays.map((day) => (
                  <label
                    key={day}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    {/* Versteckte native Checkbox */}
                    <input
                      type="checkbox"
                      value={day}
                      checked={selectedWeekdays.includes(day)}
                      onChange={handleWeekdayChange}
                      className="hidden"
                    />

                    {/* Benutzerdefinierte Checkbox */}
                    <span
                      className={`flex items-center justify-center w-4 h-4 border ${
                        darkMode ? "border-white" : "border-black"
                      } rounded-none relative`}
                    >
                      {/* Haken-SVG */}
                      {selectedWeekdays.includes(day) && (
                        <svg
                          className={`w-3 h-3 ${
                            darkMode ? "text-white" : "text-black"
                          }`}
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M2 8L6 12L14 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>

                    {/* Label-Text */}
                    <span
                      className={`text-sm ${
                        darkMode ? "text-white" : "text-black"
                      }`}
                    >
                      {day}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAllWeekdays}
                  className={`px-3 py-1 text-sm rounded-none border ${
                    darkMode
                      ? "border-white hover:border-white"
                      : "border-black hover:border-black"
                  } w-auto ${
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                  }`}
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAllWeekdays}
                  className={`px-3 py-1 text-sm border ${
                    darkMode
                      ? "border-white hover:border-white"
                      : "border-black hover:border-black"
                  } rounded-none w-auto ${
                    darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
                  }`}
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* e) Reset and Apply */}
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4 mt-auto">
            <button
              onClick={handleResetFilters}
              className={`px-4 py-2 text-sm border ${
                darkMode
                  ? "border-white hover:border-white"
                  : "border-black hover:border-black"
              } rounded-none w-full ${
                darkMode ? "bg-gray-700 text-white" : "bg-white text-black"
              }`}
            >
              Reset
            </button>
            <button
              onClick={handleApplyFilters}
              className={`px-4 py-2 text-sm border ${
                darkMode
                  ? "border-white hover:border-white"
                  : "border-black hover:border-black"
              } rounded-none w-full ${
                darkMode ? "bg-white text-black" : "bg-black text-white"
              }`}
            >
              Apply
            </button>
          </div>

          {/* g) Export to PDF */}
          {/* <button
            onClick={exportToPDF}
            className={`px-4 py-1 h-full text-sm rounded-none border ${
              darkMode
                ? "border-white hover:border-white"
                : "border-black hover:border-black"
            } w-full ${
              darkMode ? "bg-gray-700 text-white " : "bg-white text-black "
            }`}
          >
            Export Plot as PNG
          </button> */}
        </>
      )}
    </div>
  );
};

export default FileUpload;
