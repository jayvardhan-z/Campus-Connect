/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
        },
        accent: '#8B5CF6',
        text: {
          DEFAULT: '#111827',
          secondary: '#6B7280',
        },
        border: '#E5E7EB',
      },
    },
  },
  plugins: [],
}
