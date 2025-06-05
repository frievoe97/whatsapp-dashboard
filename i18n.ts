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
      WelcomeScreen: {
        title: 'Welcome to the Chat Visualizer!',
        subtitle: 'Upload your chat and explore interactive visualizations!',
      },
      General: {
        noDataAvailable: 'No Data Available.',
        page: 'Page',
        of: 'of',
      },
      App: {
        placeholder: 'Please upload a WhatsApp chat using "Upload Chat".',
        title: 'Chat Visualizer – Visualize your Chats',
      },
      FileUpload: {
        selectFile: 'Upload Chat',
        useExampleChat: 'Use Example Chat',
        selectSenders: 'Select Senders',
        minimumMessageShare: 'Message Share (%)',
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
          title: 'Information',
          content:
            "<p class='mb-3'>This tool does not store any data on a server. All information remains only in your browser. No messages or statistics are uploaded.</p><p class='mb-3'>This project is open source, and the entire source code is publicly available on <a href='https://github.com/frievoe97/whatsapp-dashboard' target='_blank' rel='noopener noreferrer' class='no-underline text-current hover:text-current'>GitHub</a>.</p><p>This project is licensed under the MIT license. You are free to use, modify, and distribute the code as long as the license is included.</p>",
        },
        HowToExportChats: {
          title: 'How to Export Chats',
          content:
            "<style>ol { list-style-type: disc; }</style><p class='mb-3'>How to export a WhatsApp chat without media:</p><h3 class='font-semibold'>iOS:</h3><ol class='list-decimal ml-4 mb-3'><li>Open the chat.</li><li>Tap on the name.</li><li>Select “Export Chat.”</li><li>Choose “Without Media.”</li><li>Save or share the .txt file.</li></ol><h3 class='font-semibold'>Android:</h3><ol class='list-decimal ml-4'><li>Open the chat.</li><li>Tap on the menu (three dots).</li><li>Go to “More” > “Export Chat.”</li><li>Choose “Without Media.”</li><li>Save or share the .txt file.</li></ol>",
        },
        MenuExplanation: {
          title: 'Menu Explanation',
          content:
            "<p class='mb-3'>Configure these settings:</p><ul class='list-disc list-inside'><li><strong>Date Filter:</strong> Select a time period.</li><li><strong>Sender:</strong> Choose participants.</li><li><strong>Day of the Week Filter:</strong> Filter by specific days.</li><li><strong>Minimum Share:</strong> Limit the share of messages.</li><li><strong>Abbreviations:</strong> Use abbreviations for names.</li></ul>",
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
      ConversationStarter: {
        title: 'Conversation Starters After Long Pauses',
      },
      ChordDiagram: {
        title: 'Response Behavior (Top ',
      },
      Stats: {
        title: 'Message Statistics per Person',
      },
      AggregatePerTimePlot: {
        title: 'Aggregated Messages per',
      },
      Timeline: {
        title: 'Messages by',
      },
    },
  },
  de: {
    translation: {
      WelcomeScreen: {
        title: 'Willkommen beim Chat Visualizer!',
        subtitle: 'Lade deinen Chat hoch und entdecken die interaktiven Visualisierungen!',
      },
      General: {
        noDataAvailable: 'Keine Daten verfügbar.',
        page: 'Seite',
        of: 'von',
      },
      App: {
        placeholder: 'Bitte laden Sie einen WhatsApp-Chat über „Chat hochladen“ hoch.',
        title: 'WhatsApp Dashboard – Visualisieren Sie Ihre Chats',
      },
      FileUpload: {
        selectFile: 'Chat hochladen',
        useExampleChat: 'Beispiel-Chat verwenden',
        selectSenders: 'Absender',
        minimumMessageShare: 'Mindestanteil (%)',
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
            "<style>ol { list-style-type: disc; }</style><p class='mb-3'>So exportieren Sie einen WhatsApp-Chat ohne Medien:</p><h3 class='font-semibold'>iOS:</h3><ol class='list-decimal ml-4 mb-3'><li>Chat öffnen.</li><li>Auf Namen tippen.</li><li>„Chat exportieren“ wählen.</li><li>„Ohne Medien“ auswählen.</li><li>.txt-Datei speichern oder teilen.</li></ol><h3 class='font-semibold'>Android:</h3><ol class='list-decimal ml-4'><li>Chat öffnen.</li><li>Menü (drei Punkte) tippen.</li><li>„Mehr“ > „Chat exportieren“.</li><li>„Ohne Medien“ auswählen.</li><li>.txt-Datei speichern oder teilen.</li></ol>",
        },
        MenuExplanation: {
          title: 'Menüerklärung',
          content:
            "<p class='mb-3'>Konfigurieren Sie diese Einstellungen:</p><ul class='list-disc list-inside'><li><strong>Datumsfilter:</strong> Zeitraum auswählen.</li><li><strong>Absender:</strong> Teilnehmer festlegen.</li><li><strong>Wochentagsauswahl:</strong> Nach Tagen filtern.</li><li><strong>Mindestanteil:</strong> Nachrichtenanteil begrenzen.</li><li><strong>Abkürzungen:</strong>Verwende Abkürzungen für die Namen</li></ul>",
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
      ConversationStarter: {
        title: 'Konversationsstarter nach langen Pausen',
      },
      ChordDiagram: {
        title: 'Antwortverhalten (Top ',
      },
      Stats: {
        title: 'Nachrichtenstatistik pro Person',
      },
      BarChartComp: {
        title: ' pro Person',
      },
      AggregatePerTimePlot: {
        title: 'Aggregierte Nachrichten pro',
      },
      Timeline: {
        title: 'Nachrichten nach',
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
  .then(() => {})
  .catch((err) => console.error('i18n initialization failed:', err));

/////////////////////// Export ///////////////////////
export default i18n;
