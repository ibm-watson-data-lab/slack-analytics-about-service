# slack-analytics-about-service

[![Build Status](https://travis-ci.org/ibm-cds-labs/slack-analytics-about-service.svg?branch=master)](https://travis-ci.org/ibm-cds-labs/slack-analytics-about-service)

The Slack analytics integration service provides users access to curated information from your Slack team's social and keyword graph.

   ![About service overview](http://developer.ibm.com/clouddataservices/wp-content/uploads/sites/47/2016/08/sa_service_details.png)

###Example usage

   ![Slack graph interaction](https://raw.githubusercontent.com/ibm-cds-labs/slack-analytics-about-service/master/media/slash-command-demo.gif)
   
###Getting started

1. [Set up IBM Graph and generate the social and keyword graph for your Slack team](https://github.com/ibm-cds-labs/slack-analytics).

2. Clone this repository and deploy the service in Bluemix. Note that the service is automatically bound to the IBM Graph service instance `slack-graph-database` you've created in step 1.

	```
	$ git clone https://github.ibm.com/analytics-advocacy/slack-analytics-about-service.git
	$ cd slack-analytics-about-service
	$ cf push --no-start
	```
 > Do not start the service. It still needs to be configured.
 
3. By default a random URL (e.g. `about-slack-interfilamentary-confiscation.mybluemix.net`) is assigned to the service. Enter `cf app about-slack` to display the assigned value. You will need this information when you configure the slash command in Slack.
 
	```
	$ cf app about-slack
	Showing health and status for app about-slack in org ... / space ... as ...
	OK

	requested state: stopped
	instances: 0/1
	usage: 256M x 1 instances
	urls: about-slack-interfilamentary-confiscation.mybluemix.net
	last uploaded: Mon Aug 8 23:41:47 UTC 2016
	stack: cflinuxfs2
	buildpack: unknown

	There are no running instances of this app.
	```

4. Configure a new Slack integration

	* [Log in to your Slack team](https://www.slack.com) as an admin.
	* Open [https://slack.com/services/new/slash-commands](https://slack.com/services/new/slash-commands) in your browser.
	* Enter `/about` as a new command and press button for "Add a new slash command integration."
	* As _URL_, enter the service URL, e.g.  `https://about-slack-....mybluemix.net/ask`.
	* Choose `POST` as _method_. 
	* Take note of the token. You need this value in the next step when you configure the service.
	* Optionally, enable autocomplete and provide a description `Learn more about your Slack team` and usage hint `@user #channel keyword`
	* Save the slash command integration.

5. Define user-defined variable `SLACK_TOKEN` and assign the token value from the Slack _integration settings_ screen.

	```
	$ cf set-env about-slack SLACK_TOKEN <SLACK_TOKEN_VALUE>
	```

	> Set user-defined variable `DEBUG` to `*` or `slack-about-service` to enable debug output in the Cloud Foundry console log.
	> ```
	> $ cf set-env about-slack DEBUG slack-about-service
	> ```

5. Start the service.

	```
	$ cf start about-slack
	```

	> The service does not provide a web interface. Check the Cloud Foundry console log to make sure the service started successfully.

	```
	$ cf logs about-slack --recent
	```

	> The service won't start if no IBM Graph service instance named `slack-graph-database` is bound to the application or if environment variable `SLACK_TOKEN` is not defined.

6. In Slack, enter 

    * `/about` to display help
	* `/about @userName` to display statistics for `userName`.
	* `/about #channelName` to display statistics for `channelName`.
	* `/about keyword` to display users and channels that are associated with `keyword`

	Example:

	```
	/about cloudant

	Collecting information about keyword ​cloudant.
	Keyword statistics
	Mentioned by these users: @andreag, @claudiaw, @gregory, @jennym, @sabines, @yvonnet
	Mentioned in these channels: #general, #geospatial, #offline-first
	```	

### Privacy Notice

Sample web applications that include this package may be configured to track deployments to [IBM Bluemix](https://www.bluemix.net/) and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/IBM-Bluemix/cf-deployment-tracker-service) service on each deployment:

* Node.js package version
* Node.js repository URL
* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)
* Labels of bound services
* Number of instances for each bound service and associated plan information

This data is collected from the `package.json` file in the sample application and the `VCAP_APPLICATION` and `VCAP_SERVICES` environment variables in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples, so that we can continuously improve the content we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking	

Deployment tracking can be disabled by removing the following line from `app.js`:

```
require("cf-deployment-tracker-client").track();
```

Once that line is removed, you may also uninstall the `cf-deployment-tracker-client` npm package.

### License 

Copyright [2016] [IBM Cloud Data Services]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.