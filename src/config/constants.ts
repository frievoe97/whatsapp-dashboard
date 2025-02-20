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
    justifyContent: 'space-between',
    marginLeft: '4px',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    marginRight: '4px',
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '0px',
    flex: '1 1 auto',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dropdownIndicator: (provided: any) => ({
    ...provided,
    padding: '0px',
    marginLeft: '1px',
    marginRight: '-2px',
    color: darkMode ? 'white' : 'black',
  }),
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
