'use strict';

var querystring = require('querystring');

// Please provide the following options:
// - environment
// - summary
// - description
// - name

function makeKonstructorCall(path, options) {
	options.body = querystring.stringify(options.body);
	options.headers = {
		Accept: 'application/json',
		'Content-Type': 'application/x-www-form-urlencoded',
		'Content-Length': options.body.length
	};
	var gateway;
	switch(options.gateway) {
		case 'mashery':
			options.headers['X-Api-Key'] = process.env.KONSTRUCTOR_API_KEY;
			gateway = 'https://api.ft.com/konstructor';
			break;
		case 'konstructor':
			options.headers.Authorization = process.env.KONSTRUCTOR_API_KEY;
			gateway = 'https://konstructor.ft.com';
			break;
		case 'internal':
			gateway = 'http://konstructor.svc.ft.com';
			break;
		default:
			throw new Error("Invalid log gateway");
	}
	console.log(gateway + path);
	return fetch(gateway + path, options);
}

function open(options) {
	var payload = {
		ownerEmailAddress: 'matthew.andrews@ft.com',
		summaryOfChange: options.summary,
		changeDescription: 'See summary',
		reasonForChangeDetails: 'Deployment',
		changeCategory: 'Minor',
		riskProfile: 'Low',
		environment: options.environment,
		willThereBeAnOutage: 'No',
		resourceOne: 'matthew.andrews@ft.com',
		serviceIds: options.name,
		notifyChannel: '#ft-next-builds',
		notify: true
	};
	return makeKonstructorCall('/v1/changerequest/releaselog', {
			method: 'POST',
			body: payload,
			gateway: options.gateway
		})
		.then(function(res) {
			if (res.ok) {
				console.log("SalesForce CR opened");
				return res.json()
					.then(function(data) {
						var id = data.changeRequests[0].id;
						console.log("Change request logged", id);
						return id;
					});
			} else {
				return res.text()
					.then(function(data) {
						console.log(data);
						throw new Error("Could not log change to SalesForce");
					});
			}
		});
}

function close(id, options) {
	var payload = {
		closedByEmailAddress: 'matthew.andrews@ft.com',
		closeCategory: 'Implemented',
		notifyChannel: '#ft-next-builds',
		notify: true
	};
	return makeKonstructorCall('/v1/changerequest/close/' + id, {
			method: 'POST',
			body: payload,
			gateway: options.gateway
		})
		.then(function(res) {
			if (res.ok) {
				console.log("SalesForce CR closed");
			} else {
				return res.text()
					.then(function(data) {
						console.log(data);
						throw new Error("Could not log change to SalesForce");
					});
			}
		});
}

module.exports = { open: open, close: close };