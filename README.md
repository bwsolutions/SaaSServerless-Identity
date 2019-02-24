# serverless-saas-identity-microservices

## SaaS Identity with Cognito using Lambda Microservices

This is a reference architecture based on the "SaaS identiry and Isolation with Amazon Cognito on the AWS Cloud Quickstart". This architecture is based of the architecture details in this [deployment guide](https://fwd.aws/XKYDP).

The architecture was changed from using EC2 instances for the microservices, to create lambda functions behind a common API gateway. Here are the major differences between this version and the AWS Quickstart.

* Uses the Serverless Framework to define services instead of CloudFormation.
* Breaks out each microservice into a separate Serverless service directory. 
  * This allows each service to be modifed and updated independantly of the other services.
  * A single API gateway is used to make this easy for the application to access the services.
  * Rather than use HTTP and API gateway for internal communication, internal Lambda functions are directly invoked to improve performance.
  * The Databases are defined in the serverless.yml file for each service and this is created when deployed, so the application does not need to check for the DB before each access.
  * The same custom Authorization Lambda function is defined once and then referenced by all the microservices.
  * npm scripts were created to make the deployment and removal of each service easier.
* A services discovery process was implemented to allow each service to autoregister and other services to get implementation details.
* The Application was rewritten using React + Redux
  * An install option was added to the application to allow creation of the initial system Tenant
  * The application uses a lot of action + reducers to maintain the state while getting data from the microservices
  * More information on application changes are in the application README.md.
* Winston logging was replaced with simple console.log statements and all output being directed to CloudWatch logs.
* Serverless-offline was using for local testing along with dynamodb-local. However the Cognito functions needed access to an account with access to Cognito services. There was not a local test environment for this and no mock routines were created.

## Prerequisites
1. Node.js v8.10 or later
2. Serverless CLI v1.9.0 or later. See [Serverless Quickstart](https://serverless.com/framework/docs/providers/aws/guide/quick-start/) for more details.
3. An AWS account. A free tier account will work with minimal cost.
4. Setup provider Credentials. See [Serverless Quickstart](https://serverless.com/framework/docs/providers/aws/guide/quick-start/) for more details.
5. Clone github repository.
  * git clone https://github.com/bwsolutions/SaaSServerless-Identity.git
  
## Installation
1. cd SaaSServerless-Identity
1. cd serviceDiscovery
2. npm install
3. sls deploy
1. cd ../common
2. npm install -g npm-run-all
2. npm run installAll
2. npm run deployAll

## Usage example
* Use details in Application README.md to access services.
* monitor logs in CloudWatch 

## Acknowledgments / References
1. AWS Quickstart [SaaS identity and isolation with Amazon Cognito](https://aws.amazon.com/quickstart/saas/identity-with-cognito/) - The majority of the code for the microservices, custom authorization and cognito interface and other areas obtained from this repository.
2. [Serverless Framework for AWS](https://serverless.com/framework/docs/providers/aws/guide/quick-start/)

## Author
* Bill Stoltz - Booster Web Solutions


