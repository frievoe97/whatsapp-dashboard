/////////////////////// Imports ///////////////////////
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/////////////////////// i18n Resources ///////////////////////
/**
 * i18n resources for different languages.
 */
const resources = {
  en: {
    translation: {
      General: {
        noDataAvailable: 'No Data Available.',
      },
      App: {
        placeholder: 'Please upload a WhatsApp chat using "Select File".',
        title: 'WhatsApp Dashboard – Visualize your Chats',
      },
      FileUpload: {
        selectFile: 'Select File',
        selectSenders: 'Select Senders',
        minimumMessageShare: 'Minimum Message Share (%)',
        startDate: 'Start Date',
        endDate: 'End Date',
        selectWeekdays: 'Select Weekdays',
        reset: 'Reset',
        apply: 'Apply',
        useAbbreviations: 'Use Abbreviations',
        useFullNames: 'Use Full Names',
      },
      InfoModal: {
        InfoAndDisclaimer: {
          title: 'Info & Disclaimer',
          content:
            "<p class='mb-3'>This tool does not store any data on a server. All information remains only in your browser. No messages or statistics are uploaded.</p><p class='mb-3'>This project is Open Source, and the entire source code is publicly available on <a href='https://github.com/frievoe97/whatsapp-dashboard' target='_blank' rel='noopener noreferrer' class='no-underline no-underline text-current hover:text-current'>GitHub</a>.</p><p>This project is licensed under the MIT License. You are free to use, modify, and distribute the code, as long as the license is included.</p>",
        },
        HowToExportChats: {
          title: 'How to Export Chats',
          content:
            "<style>ol { list-style-type: disc; }</style><p class='mb-3'>How to export a WhatsApp chat without media:</p><h3 class='font-semibold'>iOS:</h3><ol class='list-decimal ml-4 mb-3'><li>Open the chat.</li><li>Tap the contact or group name.</li><li>Select “Export Chat”.</li><li>Choose “Without Media” when prompted.</li><li>Save or share the .txt file.</li></ol><h3 class='font-semibold'>Android:</h3><ol class='list-decimal ml-4'><li>Open the chat.</li><li>Tap the menu (three dots).</li><li>Select “More” > “Export Chat”.</li><li>Choose “Without Media” when prompted.</li><li>Save or share the .txt file.</li></ol><p class='mt-3'>Upload the .txt file here.</p>",
        },
        MenuExplanation: {
          title: 'Menu Explanation',
          content:
            "<p class='mb-3'>Configure these settings:</p><ul class='list-disc list-inside'><li><strong>Dark Mode:</strong> Switch between light and dark theme.</li><li><strong>Date Filter:</strong> Select time range.</li><li><strong>Sender Selection:</strong> Choose participants.</li><li><strong>Weekday Filter:</strong> Filter by days.</li><li><strong>Minimum Share:</strong> Set message percentage limit.</li></ul>",
        },
      },
      Emoji: {
        title: 'Top 10 Emojis for Person',
      },
      Heatmap: {
        title: 'Messages By',
      },
      Sentiment: {
        title: 'Sentiment Analysis over Time',
      },
      SentimentWord: {
        title: ['Top 10 ', '{{wordCategory}}', ' Words per Person'],
        best: 'Best',
        worst: 'Worst',
      },
      WordCount: {
        title: 'Top 10 Words per Person',
      },
      ChordDiagram: {
        title: 'Who Replies to Whom (Top ',
      },
      Stats: {
        title: 'Message Statistics per Person',
      },
    },
  },
  de: {
    translation: {
      General: {
        noDataAvailable: 'Keine Daten verfügbar.',
      },
      App: {
        placeholder: 'Bitte laden Sie einen WhatsApp-Chat über „Datei auswählen“ hoch.',
        title: 'WhatsApp Dashboard – Visualisieren Sie Ihre Chats',
      },
      FileUpload: {
        selectFile: 'Datei auswählen',
        selectSenders: 'Absender',
        minimumMessageShare: 'Mindestanteil',
        startDate: 'Startdatum',
        endDate: 'Enddatum',
        selectWeekdays: 'Wochentage',
        reset: 'Zurücksetzen',
        apply: 'Anwenden',
        useAbbreviations: 'Abkürzungen',
        useFullNames: 'Vollständige Namen',
      },
      InfoModal: {
        InfoAndDisclaimer: {
          title: 'Informationen',
          content:
            "<p class='mb-3'>Dieses Tool speichert keine Daten auf einem Server. Alle Informationen bleiben nur in Ihrem Browser. Es werden keine Nachrichten oder Statistiken hochgeladen.</p><p class='mb-3'>Dieses Projekt ist Open Source, und der gesamte Quellcode ist öffentlich auf <a href='https://github.com/frievoe97/whatsapp-dashboard' target='_blank' rel='noopener noreferrer' class='no-underline no-underline text-current hover:text-current'>GitHub</a> verfügbar.</p><p>Dieses Projekt steht unter der MIT-Lizenz. Sie dürfen den Code frei nutzen, modifizieren und verbreiten, solange die Lizenz enthalten bleibt.</p>",
        },
        HowToExportChats: {
          title: 'So exportieren Sie Chats',
          content:
            "<style>ol { list-style-type: disc; }</style><p class='mb-3'>So exportieren Sie einen WhatsApp-Chat ohne Medien:</p><h3 class='font-semibold'>iOS:</h3><ol class='list-decimal ml-4 mb-3'><li>Chat öffnen.</li><li>Auf Namen tippen.</li><li>„Chat exportieren“ wählen.</li><li>„Ohne Medien“ auswählen.</li><li>.txt-Datei speichern oder teilen.</li></ol><h3 class='font-semibold'>Android:</h3><ol class='list-decimal ml-4'><li>Chat öffnen.</li><li>Menü (drei Punkte) tippen.</li><li>„Mehr“ > „Chat exportieren“.</li><li>„Ohne Medien“ auswählen.</li><li>.txt-Datei speichern oder teilen.</li></ol><p class='mt-3'>Laden Sie die .txt-Datei hier hoch.</p>",
        },
        MenuExplanation: {
          title: 'Menüerklärung',
          content:
            "<p class='mb-3'>Konfigurieren Sie diese Einstellungen:</p><ul class='list-disc list-inside'><li><strong>Dunkler Modus:</strong> Helles/dunkles Design wechseln.</li><li><strong>Datumsfilter:</strong> Zeitraum auswählen.</li><li><strong>Absenderauswahl:</strong> Teilnehmer festlegen.</li><li><strong>Wochentagsauswahl:</strong> Nach Tagen filtern.</li><li><strong>Mindestanteil:</strong> Nachrichtenanteil begrenzen.</li></ul>",
        },
      },
      Emoji: {
        title: 'Top 10 Emojis pro Person',
      },
      Heatmap: {
        title: 'Nachrichten nach',
      },
      Sentiment: {
        title: 'Sentiment-Analyse über die Zeit',
      },
      SentimentWord: {
        title: ['Top 10 ', '{{wordCategory}}', ' Wörter pro Person'],
        best: 'Besten',
        worst: 'Schlechtesten',
      },
      WordCount: {
        title: 'Top 10 Wörter pro Person',
      },
      ChordDiagram: {
        title: 'Wer antwortet wem (Top ',
      },
      Stats: {
        title: 'Nachrichtenstatistik pro Person',
      },
    },
  },
  fr: {
    translation: {
      App: {
        placeholder:
          'Veuillez télécharger une conversation WhatsApp en utilisant "Sélectionner un fichier".',
      },
      FileUpload: {
        selectFile: 'TODO',
        selectSenders: 'TODO',
        minimumMessageShare: 'TODO',
        startDate: 'TODO',
        endDate: 'TODO',
        selectWeekdays: 'TODO',
        reset: 'TODO',
        apply: 'TODO',
      },
    },
  },
  es: {
    translation: {
      App: {
        placeholder: 'Por favor, sube un chat de WhatsApp usando "Seleccionar archivo".',
      },
      FileUpload: {
        selectFile: 'TODO',
        selectSenders: 'TODO',
        minimumMessageShare: 'TODO',
        startDate: 'TODO',
        endDate: 'TODO',
        selectWeekdays: 'TODO',
        reset: 'TODO',
        apply: 'TODO',
      },
    },
  },
  zh: {
    translation: {
      App: {
        placeholder: '请使用“选择文件”上传WhatsApp聊天记录。',
      },
      FileUpload: {
        selectFile: 'TODO',
        selectSenders: 'TODO',
        minimumMessageShare: 'TODO',
        startDate: 'TODO',
        endDate: 'TODO',
        selectWeekdays: 'TODO',
        reset: 'TODO',
        apply: 'TODO',
      },
    },
  },
};

/////////////////////// i18n Initialization ///////////////////////
/**
 * Initialize the i18n instance with the react-i18next plugin.
 *
 * - Uses the resources defined above.
 * - Sets the initial language based on the browser's language (fallback to 'en').
 * - Specifies a fallback language ('en') if the chosen language is not available.
 * - Uses 'translation' as the default namespace.
 * - Disables escaping in interpolation since React already handles it.
 */
i18n
  .use(initReactI18next) // Passes i18n down to react-i18next.
  .init({
    resources,
    lng: navigator.language.split('-')[0] || 'en', // Use browser language or default to English.
    fallbackLng: 'en', // Fallback language in case the detected language is not available.
    defaultNS: 'translation', // Default namespace for translations.
    interpolation: { escapeValue: false }, // React already escapes values.
  })
  .then(() => {
    console.log('i18n initialized successfully');
    console.log('Current language:', i18n.language);
  })
  .catch((err) => console.error('i18n initialization failed:', err));

/////////////////////// Export ///////////////////////
export default i18n;
