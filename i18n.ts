import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
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
        selectSenders: 'Absender auswählen',
        minimumMessageShare: 'Mindestanteil an Nachrichten (%)',
        startDate: 'Startdatum',
        endDate: 'Enddatum',
        selectWeekdays: 'Wochentage auswählen',
        reset: 'Zurücksetzen',
        apply: 'Anwenden',
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
