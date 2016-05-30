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

// to enable debugging, set environment variable DEBUG to slack-about-service or *
const debug = require('debug')('slack-about-service');

const SGSC = require('./social_graph_stats_collector.js');

 /**
   * Class collects user, channel and keyword Slack statistics.
   * @param {ibm-graph-client} GraphClient - an instance of ibm-graph-client containing a Slack social/knowledge graph
   *
   */
 function StatsCollector(GraphClient) {

 	this.GraphClient = GraphClient;
 	this.socialGraphStatsCollector = new SGSC(GraphClient);
 }

  /**
   * Asynchronously retrieves user statistics from a Slack social graph. Callback(err, status)  is invoked after 
   * it was verified that userName is valid. The statistics are POSTed to responseUrl.
   * @param {string} userName - the Slack user name for which social graph statistics are to be returned
   * @param {string} responseUrl - Slack callback Url 
   * @param {callback} callback - invoked after it was verified that userName is a valid user 
   */
 StatsCollector.prototype.getUserStats = function (userName, responseUrl, callback) {
 	
 	if((! userName) || (! this.GraphClient) || (! responseUrl) || (! callback)) {
 		return callback('The statistics service cannot process this request: missing input.');
 	}

 	debug('Fetching vertex information for user ' + userName);

  // verify that a user vertex exists with property userName set to <userName>
 	this.socialGraphStatsCollector.fetchUserInfo(userName, 
                                               function(err, userInfo) {

 		if(err) {
        // { code: 404, message: 'User <userName> is unknown.' }
     		return callback(err);
 		}

    // fetch statistics for this user asyncronously; don't wait for completion; the results will be POSTed to responseUrl
 		this.socialGraphStatsCollector.fetchUserStats(userInfo, responseUrl);

    // return preliminary response indicating that the user was found and statistics are being retrieved.
    return callback(null, { code : 200, message : 'Found user ' + userName + '. Creating activity summary.' });

 	}.bind(this));

 }; // getUserStats

 /**
   * Asynchronously retrieves channel statistics from a Slack social graph. Callback(err, status)  is invoked after 
   * it was verified that channelName is valid. The statistics are POSTed to responseUrl.
   * @param {string} channelName - the Slack channel name for which social graph statistics are to be returned
   * @param {string} responseUrl - Slack callback Url 
   * @param {callback} callback - invoked after it was verified that channelName is a valid channel 
   */
 StatsCollector.prototype.getChannelStats = function (channelName, responseUrl, callback) {

 	if((! channelName) || (! this.GraphClient) || (! responseUrl) || (! callback)) {
 		return callback('The statistics service cannot process this request: missing input.');
 	}

 	debug('Fetching vertex information for channel ' + channelName);

  // verify that a channel vertex exists with property channelName set to <channelName>
 	this.socialGraphStatsCollector.fetchChannelInfo(channelName, 
 													                        function(err, channelInfo) {

 		if(err) {
        // { code: 404, message: 'Channel <channelName> is unknown.' }
     		return callback(err);
 		}

    // fetch statistics for this channel asyncronously; don't wait for completion; the results will be POSTed to responseUrl
 		this.socialGraphStatsCollector.fetchChannelStats(channelInfo, responseUrl);

    // return preliminary response indicating that the channel was found and statistics are being retrieved.
    return callback(null, { code : 200, message : 'Found channel ' + channelName + '. Creating activity summary.' });

 	}.bind(this));

 }; // getChannelStats

/**
   * Asynchronously retrieves keyword statistics from a Slack knowledge graph. Callback(err, status)  is invoked after 
   * it was verified that keyword is valid. The statistics are POSTed to responseUrl.
   * @param {string} keyword - the keyword (or phrase) for which knowledge graph statistics are to be returned
   * @param {string} responseUrl - Slack callback Url 
   * @param {callback} callback - invoked after it was verified that keyword is valid
   */
 StatsCollector.prototype.getKeywordStats = function (keyword, callback) {

 	if((! keyword) || (! this.GraphClient) || (! callback)){
 		return callback('The statistics service cannot process this request: missing input.');
 	}

 	var response = {};

	response.code = 501;
	response.message = 'The knowledge graph has not been implemented yet.';

 	return callback(response);
 };


 module.exports = StatsCollector;
