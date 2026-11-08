import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'org.redtf.app',
	appName: 're:DTF',
	webDir: 'build',
	server: {
		androidScheme: 'https'
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
