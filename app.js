//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2016
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------

'use strict';

const cfenv = require('cfenv');
const express = require('express');
const bodyParser = require('body-parser');
const util = require('util');

// to enable debugging, set environment variable DEBUG to slack-about-service or *
const debug = require('debug')('slack-about-service');

const IBMGraphClient = require('ibm-graph-client');
const StatsCollector = require('./lib/stats_collector.js');

/*
 * This application implements a simple Slack slash command back-end service that serves the following requests:
 * /about                   display usage information
 * /about @userName         display statistics for the Slack user identified by userName
 * /about #channelName		display statistics for the Slack channel identified by channelName
 * For information about Slack slash commands refer to https://api.slack.com/slash-commands
 * 
 * Service dependencies:
 *       - slack-graph-database: IBM Graph service instance, containing a populated Slack social graph
 * 
 * Environment variable dependencies:
 *       - SLACK_TOKEN: the unique token that was assigned by Slack to this integration
 *       - DEBUG (optional): if set to * or slack-about-service, debug information is added to the log
 */

 	debug('Slack-about-service: debug is enabled.');


	var app = express();
	app.use(bodyParser.urlencoded({extended: false}));

	/*
 	 * Verify that the application was properly configured and establish connectivity to the Graph database
 	 */

	var appEnv = null;

	try {
	  appEnv = cfenv.getAppEnv({vcap: {services: require('./vcap_services.json')}});
	}
	catch(ex) {
	  appEnv = cfenv.getAppEnv();
	}

	if(! process.env.SLACK_TOKEN) {
	    throw new Error('No Slack integration API token has been configured for this application. Set environment variable SLACK_TOKEN and restart the application.');
	}

	var graphServiceCredentials = appEnv.getServiceCreds('slack-graph-database');

	if(! graphServiceCredentials) {
	    throw new Error('This application is not bound to a Bluemix hosted IBM Graph. Set the VCAP_SERVICES environment variable or add the service information to file vcap_services.json.');
	}

	var GraphClient = new IBMGraphClient({url: graphServiceCredentials.apiURL, 
		                                  username: graphServiceCredentials.username, 
		                                  password: graphServiceCredentials.password});

	var sc = new StatsCollector(GraphClient);

	// obtain session token from IBM Graph database
	GraphClient.session(function (error, token){

		GraphClient.config.session = token;
		debug('IBM Graph session was established successfully.');

	});

	// listen to Slack requests
	app.post('/ask', function(req,res) {

		/*
		  Expected payload:
		  -------------------------------------	
		  token: 'slack-token',
		  team_id: 'team-id',
		  team_domain: 'team-domain',
		  channel_id: 'channel-id',
		  channel_name: 'channel-name',
		  user_id: 'user-id',
		  command: '/about',
		  text: 'about-request-text',
		  response_url: 'response-url' }
		  -------------------------------------
		 */

	  debug(util.inspect(req.body));
	  
	  // ensure that the incoming request has the correct token
	  if ((req.body.token) && (req.body.token === process.env.SLACK_TOKEN)) {

	  	 if (! req.body.text) {
			res.send('Specify @user or #channel.');	
	  	 }
	  	 else {

	  	 	var payload = null;

	  	 	if(req.body.text.startsWith('@')) {
	  	 		payload = req.body.text.substring(1, req.body.text.length);
	  	 		if(payload.split(' ').length === 1) {
		  	 		sc.getUserStats(payload, 
		  	 			            req.body.response_url, 
		  	 			            function(err, response) {
		  	 			if(err) {
							res.status(err.code).send('Activity summary cannot be created: ' + err.message);	
		  	 			}
		  	 			else {
		  	 				res.status(response.code).send(response.message);		
		  	 			}
		  	 		});	  	 		
		  	 	}
		  	 	else {
		  	 		res.status(400).send('Please specify only one Slack user name.');
		  	 	}
	  	 	}
	  	 	else {
		  	 	if(req.body.text.startsWith('#')) {
		  	 		payload = req.body.text.substring(1, req.body.text.length);
		  	 		if(payload.split(' ').length === 1) {
			  	 		sc.getChannelStats(payload, 
			  	 				  	 	   req.body.response_url,
			  	 			               function(err, response) {
			  	 			if(err) {
								res.status(err.code).send('Activity summary cannot be created: ' + err.message);	
		  	 					}
		  	 				else {
			  	 				res.status(response.code).send(response.message);		
		  	 				}
		  	 			});
		  	 		}
		  	 		else {
		  	 			res.status(400).send('Please specify only one Slack channel name.');
		  	 		}		  	 			
	  		 	}
		  	 	else {
		  	 		payload = req.body.text;

		  	 		sc.getKeywordStats(payload, function(err, response) {
		  	 			if(err) {
							res.status(err.code).send('No information is available for keyword ' + payload + ': ' + err.message);		
	  	 					}
	  	 				else {
		  	 				res.status(response).send(response.message);		
	  	 				}  	 					
	  	 			});
		  	 	}
	  	 	}	  	 	
	  	 }
	     
	    }
	  	else {
	  		console.error('Received unauthorized request: Invalid or missing API token.');
	    	res.status(403).send('Request denied. Invalid or missing API token.');  
	  }
	});

	// start server on the specified port and binding host
	 app.listen(appEnv.port, '0.0.0.0', function() {
	    console.log('Server starting on ' + appEnv.url);
	 });

