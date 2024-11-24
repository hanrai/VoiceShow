/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			animation: {
				'spin-slow': 'spin 8s linear infinite',
				'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
				ripple: 'ripple 3s linear infinite',
			},
			keyframes: {
				'bounce-gentle': {
					'0%, 100%': { transform: 'translateY(-5%)' },
					'50%': { transform: 'translateY(5%)' },
				},
				ripple: {
					'0%': {
						transform: 'scale(0.8)',
						borderColor: 'rgba(74, 222, 128, 0.4)',
					},
					'50%': {
						borderColor: 'rgba(74, 222, 128, 0.2)',
					},
					'100%': {
						transform: 'scale(1.1)',
						borderColor: 'rgba(74, 222, 128, 0)',
					},
				},
			},
		},
	},
	plugins: [],
};
