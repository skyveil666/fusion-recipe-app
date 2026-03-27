/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:    '#2a4010',
          DEFAULT: '#3a5a18',
          medium:  '#4a7020',
          light:   '#5d8828',
        },
        accent: {
          DEFAULT: '#c87820',
          light:   '#e09030',
          dark:    '#a06010',
        },
        cream: {
          light:  '#fdf9f4',
          DEFAULT:'#f8f2e6',
          dark:   '#eae0cc',
          border: '#ddd0bc',
        },
      },
    },
  },
  plugins: [],
};
