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

const debug = require('debug')('slack-about-service:util');
const request = require('request');

/*
 * Sends <payload> to <slackpayloadUrl> using HTTP POST request
 * @param payload - a formatted Slack message (https://api.slack.com/docs/messages)
 * @param slackPayloadUrl - the 
 */
var sendResponse = function(payload, slackPayloadUrl) {

	if((! payload) || (! slackPayloadUrl)) {
 		return;	// nothing to do
	}

	debug('Sending payload: ' + JSON.stringify(payload) + ' to Slack url ' + slackPayloadUrl);

	// send HTTP request with the specified payload
	request({
				url:slackPayloadUrl,
				method: 'POST',
				json: true,
				body: payload		 
			}, 
			function(error, slackpayload, body) {
				if (error) {
					console.error('Error sending payload to payload URL ' + slackPayloadUrl);	
				}
				else {
					debug('Slack response: ' + JSON.stringify(body));	
				}
			}
	);
};

module.exports.sendResponse = sendResponse;
