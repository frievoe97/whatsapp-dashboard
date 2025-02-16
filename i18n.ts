import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      General: {
        noDataAvailable: 'No Data Available.',
      },
      App: {
        placeholder: 'Please upload a WhatsApp chat using "Select File".',
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
            '<p class=\'mb-3\'>To export a chat from WhatsApp without media, follow these steps:</p><h3 class=\'font-semibold\'>iOS:</h3><ol class=\'list-decimal ml-4 mb-3\'><li>Open WhatsApp and go to the chat you want to export.</li><li>Tap on the contact or group name at the top.</li><li>Scroll down and select "Export Chat".</li><li>Choose "Without Media" when prompted.</li><li>Save or share the exported .txt file.</li></ol><h3 class=\'font-semibold\'>Android:</h3><ol class=\'list-decimal ml-4\'><li>Open WhatsApp and go to the chat you want to export.</li><li>Tap on the three dots (menu) in the top right corner.</li><li>Select "More" and then "Export Chat".</li><li>Choose "Without Media" when prompted.</li><li>Save or share the exported .txt file.</li></ol><p class=\'mt-3\'>You can upload the .txt file here via "Select File".</p>',
        },
        MenuExplanation: {
          title: 'Menu Explanation',
          content:
            "<p class='mb-3'>The menu allows you to configure the following settings:</p><ul class='list-disc list-inside'><li><strong>Dark Mode:</strong> Toggle between light and dark themes.</li><li><strong>Date Filters:</strong> Select a start and end date to filter messages.</li><li><strong>Sender Selection:</strong> Choose specific participants whose messages should be included.</li><li><strong>Weekday Selection:</strong> Filter messages by the days they were sent.</li><li><strong>Minimum Message Share:</strong> Set a threshold for sender message percentage.</li></ul>",
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
      App: {
        placeholder: 'Bitte laden Sie einen WhatsApp-Chat über „Datei auswählen“ hoch.',
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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: navigator.language.split('-')[0] || 'en',
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
  })
  .then(() => console.log('i18n initialized successfully'))
  .catch((err) => console.error('i18n initialization failed:', err));

export default i18n;
