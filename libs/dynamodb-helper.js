'use strict';

// Declare library dependencies
const AWS = require('aws-sdk');

//Configure Environment
const configModule = require('./config-helper.js');
var configuration = configModule.configure(process.env.stage);


/**
 * Constructor function
 * @param tableDefinition The defintion of the table being used
 * @param configSettings Configuration settings
 * @constructor
 */
function DynamoDBHelper(tableDefinition, credentials, configSettings, callback) {

    this.tableDefinition = tableDefinition;
    this.tableExists = true;

}

/**
 * Query for items using the supplied parameters
 * @param searchParameters The search parameters
 * @param credentials The user creds
 * @param callback Callback function for results
 */
DynamoDBHelper.prototype.query = function(searchParameters, credentials, callback) {
    this.getDynamoDBDocumentClient(credentials, function (error, docClient) {
        if(!error){
            docClient.query(searchParameters, function(err, data) {
                if (err) {
                    console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
                    callback(err);
                } else {
                    callback(null, data.Items);
                }
            });
        }
        else{
            console.log("DynamoDB Helper - query: getDynamoDBDocumentClient error =");
            console.log(error);
            callback(error);
        }

    }.bind(this));
}

/**
 * Put an item into a table
 * @param item The item to be created
 * @param tableName The table to put it in
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.putItem = function(item, credentials, callback) {
    this.getDynamoDBDocumentClient(credentials, function (error, docClient) {
        var itemParams = {
            TableName: this.tableDefinition.TableName,
            Item: item
        }

        docClient.put(itemParams, function(err, data) {


            if (err)
                callback(err);
            else {
                callback(null, data);

                /****
                 *

                var keyParams = {
                    id: item.id,
                    tenant_id: item.tenant_id
                };
                var fetchParams = {
                    TableName: itemParams.TableName,
                    Key: keyParams
                }
                docClient.get(fetchParams, function(geterr, getdata) {
                    console.log('DynamoDBHelper.prototype.putItem:docClient.get:  geterr = ');
                    console.log(geterr)
                    console.log('DynamoDBHelper.prototype.putItem:docClient.get:  getdata = ');
                    console.log(getdata)
                    if (geterr)
                        callback(geterr);
                    else {
                        callback(null, getdata.Item);
                    }
                });
                 ******/
            }
        });
    }.bind(this));
}

/**
 * Update and item in a table
 * @param productUpdateParams The parameters for the update
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.updateItem = function(productUpdateParams, credentials, callback) {
    this.getDynamoDBDocumentClient(credentials, function (error, docClient) {
        docClient.update(productUpdateParams, function(err, data) {
            if (err)
                callback(err);
            else
                callback(null, data.Attributes);
        });
    }.bind(this));
}

/**
 * Get an item from a table
 * @param keyParams Parameters for the GET
 * @param tableName Table to get from
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.getItem = function(keyParams, credentials, callback) {
    this.getDynamoDBDocumentClient(credentials, function (error, docClient) {
        var fetchParams = {
            TableName: this.tableDefinition.TableName,
            Key: keyParams
        }
        console.log("DynamoDB.getItem: fetch data....");
        docClient.get(fetchParams, function(err, data) {
            if (err)
                callback(err);
            else
                callback(null, data.Item);
        });
    }.bind(this));
}

/**
 * Delete and item from a table
 * @param deleteItemParams Parameter for the delete
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.deleteItem = function(deleteItemParams, credentials, callback) {
    this.getDynamoDBDocumentClient(credentials, function (error, docClient) {
        docClient.delete(deleteItemParams, function(err, data) {
            if (err)
                callback(err);
            else
                callback(null, data);
        });
    }.bind(this));
}

/**
 * Get all items from a table, using params to filter where necessary
 * @param scanParams Parameter for the scan
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.scan = function(scanParams, credentials, callback) {
    this.getDynamoDBDocumentClient(credentials, function (error, docClient) {
        docClient.scan(scanParams, function(err, data) {
            if (err)
                callback(err);
            else
                callback(null, data.Items);
        });
    }.bind(this));
}

/**
 * Get all items matching the specified parameters
 * @param batchGetParams Parameter for the get
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.batchGetItem = function(batchGetParams, credentials, callback) {
    this.getDynamoDBDocumentClient(credentials, function (error, docClient) {
        docClient.batchGet(batchGetParams, function(err, data) {
            if (err)
                callback(err);
            else
                callback(null, data);
        });
    }.bind(this));
}

/**
 * Create a new table
 * @param tableDefinition Structure of the table
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.createTable = function(dynamodb, callback) {
    console.log("DynamoDB Helper createTable()-  ");
    var newTable = {
        TableName: this.tableDefinition.TableName,
    };
    dynamodb.describeTable(newTable, function (error, data) {

        if (!error) {
            console.log("Table already exists: " + this.tableDefinition.TableName);
            callback(null);
        }
        else {
            dynamodb.createTable(this.tableDefinition, function (err, data) {
                if (err) {
                    console.log("Unable to create table: " + this.tableDefinition.TableName);
                    callback(err);
                } else {
                    var tableName = {TableName: this.tableDefinition.TableName};
                    dynamodb.waitFor('tableExists', tableName, function (err, data) {
                        if (err)
                            callback(err);
                        else {
                            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                            callback(null);
                        }
                    });
                }
            }.bind(this));
        }
    }.bind(this));
}

/**
 * Determine if a table exists
 * @param tableName Name of the table to evaluate
 * @param credentials User credentials
 * @returns {Promise} Promise with results
 */
