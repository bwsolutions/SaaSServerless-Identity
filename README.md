# SaaSServerless-Identity

## SaaS Identity with Cognito using Lambda Microservices

This is a reference architecture based on the "SaaS Identiry and Isolation with Amazon Cognito on the AWS Cloud Quickstart". This architecture is based of the architecture details in this [deployment guide](https://fwd.aws/XKYDP).

The architecture was changed from using EC2 instances for the microservices, to create lambda functions behind a common API gateway. Here are the major differences between this version and the AWS Quickstart.

* Uses the Serverless Framework to define services instead of CloudFormation.
* Breaks out each microservice into a separate Serverless service directory. 
  * This allows each service to be modifed and updated independantly of the other services.
  * A single API gateway is used to make this easy for the application to access the services.
  * Rather than use HTTP and API gateway for internal communication, internal Lambda functions are directly invoked to improve performance.
  * The Databases are defined in the serverless.yml file for each service and this is created when deployed, so the application does not need to check for the DB before each access.
  * The same custom Authorization Lambda function is defined once and then referenced by all the microservices.
  * npm scripts were created to make the deployment and removal of each service easier.
* A services discovery process was implemented to allow each service to autoregister and other services to get implementation details. (Future plan is to make this a separate module that can be included or not.)
* The Application was rewritten using React + Redux. This client is defined in [SaaSServerless-Client](https://github.com/bwsolutions/SaaSServerless-Client).
  * An install option was added to the application to allow creation of the initial system Tenant
  * The application uses action + reducers to maintain the state while getting data from the microservices
  * More information on application changes are in the application [SaaSServerless-Client README.md](https://github.com/bwsolutions/SaaSServerless-Client).
* Winston logging was replaced with simple console.log statements and all output being directed to CloudWatch logs.
* Serverless-offline was using for local testing along with dynamodb-local. However the Cognito functions still need access to an account with access to Cognito services. There was not a local test environment for this and no mock routines were created. (documentation on how to set this up is in the works.)

## Prerequisites
1. Node.js v8.10 or later
2. An AWS account. A free tier account will work with minimal cost. The account should have admin permissions, or ability to create resources on AWS.
3. Serverless CLI v1.9.0 or later. See [Serverless Quickstart](https://serverless.com/framework/docs/providers/aws/guide/quick-start/) for more details.
4. Setup provider Credentials. See [Serverless Quickstart](https://serverless.com/framework/docs/providers/aws/guide/quick-start/) for more details.
5. Clone github repository.
    - git clone https://github.com/bwsolutions/SaaSServerless-Identity.git
  
## Configuration
* By default this framework will install this in AWS Region us-east-1. If you want to install in a different region you will need to do the following steps:
  - edit the common/common.yml file. 
  - Change the region for each stage to a valid AWS region name.
* If you want to use a different prefix name for API gateway and other resources, 
  - edit the common/serverless.yml file. 
  - Under "custom:" section change the "projectName" field.
  
## Installation
The following steps will install and setup the microservices on AWS, using your AWS account. Make sure your account has Admin permissions, or permissions to create resources on AWS.
1. cd SaaSServerless-Identity
2. cd serviceDiscovery
3. npm install
4. sls deploy
5. cd ../common
6. npm install -g npm-run-all
7. npm run installAll
8. npm run deployAll

Next step - go to [SaaSServerless-Client](https://github.com/bwsolutions/SaaSServerless-Client) and complete the installation for the client.

## Usage example
Access to these services are thru the client. 
* Go to [SaaSServerless-Client](https://github.com/bwsolutions/SaaSServerless-Client) for details on how to access the system.
* You can monitor logs for each microservice in CloudWatch .

## Cleanup
You will need to cleanup and remove the resources so that you are not charged for any usage in your account. This is a 2 phase process.
####Phase1
* First you need to follow the instructions in the [SaaSServerless-Client README.md ](https://github.com/bwsolutions/SaaSServerless-Client) section on Cleanup. This phase will remove tenants and cleanup any created UserPools, etc.
####Phase 2
Continue Cleanup process here
* Now run the following commands
``` 
cd SaaSServerless-Identity/common
npm run RemoveAll
cd ../serviceDiscovery
sls remove
```
* It may take a few minutes for AWS to remove all the resources.

## Acknowledgments / References
1. AWS Quickstart [SaaS identity and isolation with Amazon Cognito](https://aws.amazon.com/quickstart/saas/identity-with-cognito/) - The majority of the code for the microservices, custom authorization and cognito interface and other areas obtained from this repository.
2. [Serverless Framework for AWS](https://serverless.com/framework/docs/providers/aws/guide/quick-start/)

## Author
* Bill Stoltz - Booster Web Solutions


