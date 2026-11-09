import type { CapacitorConfig } from '@capacitor/cli';

const hostname = process.env.VITE_APP_HOSTNAME || 'redtf.org';

const config: CapacitorConfig = {
	appId: 'org.redtf.app',
	appName: 're:DTF',
	webDir: 'build',
	server: {
		androidScheme: 'https',
		hostname
	},
	plugins: {
		CapacitorUpdater: {
			autoUpdate: 'off',
			statsUrl: '',
			resetWhenUpdate: true,
			autoDeleteFailed: true
		},
		SplashScreen: {
			launchAutoHide: false
		},
		Keyboard: {
			resize: 'body',
			resizeOnFullScreen: true
		}
	}
};

export default config;
