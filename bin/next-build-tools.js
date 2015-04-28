#!/usr/bin/env node
'use strict';

require('es6-promise').polyfill();
require('isomorphic-fetch');

var program = require('commander');
var deploy = require('../tasks/deploy');
var configure = require('../tasks/configure');
var provision = require('../tasks/provision');
var verify = require('../tasks/verify');
var build = require('../tasks/build');
var destroy = require('../tasks/destroy');
var purge = require('../tasks/purge');
var deployVcl = require('../tasks/deploy-vcl');
var nightwatch = require('../tasks/nightwatch');
var deployHashedAssets = require('../tasks/deploy-hashed-assets');
var deployStatic = require('../tasks/deploy-static');

function list(val) {
	return val.split(',');
}

function exit(err) {
	console.log(err);
	process.exit(1);
}

program.version(require('../package.json').version);

program
	.command('deploy [app]')
	.description('runs haikro deployment scripts with sensible defaults for Next projects')
	.action(function(app) {
		deploy(app).catch(exit);
	});

program
	.command('configure [source] [target]')
	.description('downloads environment variables from next-config-vars and uploads them to the current app')
	.option('-o, --overrides <abc>', 'override these values', list)
	.action(function(source, target, options) {
		configure({ source: source, target: target, overrides: options.overrides }).catch(exit);
	});

program
	.command('provision [app]')
	.description('provisions a new instance of an application server')
	.action(function(app) {
		if (app) {
			provision(app).catch(exit);
		} else {
			exit("Please provide an app name");
		}
	});

program
	.command('verify')
	.option('--skip-layout-checks', 'run verify checks when the application doesn\'t have customer facing html pages')
	.option('-l, --layout [type]', 'Only check dependencies whose templates are needed in this layout')
	.description('internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS.  Front End components should continue to use origami-build-tools verify)')
	.action(function(opts) {
		verify({ skipLayoutChecks: opts.skipLayoutChecks, layout: opts.layout }).catch(exit);
	});

program
	.command('nightwatch [test]')
	.option('-c, --config <config>', 'The location of the nightwatch.json, defaults to Next Build Tools nightwatch.json')
	.option('-e, --env <env>', 'The location of the nightwatch.json, defaults to Next Build Tools defined environments')
	.description('runs nightwatch with some sensible defaults')
	.action(function(test, options) {
		nightwatch({
			test: test,
			env: options.env,
			config: options.config

		})
			.catch(exit);
	});

program
	.command('deploy-hashed-assets')
	.description('deploys hashed asset files to S3 (if AWS keys set correctly)')
	.action(function() {
		deployHashedAssets().catch(exit);
	});

program
	.command('build')
	.option('--dev', 'Skip minification')
	.option('--watch', 'Watches files')
	.description('build javascript and css')
	.action(function(options) {
		build({
			minify: !options.dev,
			watch: options.watch
		}).catch(exit);
	});


program
	.command('destroy [app]')
	.description('deletes the app from heroku')
	.action(function(app) {
		if (app) {
			destroy(app).catch(exit);
		} else {
			exit("Please provide an app name");
		}
	});

program
	.command('purge [url]')
	.option('-s, --soft <soft>', 'Perform a "Soft Purge (will invalidate the content rather than remove it"')
	.description('purges the given url from the Fastly cache.  Requires a FASTLY_KEY environment variable set to your fastly api key')
	.action(function(url, options){
		if(url){
			purge(url, options).catch(exit);
		}else{
			exit('Please provide a url');
		}
	});

program
	.command('deploy-vcl [folder]')
	.description('Deploys VCL in [folder] to the specified fastly service.  Requires FASTLY_KEY env var')
	.option('-m, --main <main', 'Set the name of the main vcl file (the entry point).  Defaults to "main.vcl"')
	.option('-v, --vars <vars>', 'A way of injecting environment vars into the VCL.  So if you pass --vars AUTH_KEY,SERVICE the values {$AUTH_KEY} and ${SERVICE} in the vcl will be replaced with the values of the environmemnt variable')
	.option('-s, --service <service>', 'REQUIRED.  The ID of the fastly service to deploy to.')
	.action(function(folder, options) {
		if (folder) {
			deployVcl(folder, options).catch(exit);
		} else {
			exit('Please provide a folder where the .vcl is located');
		}
	});

program
	.command('deploy-static <source> [destination]')
	.description('Deploys static [source] to [destination] on S3 (where [destination] is a full S3 URL).  Requires AWS_ACCESS and AWS_SECRET env vars')
	.option('--strip <strip>', 'Optionally strip off the <strip> leading components off of the source file name')
	.option('--region <region>', 'Optionally set the region (default to eu-west-1)')
	.option('--bucket <bucket>', 'Optionally set the bucket (default to ft-next-qa)')
	.action(function(source, destination, opts) {
		var region = opts.region || 'eu-west-1';
		var bucket = opts.bucket || 'ft-next-qa';
		var destination = destination || "";
		return deployStatic({
			source: source,
			destination: destination,
			region: region,
			bucket: bucket,
			strip: opts.strip
		}).catch(exit);
	});

program
	.command('*')
	.description('')
	.action(function(app) {
		exit("The command ‘" + app + "’ is not known");
	});



program.parse(process.argv);

if (!process.argv.slice(2).length) {
program.outputHelp();
}
