module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(96, 165, 250, 0.12), 0 18px 50px rgba(15, 23, 42, 0.35)'
      },
      backgroundImage: {
        'grid-fade': 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)'
      }
    }
  },
  plugins: []
};