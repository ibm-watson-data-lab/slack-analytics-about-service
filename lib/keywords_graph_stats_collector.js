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

const async = require('async');
const _ = require('lodash');
const request = require('request');

// to enable debugging, set environment variable DEBUG to slack-about-service or *
const debug = require('debug')('slack-about-service');


 /**
   * Class collects user, channel and keyword Slack statistics.
   * @param {ibm-graph-client} GraphClient - an instance of ibm-graph-client containing a Slack social/knowledge graph
   *
   */
 function KeywordStatsCollector(GraphClient) {

 	this.GraphClient = GraphClient;

 }

  /**
   * Fetches vertex information for keyword from a Slack keyword graph. Callback(err, keywordInfo) is invoked after 
   * it was determined that at least one keyword vertex includes the specified keyword string 
   * @param {string} keyword - a keyword (or phrase)
   * @param {callback} callback(err, result) - err ({code:num, message:str}) and result [{vertexId: num.id, keyword:str}] (or empty array)
   */
 KeywordStatsCollector.prototype.fetchKeywordInfo = function (keyword, callback) {
 	
	if((! callback) || (typeof callback !== 'function')) {
    	console.error('Invalid fetchKeywordInfo invocation: callback is missing or not a function');
    	return;
  	}

 	if((! keyword) || (! this.GraphClient)) {
 		return callback({code:500, message:'The statistics service cannot process the fetchKeywordInfo request: missing input.'});
 	}

 	debug('Fetching vertex information for keyword ' + keyword);

 	// Locate keyword vertices that contain the specified keyword.  These properties can be used in subsequent graph traversals.
	this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V().has("isKeyword", true).has("keyword",textContains("' + keyword.trim().toLowerCase() + '"));'},
		                     function(err, dbResponse) {

		                     	debug('KeywordInfo lookup. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

		                     	if((dbResponse.result.data) && (dbResponse.result.data.length > 0)) {

		                     		var matchingVertices = [];
		                     		_.forEach(dbResponse.result.data, 
		                     			      function(result) {
		                     					matchingVertices.push({vertexId: result.id, keyword: result.keyword});
		                     				 });

		                     		return callback(null, matchingVertices);
		                     	}
		                     	else {
		                     		return callback({code:404, message:'keyword was not found.'});
		                     	}		                     	
		                     });
 }; // fetchKeywordInfo

  /**
   * Fetches statistics from the Slack keyword graph for the keyword that is identified by keywordMatches. Once the information was retrieved a POST request is made to 
   * responseUrl, containing as payload the formatted statistics for the keyword identified by keywordInfo.
   * @param {String} keyword - 
   * @param {Object} keywordMatches  []
   * @param {string} keywordMatches.vertexId - the vertex id for this keyword
   * @param {string} keywordMatches.keyword - the keyword string that included keyword
   * @param {string} responseUrl - Slack URL to which the statistics will be posted.
   */
 KeywordStatsCollector.prototype.fetchKeywordStats = function (keyword, keywordMatches, responseUrl) {
 		
 		if((! keyword) || (! keywordMatches) || (keywordMatches.length === 0) || (! responseUrl)) {
 			console.error('fetchKeywordStats - input parameter is missing or invalid');
 			console.error('		keyword       : ' + JSON.stringify(keyword));
 			console.error('		keywordMatches: ' + JSON.stringify(keywordMatches));
 			console.error('		responseUrl   : ' + JSON.stringify(responseUrl));
 			return;	// nothing to do
 		}

 		debug('Collecting edge information for the following vertices from the keyword graph:');
 		debug(JSON.stringify(keywordMatches));

 		// concatenate keyword vertex Ids: "123,124,125,..."	
 		var vertices = (_.flatMap(keywordMatches, function(keywordMatch) {return keywordMatch.vertexId;})).join(',');    

 		// determine which users and channels are associated with extracted keywords that include the keyword string
 		async.parallel({
 						 users: function (callback) {
							// Fetch users that mentioned this keyword
							// def g=graph.traversal(); g.V(<vertexIds>).in('mentions_keyword');
							// Result: [<user_vertex>, ...]
							const userTraversal = 'def g = graph.traversal(); g.V(' + vertices + ').in(\'mentions_keyword\');';
							debug('Running graph traversal: ' + userTraversal);
							this.GraphClient.gremlin({gremlin:userTraversal},
								                     function(err, dbResponse) {

								                     	debug('Results for traversal ' + userTraversal + '. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));
 														
 														var userList = [];

								                     	if((! err) && (dbResponse.result.data)) {
								                     		_.forEach(dbResponse.result.data, function(vertex) {
																userList.push({id:vertex.properties.userId[0].value, name: vertex.properties.userName[0].value});
								                     		});
								                     	}
								                     	return callback(err, userList);    	
		                     						 });

 						 }.bind(this),
 						 channels: function (callback) {
 						 	// Fetch channels where this keyword was mentioned
							// def g=graph.traversal(); g.V(<vertexId>).out('used_in_channel')
							// Result: [channel_vertex, ...]
							const channelTraversal = 'def g = graph.traversal(); g.V(' + vertices +  ').out(\'used_in_channel\');';
							debug('Running graph traversal: ' + channelTraversal);
							this.GraphClient.gremlin({gremlin:channelTraversal},
						                     		 function(err, dbResponse) {

								                     	debug('Results for traversal ' + channelTraversal + '. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

		 		    									var channelList = [];

								                     	if((! err) && (dbResponse.result.data)) {
								                     		_.forEach(dbResponse.result.data, function(vertex) {
																channelList.push({id:vertex.properties.channelId[0].value, name: vertex.properties.channelName[0].value});
								                     		});
								                     	}

								                     	return callback(err, channelList);    	
		                     						 });
 						 }.bind(this)
 					   },
 					   function(err, results) {
 				   		if(err) {
 				   			console.error('Error retrieving user or channel names associated with keyword vertices: ' + err);
 				   		}
 				   		else {
				   			debug('Users and channels associated with the keyword vertices: ' + JSON.stringify(results));

 					   		// For Slack message formatting details refer to https://api.slack.com/docs/formatting#message_formatting		

							const response = {response_type: 'ephemeral',
						   						text: 'Statistics for keyword *' + keyword + '\n' +
						   					    	  ' Mentioned by these users: ' + _.flatMap(_.sortBy(_.uniqBy(results.users,'id'),'name'),function(user) {return '<@' + user.id + '|' + user.name + '>';}).join(', ') + '\n' + 
						   					    	  ' Mentioned in these channels: ' + _.flatMap(_.sortBy(_.uniqBy(results.channels,'id'),'name'),function(channel) {return '<#' + channel.id + '|' + channel.name + '>';}).join(', '),
						   						mrkdwn: true
						   				   	 };			   		   	

								debug('Sending response: ' + JSON.stringify(response) + ' to Slack url ' + responseUrl);

								// send formatted statistics to Slack for display to the end-user
								request({
											url:responseUrl,
											method: 'POST',
											json: true,
											body: response		 
										}, 
										function(error, slackResponse, body) {
											debug('Slack response: ' + JSON.stringify(body));
							 		    });
						}

 				   });

 }; // fetchKeywordStats 

module.exports = KeywordStatsCollector;
