'use strict';

var configVarsKey = require('../lib/config-vars-key');
var fetchres = require('fetchres');
var fs = require('fs');
var denodeify = require('denodeify');
var writeFile = denodeify(fs.writeFile);
var existsSync = fs.existsSync;

module.exports = function(opts) {
	opts = opts || {};
	var destination = process.env.HOME + "/.next-development-keys.json";
	if (existsSync(destination) && !opts.update) {
		console.log("Development keys found. Loading from " + destination);
		return Promise.resolve();
	}
	return configVarsKey()
		.then(function(key) {
			return fetch('https://ft-next-config-vars.herokuapp.com/development', { headers: { Authorization: key } });
		})
		.then(fetchres.json)
		.then(function(data) {
			console.log("Development keys downloaded. Writing to " + destination);
			return writeFile(destination, JSON.stringify(data, undefined, 2));
		})
		.catch(function(err) {
			throw new Error("Could not download development keys from Heroku. Make sure you have joined the ft-next-config-vars app and have ‘operate’ permissions");
		});
};