DynamoDBHelper.prototype.tableExists = function(tableName, credentials) {

    var promise = new Promise(function (reject, resolve) {

        getDynamoDB(credentials)
            .then(function (dynamodb) {
                var newTable = {
                    TableName: tableName,
                };

                dynamodb.describeTable(newTable, function (error, data) {
                    if (error) {
                        console.log("Error describing table: ", error)
                        reject(error);
                    }
                    else {
                        resolve(true);
                    }
                });
            })
            .catch(function (error) {
                console.log("Error describing table: ", error);
                reject(error);
            });
    });
    return promise;
}

/**
 * Get an instance of DynamoDB object intialized with user credentials
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.getDynamoDB = function(credentials, callback) {
    try {
        var creds = {
            accessKeyId: credentials.claim.AccessKeyId,
            secretAccessKey: credentials.claim.SecretKey,
            sessionToken: credentials.claim.SessionToken,
            region: configuration.aws_region
        }

        //changes to support dynamodb-local

        if (process.env.IS_OFFLINE === 'true') {
            creds.region = "localhost";
            creds.endpoint = "http://localhost:8000";
        }

        var ddb = new AWS.DynamoDB(creds);

        if (process.env.IS_OFFLINE === 'true') {
            // leave this in for offline testing for now, but may remove?
            if (!this.tableExists) {
                this.createTable(ddb, function (error) {
                    if (error)
                        callback(error);
                    else {
                        this.tableExists = true;
                        callback(null, ddb);
                    }
                }.bind(this));
            }
        }
        else
            callback(null, ddb);
    }
    catch (error) {
        callback(error);
    }
}

/**
 * Get an instance of DynamoDB DocumentClient object intialized with user credentials
 * @param credentials User credentials
 * @param callback Callback with results
 */
DynamoDBHelper.prototype.getDynamoDBDocumentClient = function(credentials, callback) {
    try {
        var creds = {
            accessKeyId: credentials.claim.AccessKeyId,
            secretAccessKey: credentials.claim.SecretKey,
            sessionToken: credentials.claim.SessionToken,
            region: configuration.aws_region
        };


        //changes to support dynamodb-local

        if (process.env.IS_OFFLINE === 'true') {
            creds.region = "localhost";
            creds.endpoint = "http://localhost:8000";
        }

        var docClient = new AWS.DynamoDB.DocumentClient(creds);
        var ddb = new AWS.DynamoDB(creds);

        if (process.env.IS_OFFLINE === 'true') {
            // leave this in for offline testing for now, but may remove?
            if (!this.tableExists) {
                this.createTable(ddb, function (error) {
                    if (error)
                        callback(error);
                    else {
                        this.tableExists = true;
                        callback(null, docClient)
                    }
                }.bind(this));
            }
        }
        else
            callback(null,docClient);

    }
    catch (error) {
        callback(error);
    }
}

module.exports = DynamoDBHelper;