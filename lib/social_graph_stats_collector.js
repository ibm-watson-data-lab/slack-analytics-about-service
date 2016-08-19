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

// to enable debugging, set environment variable DEBUG to slack-about-service or *
const debug = require('debug')('slack-about-service');

const slackUtil = require('./util/slack.js');

 /**
   * Class collects user, channel and keyword Slack statistics.
   * @param {ibm-graph-client} GraphClient - an instance of ibm-graph-client containing a Slack social/knowledge graph
   *
   */
 function SocialStatsCollector(GraphClient) {

 	this.GraphClient = GraphClient;

 }

  /**
   * Fetches vertex information for userName from a Slack social graph. Callback(err, userInfo)  is invoked after 
   * it was verified that userName is valid. UserInfo contains three properties: vertexId (unique IBM Graph identifier), userName (Slack user name) and userId (internal Slack user id).
   * @param {string} userName - a Slack user name
   * @param {callback} callback - invoked after it was determined whether or not userName is a valid user;  
   */
 SocialStatsCollector.prototype.fetchUserInfo = function (userName, callback) {
 	
 	if((! userName) || (! this.GraphClient) || (! callback)) {
 		return callback('The statistics service cannot process the fetchUserInfo request: missing input.');
 	}

 	debug('Fetching vertex information for user ' + userName);

 	// Locate vertex and return vertexId, userName and userId. These properties can be used in subsequent gremlin queries to locate the vertex in the graph.
	this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V().has("isUser", true).has("userName","' + userName + '");'},
		                     function(err, dbResponse) {

		                     	debug('UserInfo lookup. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

		                     	if((dbResponse.result.data) && (dbResponse.result.data.length > 0)) {
		                     		return callback(null, 
		                     						{
		                     							vertexId: dbResponse.result.data[0].id, 
		                     							userName: dbResponse.result.data[0].properties.userName[0].value, 
		                     							userId: dbResponse.result.data[0].properties.userId[0].value
		                     						});
		                     	}
		                     	else {
		                     		return callback({
		                     							code:404,
		                     							message:'User ' + userName + ' is unknown.'
		                     						});
		                     	}		                     	
		                     });
 }; // fetchUserInfo

  /**
   * Fetches statistics from the Slack social graph for the user that is identified by userInfo. Once the information was retrieved a POST request is made to 
   * responseUrl, containing as payload the formatted statistics for the user identified by userInfo.
   * @param {Object} userInfo  
   * @param {string} userInfo.vertexId - the vertex id for this user 
   * @param {string} userInfo.userName - the Slack user name
   * @param {string} userInfo.userId - the Slack user id
   * @param {string} responseUrl - Slack URL to which the statistics will be posted.
   */
 SocialStatsCollector.prototype.fetchUserStats = function (userInfo, responseUrl) {
 		
 		if((! userInfo) || (! responseUrl)) {
 			return;	// nothing to do
 		}

 		debug('Collecting information about user ' + userInfo.userName + ' from social graph.');

 		debug(userInfo);

 		// run gremlin queries in parallel to collect user statistics
 		async.parallel([
 						 function (callback) {
 						 	// Fetch total number of channels that userInfo.userName is a member of:
 						 	// g.V(<vertexId>).out("is_in_channel").count();
 						 	// Result: {user_is_in_channel_count : numeric}
							this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V(' + userInfo.vertexId +  ').out("is_in_channel").count();'},
								                     function(err, dbResponse) {

								                     	debug('Received response for channel membership stats call. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

								                     	if((dbResponse.result.data) && (dbResponse.result.data.length >= 0)) {
								                     		return callback(null, {user_is_in_channel_count : dbResponse.result.data[0]} );
								                     	}
								                     	else {
								                     		return callback(err);
								                     	}		                     	
		                     						});


 						 }.bind(this),
 						 function (callback) {
 						 	// Fetch activity stats for top 5 channels that userInfo.userName is a member of
 						 	// g.V(<vertexId>).outE("is_in_channel").order().by("messageCount", decr).limit(5).as("ic").inV().as("c").select("c","ic").by("channelName").by("messageCount")
 						 	// Result: { user_channel_activity_top_5 : string }
							this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V(' + userInfo.vertexId +  ').outE("is_in_channel").order().by("messageCount", decr).limit(5).as("ic").inV().as("c").select("c","ic").by("channelName").by("messageCount");'},
								                     function(err, dbResponse) {

								                     	debug('Received response for channel membership stats call. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

								                     	if((dbResponse.result.data) && (dbResponse.result.data.length >= 0)) {

								 					   		var userList = '';
								 					   		_.forEach(dbResponse.result.data, function(stat) {
								 					   			userList = userList + '#' + stat.c + ', ';
								 					   		});

								 					   		if(userList.length > 0) {
								 					   			userList = userList.substring(0,userList.length - 2);
								 					   		}

								                     		return callback(null, {user_channel_activity_top_5 : userList} );
								                     	}
								                     	else {
								                     		return callback(err);
								                     	}		                     	
		                     						});


 						 }.bind(this)
 					   ],
 					   function(err, stats) {

 					   	if(stats) {

 					   		var statsMap = {};
 					   		_.forEach(stats, function(stat) {
 					   			statsMap[Object.keys(stat)[0]] = stat[Object.keys(stat)[0]];
 					   		});

 					   		debug('User stats map: ' + JSON.stringify(statsMap));

 					   		// For Slack message formatting details refer to https://api.slack.com/docs/formatting#message_formatting		

							var response = {response_type: 'ephemeral',
						   					text: 'Statistics for user *' + userInfo.userName + '*.',
						   					mrkdwn: true,
						   					attachments: [
						   					               {
						   									text: 'Member in _' + statsMap.user_is_in_channel_count + '_ channels.',
						   									mrkdwn_in: ['text']
						   								   },
						   								   {
						   								   	text: 'Most active in ' + statsMap.user_channel_activity_top_5,
						   								   	mrkdwn_in: ['text']
						   								   }
						   					             ]
						   				   };

						   	// send response to Slack
						   	slackUtil.sendResponse(response, responseUrl);

					 	}
					 	else {

					 		debug('No social graph activity results are available for ' + userInfo.userName);
					 		// do nothing if no stats were returned.
					 	}
 					   });
 }; // fetchUserStats

 /**
   * Fetches vertex information for channelName from a Slack social graph. Callback(err, channelInfo)  is invoked after 
   * it was verified that channelName is valid. ChannelInfo contains three properties: vertexId (unique IBM Graph identifier), channelName (Slack channel name) and channelId (internal Slack channel id).
   * @param {string} channelName - a Slack channel name
   * @param {callback} callback - invoked after it was determined whether or not channelName is a valid channel;  
   */
 SocialStatsCollector.prototype.fetchChannelInfo = function (channelName, callback) {
 	
 	if((! channelName) || (! this.GraphClient) || (! callback)) {
 		return callback('The statistics service cannot process the fetchChannelInfo request: missing input.');
 	}

 	debug('Fetching vertex information for channel ' + channelName);

	// Locate vertex and return vertexId, channelName and channelId. These properties can be used in subsequent gremlin queries to locate the vertex in the graph.
	this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V().has("isChannel", true).has("channelName","' + channelName + '");'},
		                     function(err, dbResponse) {

		                     	debug('User ID lookup. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

		                     	if((dbResponse.result.data) && (dbResponse.result.data.length > 0)) {
		                     		return callback(null, {vertexId: dbResponse.result.data[0].id, channelName: dbResponse.result.data[0].properties.channelName[0].value, channelId: dbResponse.result.data[0].properties.channelId[0].value} );
		                     	}
		                     	else {
		                     		return callback({code:404,message:'Channel ' + channelName + ' is unknown.'});
		                     	}		                     	
		                     });
 }; // fetchChannelInfo

  /**
   * Fetches statistics from the Slack social graph for the channel that is identified by channelInfo. Once the information was retrieved a POST request is made to 
   * responseUrl, containing as payload the formatted statistics for the channel identified by channelInfo.
   * @param {Object} userInfo  
   * @param {string} userInfo.vertexId - the vertex id for this user 
   * @param {string} userInfo.userName - the Slack user name
   * @param {string} userInfo.userId - the Slack user id
   * @param {string} responseUrl - Slack URL to which the statistics will be posted.
   */
 SocialStatsCollector.prototype.fetchChannelStats = function (channelInfo, responseUrl) {
 		
 		debug('Collecting information about channel ' + channelInfo.channelName + ' from social graph.');

 		debug(channelInfo);

		// run gremlin queries in parallel to collect user statistics
 		async.parallel([
 						 function (callback) {
 						 	// Identify the most active users in channelInfo.channelName 
 						 	// g.V(<vertexId>).inE('is_in_channel').order().by('messageCount', decr).limit(5).outV().values("userName")
 						 	// Result: {channel_most_active_users : formatted_string}
							this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V(' + channelInfo.vertexId +  ').inE("is_in_channel").order().by("messageCount", decr).limit(5).outV().values("userName");'},
								                     function(err, dbResponse) {

								                     	debug('Received response for channel activity stats call. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

								                     	if((dbResponse.result.data) && (dbResponse.result.data.length >= 0)) {

															// convert result set into a formatted string: "@USER_NAME, @USER_NAME, ..."
								 					   		var userList = '';
								 					   		_.forEach(dbResponse.result.data, function(stat) {
								 					   			userList = userList + '@' + stat + ', ';
								 					   		});

								 					   		if(userList.length > 0) {
								 					   			userList = userList.substring(0,userList.length - 2);
								 					   		}

								                     		return callback(null, {channel_most_active_users : userList} );
								                     	}
								                     	else {
								                     		return callback(err);
								                     	}		                     	
		                     						});

 						 }.bind(this),
  						 function (callback) {
 						 	// Determine how many users were active in channelInfo.channelName 
 						 	// def g = graph.traversal(); g.V(<vertexId>).inE("is_in_channel").count();
 						 	// Result: {channel_active_users : numeric}
							this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V(' + channelInfo.vertexId +  ').inE("is_in_channel").count();'},
								                     function(err, dbResponse) {

								                     	debug('Received response for channel polpularity stats call. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

								                     	if((dbResponse.result.data) && (dbResponse.result.data.length > 0)) {
								                     		return callback(null, {channel_active_users : dbResponse.result.data[0]} );
								                     	}
								                     	else {
								                     		return callback(err);
								                     	}		                     	
		                     						});
 						 }.bind(this),
 						 function (callback) {
 						 	// Identify the top 5 channels in which channelInfo.channelName was mentioned 
 						 	// g.V(<vertexId>)inE("mentions_channel").group().by("inChannelName").by("mentionCount").by(sum(local)).next().sort{-(long)it.value};
 						 	// Result: {channel_mentioned_in : {channel_count : numeric, top_5 : formatted_string}}
							this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V(' + channelInfo.vertexId +  ')inE("mentions_channel").group().by("inChannelName").by("mentionCount").by(sum(local)).next().sort{-(long)it.value};'},
								                     function(err, dbResponse) {

								                     	debug('Received response for channel_mentioned_in stats call. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

								                     	if((dbResponse.result.data) && (dbResponse.result.data.length >= 0)) {

								                     		// convert result set into a formatted string: "#CHANNEL_NAME, #CHANNEL_NAME, ..."
								 					   		var inChannelNameList = '';
								 					   		var count = 0;
								 					   		_.forEach(dbResponse.result.data, function(mention) {
								 					   			count++;
								 					   			if(count <= 5) {
								 					   				inChannelNameList = inChannelNameList + '#' + Object.keys(mention)[0] + ', ';
								 					   			}
								 					   		});

								 					   		if(inChannelNameList.length > 0) {
								 					   			inChannelNameList = inChannelNameList.substring(0, inChannelNameList.length - 2);
								 					   		}

								                     		return callback(null, {channel_mentioned_in : {channel_count: dbResponse.result.data.length, top_5: inChannelNameList}} );
								                     	}
								                     	else {
								                     		return callback(err);
								                     	}		                     	
		                     						});

 						 }.bind(this),
 						 function (callback) {
 						 	// Identify the top 5 channels that were mentioned in channelInfo.channelName
 						 	// g.V().has("isChannel",true).inE("mentions_channel").has("inChannelName",<channelInfo.channelName>).group().by(inV().values("channelName")).by("mentionCount").by(sum(local)).next().sort{-(long)it.value}
 						 	// Result: {channel_mentions : {channel_count : numeric, top_5 : formatted_string}}
							this.GraphClient.gremlin({gremlin:'def g = graph.traversal(); g.V().has("isChannel",true).inE("mentions_channel").has("inChannelName","'+ channelInfo.channelName + '").group().by(inV().values("channelName")).by("mentionCount").by(sum(local)).next().sort{-(long)it.value};'},
								                     function(err, dbResponse) {

								                     	debug('Received response for channel_mentions stats call. Error: ' +  JSON.stringify(err) + ' Response:' + JSON.stringify(dbResponse));

								                     	if((dbResponse.result.data) && (dbResponse.result.data.length >= 0)) {

															// convert result set into a formatted string: "#CHANNEL_NAME, #CHANNEL_NAME, ..."
								 					   		var channelNameList = '';
								 					   		var count = 0;
								 					   		_.forEach(dbResponse.result.data, function(mention) {
								 					   			count++;
								 					   			if(count <= 5) {
								 					   				channelNameList = channelNameList + '#' + Object.keys(mention)[0] + ', ';
								 					   			}
								 					   		});

								 					   		if(channelNameList.length > 0) {
								 					   			channelNameList = channelNameList.substring(0, channelNameList.length - 2);
								 					   		}

								                     		return callback(null, {channel_mentions : {channel_count: dbResponse.result.data.length, top_5: channelNameList}} );
								                     	}
								                     	else {
								                     		return callback(err);
								                     	}		                     	
		                     						});

 						 }.bind(this) 						 
 						 // 
 					   ],
 					   function(err, stats) {

 					   	if(stats) {

 					   		var statsMap = {};
 					   		_.forEach(stats, function(stat) {
 					   			statsMap[Object.keys(stat)[0]] = stat[Object.keys(stat)[0]];
 					   		});

 					   		debug('Channel stats map: ' + JSON.stringify(statsMap));

 					   		// For Slack message formatting details refer to https://api.slack.com/docs/formatting#message_formatting		

							var response = {response_type: 'ephemeral',
						   					text: 'Statistics for channel *' + channelInfo.channelName + '*.',
						   					mrkdwn: true,
						   					attachments: [
						   								   {
						   								   	text: 'Total members: ' + statsMap.channel_active_users,
						   								   	mrkdwn_in: ['text']
						   								   },
						   								   {
						   								   	text: 'Most active members: ' + statsMap.channel_most_active_users,
						   								   	mrkdwn_in: ['text']
						   								   },
						   								   {
						   								   	text: 'Most frequently mentioned in: ' + statsMap.channel_mentioned_in.top_5,
						   								   	mrkdwn_in: ['text']
						   								   },
						   								   {
						   								   	text: 'Most frequently mentioned: ' + statsMap.channel_mentions.top_5,
						   								   	mrkdwn_in: ['text']
						   								   }
						   					             ]
						   				   };

						   	// send response to Slack
						   	slackUtil.sendResponse(response, responseUrl);
					 	}
					 	else {
					 		// do nothing if no stats were returned.
					 	}
 					   });
 };


module.exports = SocialStatsCollector;
