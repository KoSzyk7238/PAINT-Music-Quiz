/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      keyframes: {
        'ping-small': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.6)', opacity: '0.5' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(34,197,94,0.3)' },
          '50%': { boxShadow: '0 0 35px rgba(34,197,94,0.5), 0 0 60px rgba(34,197,94,0.15)' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'ping-small': 'ping-small 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'fade-in-up-delay-1': 'fade-in-up 0.4s ease-out 0.1s forwards',
        'fade-in-up-delay-2': 'fade-in-up 0.4s ease-out 0.2s forwards',
        'fade-in-up-delay-3': 'fade-in-up 0.4s ease-out 0.3s forwards',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'slide-up-fade': 'slide-up-fade 0.5s ease-out forwards',
        'slide-up-fade-delay': 'slide-up-fade 0.5s ease-out 0.15s forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}
