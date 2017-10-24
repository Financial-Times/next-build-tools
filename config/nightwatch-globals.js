'use strict';

require('isomorphic-fetch');
const notifySauceLabs = require('notify-saucelabs');

const notify = (sessionId, passed, opts) =>
	notifySauceLabs(Object.assign({ sessionId, passed }, opts))
		.then(() => {
			console.info('Finished updating Sauce Labs'); // eslint-disable-line no-console
		})
		.catch(err => {
			console.error('An error has occurred notifying Sauce Labs'); // eslint-disable-line no-console
			return err;
		});

module.exports = {
	// ft.com can take a while to load
	asyncHookTimeout : 20000,

	buildUrl: (testApp, path) => `https://${testApp}.herokuapp.com${path}`,

	gtgUrl: function (testApp) {
		return this.buildUrl(testApp, '/__gtg');
	},

	afterEach: (browser, done) => {
		const sessionId = browser.sessionId;
		const currentTest = browser.currentTest;
		const passed = !currentTest.results.failed && !currentTest.results.errors;
		const tags = [];
		if (currentTest.group) {
			tags.push(currentTest.group);
		}
		if (process.env.NODE_ENV) {
			tags.push(process.env.NODE_ENV);
		}
		const notifyOpts = { tags };
		console.log(`Sauce Test Results at https://saucelabs.com/tests/${sessionId}`); // eslint-disable-line no-console
		browser
			.getLog('browser', logs => {
				if (!passed) {
					console.log('JS Console'); // eslint-disable-line no-console
					console.log('=========='); // eslint-disable-line no-console
					console.log(logs); // eslint-disable-line no-console
				}
			})
			.perform((browser, done) => {
				notify(sessionId, passed, notifyOpts)
					.then(done);
			})
			.end(done);
	}
};
