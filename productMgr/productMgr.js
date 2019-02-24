const request = require('request');
console.log("before configModule - process.env.stage = " + process.env.stage);

const uuidV4 = require("uuidv4");

// Configure Environment
const configModule = require('../libs/config-helper.js');
var configuration = configModule.configure(process.env.stage);

const Response = require("../libs/response-lib");

// Declare shared modules
const tokenManager = require('../libs/token-manager.js');
const DynamoDBHelper = require('../libs/dynamodb-helper.js');

// Create a schema
var productSchema = {
    TableName : configuration.table.product,
    KeySchema: [
        { AttributeName: "tenantId", KeyType: "HASH"},  //Partition key
        { AttributeName: "productId", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "tenantId", AttributeType: "S" },
        { AttributeName: "productId", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

class productMgr {
    constructor(event) {
        this.res = new Response();
        this.bearerToken = event.headers['Authorization'];
        if (this.bearerToken) {
            this.tenantId = tokenManager.getTenantId(event);
        }
    }

    health(event) {
        console.log("User Manager Health Check");
        return new Promise((resolve, reject) => {
            resolve({service: 'User Manager', isAlive: true});
        });
    }

    getProduct(event) {
        return new Promise(function (resolve, reject) {

            console.log('Fetching product: ' + event.pathParameters.id);

            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                // init params structure with request params
                var tenantId = tokenManager.getTenantId(event);
                var productId = decodeURIComponent(event.pathParameters.id);
                var params = {
                    tenantId:  tenantId,
                    productId: productId
                }
                if (credentials) {

                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

                    dynamoHelper.getItem(params, credentials, function (err, product) {
                        if (err) {
                            console.log('Error getting product: ' + err.message);
                            reject("Error getting product");
                        }
                        else {
                            console.log('Product ' + productId + ' retrieved');
                            resolve(product);
                        }
                    });
                } else {
                    console.log('Error retrieving credentials: err= ' );
                    console.log(err);
                    reject(err);
                }
            });
        });
    }

    getProducts(event) {

        return new Promise(function (resolve, reject) {
            console.log('Fetching Products ' );
            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                var tenantId = tokenManager.getTenantId(event);

                console.log('Fetching Products for Tenant Id: ' );
                console.log(tenantId);

                var searchParams = {
                    TableName:                 productSchema.TableName,
                    KeyConditionExpression:    "tenantId = :tenantId",
                    ExpressionAttributeValues: {
                        ":tenantId": tenantId
                    }
                };
                if (credentials) {

                         // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

                    dynamoHelper.query(searchParams, credentials, function (error, products) {
                        if (error) {
                            console.log('Error retrieving products: ' + error.message);
                            reject("Error retrieving products");
                        }
                        else {
                            console.log('Products successfully retrieved');
                            var productList = { items: products };
                            console.log(productList);
                            resolve(productList);
                        }

                     });
                } else {
                    console.log('Error retrieving credentials: err= ' );
                    console.log(err);
                    reject(err);
                }
            });
        });
    }

    create(event) {

        return new Promise(function (resolve, reject) {
            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                var productReq = JSON.parse(event.body);
                if (typeof productReq === "string") {
                    productReq = JSON.parse(productReq); // stringified twice somewhere create object.
                }
                var tenantId = tokenManager.getTenantId(event);

                productReq.productId = uuidV4();
                productReq.tenantId = tenantId;
                if (credentials) {

                    console.log("create: product  ");
                    console.log(productReq);
                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

                    dynamoHelper.putItem(productReq, credentials, function (err, product) {
                        if (err) {
                            console.log('Error creating new product: ' + err.message);
                            reject("Error creating product");
                        }
                        else {
                            console.log('Product ' + productReq.title + ' created');
                            resolve({status: 'success'});
                        }
                    });
                } else {
                    console.log('Error retrieving credentials: err= ' );
                    console.log(err);
                    reject(err);
                }
            });
        });
    }

    update(event) {

        return new Promise(function (resolve, reject) {

            var productReq = JSON.parse(event.body);
            if (typeof productReq === "string") {
                productReq = JSON.parse(productReq); // stringified twice somewhere create object.
            }

            console.log('Updating product: ' + productReq.productId);
            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                // init the params from the request data
                var tenantId = tokenManager.getTenantId(event);

                var keyParams = {
                    tenantId:  tenantId,
                    productId: productReq.productId
                }
                if (credentials) {

                    console.log('Updating product: ' + productReq.productId);

                    var productUpdateParams = {
                        TableName:                 productSchema.TableName,
                        Key:                       keyParams,
                        UpdateExpression:          "set " +
                                                       "sku=:sku, " +
                                                       "title=:title, " +
                                                       "description=:description, " +
                                                       "#condition=:condition, " +
                                                       "conditionDescription=:conditionDescription, " +
                                                       "numberInStock=:numberInStock, " +
                                                       "unitCost=:unitCost",
                        ExpressionAttributeNames:  {
                            '#condition': 'condition'
                        },
                        ExpressionAttributeValues: {
                            ":sku":                  productReq.sku,
                            ":title":                productReq.title,
                            ":description":          productReq.description,
                            ":condition":            productReq.condition,
                            ":conditionDescription": productReq.conditionDescription,
                            ":numberInStock":        productReq.numberInStock,
                            ":unitCost":             productReq.unitCost
                        },
                        ReturnValues:              "UPDATED_NEW"
                    };

                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

                    dynamoHelper.updateItem(productUpdateParams, credentials, function (err, product) {
                        if (err) {
                            console.log('Error updating product: ' + err.message);
                            reject("Error updating product");
                        }
                        else {
                            console.log('Product ' + productReq.title + ' updated');
                            resolve(product);
                        }
                    });
                } else {
                    console.log('Error retrieving credentials: err= ' );
                    console.log(err);
                    reject(err);
                }
            });
        });
    }

    del(event) {

        return new Promise(function (resolve, reject) {
            var productId = decodeURIComponent(event.pathParameters.id);

            console.log('Deleting product: ' + productId);

            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                // init parameter structure
                var tenantId = tokenManager.getTenantId(event);

                var deleteProductParams = {
                    TableName: productSchema.TableName,
                    Key:       {
                        tenantId:  tenantId,
                        productId: productId
                    }
                };
                if (credentials) {

                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(productSchema, credentials, configuration);

                    dynamoHelper.deleteItem(deleteProductParams, credentials, function (err, product) {
                        if (err) {
                            console.log('Error deleting product: ' + err.message);
                            reject("Error deleting product");
                        }
                        else {
                            console.log('Product ' + productId + ' deleted');
                            resolve({status: 'success'});
                        }
                    });
                } else {
                    console.log('Error retrieving credentials: err= ' );
                    console.log(err);
                    reject(err);
                }
            });
        });
    }
}

module.exports = productMgr;