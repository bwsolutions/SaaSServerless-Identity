
const AWS = require('aws-sdk');

// Configure Environment
var configuration = {
    table: { serviceDiscovery: process.env.SERVICEDISCOVERY_TABLE }
};

const DynamoDBHelper = require('../libs/dynamodb-helper.js');

var serviceSchema = {
    TableName : configuration.table.serviceDiscovery,
    KeySchema: [
        { AttributeName: "serviceName", KeyType: "HASH"},  //Partition key
        { AttributeName: "serviceVersion", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "serviceName", AttributeType: "S" },
        { AttributeName: "serviceVersion", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

class serviceDiscovery {
    constructor(event) {
        console.log("process.env.apiURL = " + process.env.apiURL);
        console.log("process.env.stage = " + process.env.stage);
    }

    lookup(event) {
        console.log("Service Discovery Lookup");

        console.log("event =");
        console.log(event);
        var serviceName = decodeURIComponent(event.pathParameters.serviceName);
        var serviceVersion = decodeURIComponent(event.pathParameters.serviceVersion);
        console.log(serviceName);
        console.log(serviceVersion);

        return new Promise((resolve, reject) => {

            var params = {
                TableName: configuration.table.serviceDiscovery,
                KeyConditionExpression: 'serviceName = :name and serviceVersion >= :version',
                ExpressionAttributeValues: {
                    ':name': serviceName,
                    ':version': serviceVersion
                },
            };

            var documentClient = new AWS.DynamoDB.DocumentClient();
            console.log("params =");
            console.log(params);

            documentClient.query(params, function(err, data) {
                if (err){
                    var errorMessage = "Service query error: err="+err.message;
                    console.log(errorMessage);
                    reject(errorMessage);
                }
                else {
                    console.log("data.length =", data.length);
                    var Items = data.Items;
                    console.log("Items.length =", Items.length);

                    if (Items.length > 0) {
                        var resp = { endpoint_url: Items[0]['endpoint_url'],
                                    ttl: Items[0]['ttl'],
                                    status: Items[0]['status']
                        }
                        console.log("Found service: returning resposne = ");
                        console.log(resp)
                        resolve(resp);
                    } else {
                        console.log("did not find service")
                        console.log(data);
                        var errMessage = {
                            statusCode: 404,
                            msg:        "Service Not found"
                        };
                        reject(errMessage);
                    }
                }
            });
        });
    }
    register(event) {
        console.log("Service Discovery Register Function");
        console.log("event =");
        console.log(event);
        var service = JSON.parse(event.body);
        if (typeof service === "string") {
            service = JSON.parse(service); // stringified twice somewhere create object.
        }
        console.log("after JSON.parse -  service = " );
        console.log(service);

        return new Promise((resolve, reject) => {

            var documentClient = new AWS.DynamoDB.DocumentClient();
            var params = {
                TableName: configuration.table.serviceDiscovery,
                Item: service
            }

            documentClient.put(params, function(err, data) {
                if (err){
                    var errorMessage = "Service put error: err="+err.message;
                    console.log(errorMessage);
                    reject(errorMessage);
                }
                else {
                    console.log("Registered service to DB: data= ");
                    console.log(data)
                    resolve("Service registered");
                }
            });
        });
    }
    deregister(event) {
        console.log("Service Discovery Deregister Function");
        console.log("event =");
        console.log(event);
        var service = JSON.parse(event.body);
        if (typeof service === "string") {
            service = JSON.parse(service); // stringified twice somewhere create object.
        }
        console.log("after JSON.parse -  service = " );
        console.log(service);

        return new Promise((resolve, reject) => {

            var documentClient = new AWS.DynamoDB.DocumentClient();
            var params = {
                TableName: configuration.table.serviceDiscovery,
                Key: service
            }

            documentClient.delete(params, function(err, data) {
                if (err){
                    var errorMessage = "Service delete error: err="+err.message;
                    console.log(errorMessage);
                    reject(errorMessage);
                }
                else {
                    console.log("DEregistered service from DB: data= ");
                    console.log(data)
                    resolve("Service Deregistered");
                }
            });
        });
    }
}

module.exports = serviceDiscovery;
