////////////////////// Constants ////////////////////////

export const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

////////////////////// Enum: SenderStatus ////////////////////////

/**
 * Enum representing the possible status values for a message sender.
 */
export enum SenderStatus {
  ACTIVE = 'active', // Eligible and active (Status 1)
  MANUAL_INACTIVE = 'manual_inactive', // Eligible but manually deactivated (Status 2)
  LOCKED = 'locked', // Ineligible due to insufficient message percentage (Status 3)
}

// -------------
// React-Select Styles
// -------------
export const getCustomSelectStyles = (darkMode: boolean) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: (provided: any) => ({
    ...provided,
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    display: 'flex',
    // flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: '4px',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    marginRight: '4px',
    flexWrap: 'nowrap',
    height: '100%',
    // height: 'fit-content',
    // alignItems: 'center',
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '0px',
    flex: '1 1 auto',
    height: 'fit-content',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dropdownIndicator: (provided: any) => ({
    ...provided,
    padding: '0px',
    marginLeft: '1px',
    marginRight: '-2px',
    color: darkMode ? 'white' : 'black',
    // height: 'fit-content',
  }),
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // indicatorsContainer: (provided: any) => ({
  //   ...provided,
  //   height: 'fit-content',
  // }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: darkMode ? '#333' : 'white',
    color: darkMode ? 'white' : 'black',
    boxShadow: 'none',
    width: 'auto',
    minWidth: 'fit-content',
    border: darkMode ? '1px solid white' : '1px solid black',
    borderRadius: '0',
    fontSize: '0.9rem',
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isHover
      ? darkMode
        ? '#777'
        : '#ddd'
      : window.innerWidth >= 768 && state.isFocused && state.selectProps.menuIsOpen
        ? darkMode
          ? '#555'
          : '#eee'
        : darkMode
          ? '#333'
          : 'white',
    color: darkMode ? 'white' : 'black',
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  singleValue: (provided: any) => ({
    ...provided,
    color: darkMode ? 'white' : 'black',
  }),
});

export const LOCALES = {
  en: {
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    monthShort: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    sentiment: ['Best', 'Worst'],
    interval: ['Hour', 'Day', 'Month', 'Year', 'Weekday'],
    stats: {
      numberOfMessages: 'Number of Messages',
      averageWordsPerMessage: 'Avg. Words per Message',
      medianWordsPerMessage: 'Median Words per Message',
      totalWordsSent: 'Total Words Sent',
      maxWordsInMessage: 'Max Words in a Message',
      activeDays: 'Active Days',
      uniqueWordsCount: 'Unique Words Count',
      avgCharactersPerMessage: 'Avg. Characters per Message',
      firstMessage: 'First Message',
      lastMessage: 'Last Message',
    },
  },
  de: {
    weekdays: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
    weekdaysShort: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    months: [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ],
    monthShort: [
      'Jan',
      'Feb',
      'Mär',
      'Apr',
      'Mai',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Okt',
      'Nov',
      'Dez',
    ],
    sentiment: ['Besten', 'Schlechtesten'],
    interval: ['Stunde', 'Tag', 'Monat', 'Jahr', 'Tag'], // interval[4] means 'Weekday'
    stats: {
      numberOfMessages: 'Anzahl der Nachrichten',
      averageWordsPerMessage: 'Durchschn. Wörter pro Nachricht',
      medianWordsPerMessage: 'Median Wörter pro Nachricht',
      totalWordsSent: 'Gesendete Wörter insgesamt',
      maxWordsInMessage: 'Maximale Wörter in einer Nachricht',
      activeDays: 'Aktive Tage',
      uniqueWordsCount: 'Einzigartige Wörter zählen',
      avgCharactersPerMessage: 'Durchschn. Zeichen pro Nachricht',
      firstMessage: 'Erste Nachricht',
      lastMessage: 'Letzte Nachricht',
    },
  },
} as LocalesType;

interface LocalesType {
  [key: string]: {
    weekdays: string[];
    weekdaysShort: string[];
    months: string[];
    monthShort: string[];
    sentiment: string[];
    interval: string[];
    stats: {
      numberOfMessages: string;
      averageWordsPerMessage: string;
      medianWordsPerMessage: string;
      totalWordsSent: string;
      maxWordsInMessage: string;
      activeDays: string;
      uniqueWordsCount: string;
      avgCharactersPerMessage: string;
      firstMessage: string;
      lastMessage: string;
    };
  };
}
