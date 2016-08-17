# slack-analytics-_about_-service

[![Build Status](https://travis-ci.org/ibm-cds-labs/slack-analytics-about-service.svg?branch=master)](https://travis-ci.org/ibm-cds-labs/slack-analytics-about-service)

The Slack analytics **about** service provides users access to curated information from your Slack team's social and keyword graph. Slack users can find comments by entering the custom slash command `/about` followed by their search term. To get the big picture, read [this introduction to searching Slack with IBM Graph](https://wp.me/p6nwVO-2gu). 


   ![About service overview](http://developer.ibm.com/clouddataservices/wp-content/uploads/sites/47/2016/08/sa_service_detail.png)

###What users see
Here's the app in action. This is what it looks like when a Slack user enters an `/about` query:

   ![Slack graph interaction](https://raw.githubusercontent.com/ibm-cds-labs/slack-analytics-about-service/master/media/slash-command-demo.gif)
   
##Deploy the *about* service app

1. If you haven't already, [set up IBM Graph and generate the social and keyword graph for your Slack team](https://github.com/ibm-cds-labs/slack-analytics).

2. Clone this repository and deploy the service in Bluemix. Note that the service is automatically bound to the IBM Graph service instance `slack-graph-database` you created in step 1.

	```
	$ git clone https://github.com/ibm-cds-labs/slack-analytics-about-service.git
	$ cd slack-analytics-about-service
	$ cf push --no-start
	```
 > Do not start the service. It still needs to be configured.
 
3. Get app URL.

   By default a random URL (e.g. `about-slack-interfilamentary-confiscation.mybluemix.net`) is assigned to the service. Enter `cf app about-slack` to display the assigned value. You will need this information when you configure the slash command in Slack.
 
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

##Configure a new Slack integration

1. [Log in to your Slack team](https://www.slack.com) as an admin.
2. In your browser, open [https://slack.com/services/new/slash-commands](https://slack.com/services/new/slash-commands).
3. In **Choose a Command**, enter `/about` and click **Add Slash Command Integration**.
   You see the **Slash Commands** page.
4. Scroll down and in the **URL** field, enter the service URL you retrieved at the end of the preceding section. If necessary, prepend `https://` and at the end, type `/ask` so it looks like:  `https://about-slack-....mybluemix.net/ask`.
5. Under **method**, choose `POST`. 
6. Copy the token. You'll need this value in a minute when you configure the service.
7. Optionally, enable **autocomplete help text** and provide a description `Learn more about your Slack team` and usage hint `@user #channel keyword`
8. Click **Save Integration**.
9. Connect service to slack. 

   Share the slack token you just retrieved with your service. Return to your command line and copy this command, inserting the token. Then run: 

	```
	$ cf set-env about-slack SLACK_TOKEN <SLACK_TOKEN_VALUE>
	```

	> Set user-defined variable `DEBUG` to `*` or `slack-about-service` to enable debug output in the Cloud Foundry console log.
	> ```
	> $ cf set-env about-slack DEBUG slack-about-service
	> ```

##Run the service

5. Start the service.

	```
	$ cf start about-slack
	```

	> The service does not provide a web interface. Check the Cloud Foundry console log to make sure the service started successfully.

	```
	$ cf logs about-slack --recent
	```

	> The service won't start if no IBM Graph service instance named `slack-graph-database` is bound to the application or if environment variable `SLACK_TOKEN` is not defined.

6. In Slack, enter: 

    * `/about` to display help
	* `/about @userName` to display statistics for `userName`.
	* `/about #channelName` to display statistics for `channelName`.
	* `/about keyword` to display users and channels that are associated with `keyword`

	Example:

	```
	/about cloudant

	Collecting information about keyword ​cloudant.
	Keyword statistics
	Mentioned by: @andreaw, @claudiag, @gregory, @jennym, @sabines, @yvonnet
	Mentioned in: #general, #geospatial, #offline-first
	```	

What do you think of this handy graph app?  We'd love to get your thoughts, pull requests, issues, and other contributions.


---


###### Privacy Notice

_Sample web applications that include this package may be configured to track deployments to [IBM Bluemix](https://www.bluemix.net/) and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/IBM-Bluemix/cf-deployment-tracker-service) service on each deployment:_

- _Node.js package version_
- _Node.js repository URL_
* *Application Name (`application_name`)*
* *Space ID (`space_id`)*
* *Application Version (`application_version`)*
* *Application URIs (`application_uris`)*
* *Labels of bound services*
* *Number of instances for each bound service and associated plan information*

_This data is collected from the `package.json` file in the sample application and the `VCAP_APPLICATION` and `VCAP_SERVICES` environment variables in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples, so that we can continuously improve the content we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked._

###### Disabling Deployment Tracking	

_Deployment tracking can be disabled by removing the following line from `app.js`:_

```
require("cf-deployment-tracker-client").track();
```

_Once that line is removed, you may also uninstall the `cf-deployment-tracker-client` npm package._

###### License 

_Copyright [2016] [IBM Cloud Data Services]_

_Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0_

_Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License._
