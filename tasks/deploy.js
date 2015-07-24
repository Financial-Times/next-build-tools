"use strict";

var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var about = require('../lib/about');
var exec = require('../lib/exec');
var build = require('haikro/lib/build');
var deploy = require('haikro/lib/deploy');
var logger = require('haikro/lib/logger');
var normalizeName = require('../lib/normalize-name');
var enablePreboot = require('../lib/enable-preboot');
var waitForGtg = require('./wait-for-gtg');
var denodeify = require('denodeify');
var fs = require('fs');
var writeFile = denodeify(fs.writeFile);
var exists = denodeify(fs.exists, function(exists) { return [undefined, exists] });

module.exports = function(opts) {
	logger.setLevel('debug');
	var token;
	var commit;
	var name = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);

	return Promise.all([
		herokuAuthToken(),
		exec('git rev-parse HEAD')
	])
		.then(function(results) {
			token = results[0];
			commit = results[1].trim();
			return about({ name: name, commit: commit });
		})
		.then(function() {
			var buildPromise;
			if (opts.docker) {
				buildPromise = exists(process.cwd() + '/Dockerfile')
					.then(function(dockerfileExists) {
						if (dockerfileExists) {
							console.log('Using existing Dockerfile');
						} else {
							console.log('Writing Dockerfile');
							return writeFile(process.cwd() + '/Dockerfile', 'FROM financialtimes/next-heroku:0.12.6');
						}
					});
			} else {
				buildPromise = build({ project: process.cwd() });
			}

			if (opts.skipEnablePreboot) {
				console.log("Skipping enable preboot step");
				return buildPromise;
			}
			return Promise.all([
				buildPromise,
				enablePreboot({ app: name, token: token })
			]);
		})
		.then(function() {
			console.log('Next Build Tools going to deploy to ' + name);
			if (opts.docker) {
				return exec('heroku docker:release --app ' + name);
			} else {
				return deploy({
					app: name,
					token: token,
					project: process.cwd(),
					commit: commit
				});
			}
		})

		// Start polling
		.then(function() {
			if(!opts.skipGtg) {
				return waitForGtg({ app: name });
			} else {
				console.log("Skipping gtg check");
			}
		});
};
