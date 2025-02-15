/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#0000ff',
          dark: '#00ff00',
        },
        text: {
          light: '#000000',
          dark: '#ffffff',
        },
        border: {
          light: '#000000',
          dark: '#ffffff',
        },
        button: {
          light: '#ffffff',
          lightHover: '#e5e7eb',
          dark: '#374151',
          darkHover: '#1f2937',
        },
      },
    },
  },
  plugins: [],
};
