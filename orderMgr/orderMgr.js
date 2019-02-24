const request = require('request');

const uuidV4 = require("uuidv4");

// Configure Environment
const configModule = require('../libs/config-helper.js');
var configuration = configModule.configure(process.env.stage);

const AWS = require('aws-sdk');

const Response = require("../libs/response-lib");

// Declare shared modules
const tokenManager = require('../libs/token-manager.js');
const DynamoDBHelper = require('../libs/dynamodb-helper.js');

// Configure AWS Region
AWS.config.update({region: configuration.aws_region});


var orderSchema = {
    TableName : configuration.table.order,
    KeySchema: [
        { AttributeName: "tenantId", KeyType: "HASH"},  //Partition key
        { AttributeName: "orderId", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "tenantId", AttributeType: "S" },
        { AttributeName: "orderId", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};
class orderMgr {
    constructor(event) {
        this.res = new Response();

        this.body = JSON.parse(event.body);
        this.bearerToken = event.headers['Authorization'];
        if (this.bearerToken) {
            this.tenantId = tokenManager.getTenantId(event);
        }

    }

    health(event) {
        console.log("Order Manager Health Check");
        return new Promise((resolve, reject) => {
            resolve({service: 'Order Manager', isAlive: true});
        });
    }

    getOrder(event) {
        console.log('Fetching order: ' + event.pathParameters.id);
        return new Promise(function (resolve, reject) {

            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                // init params structure with request params
                var tenantId = tokenManager.getTenantId(event);
                var orderId = decodeURIComponent(event.pathParameters.id);
                var params = {
                    tenantId: tenantId,
                    orderId:  orderId
                }
                if (credentials) {
                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

                    dynamoHelper.getItem(params, credentials, function (err, order) {
                        if (err) {
                            console.log('Error getting order: ' + err.message);
                            reject('Error getting order');
                        }
                        else {
                            console.log('Order ' + orderId + ' retrieved');
                            resolve(order);
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

    getOrders(event) {

        return new Promise(function (resolve, reject) {
            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                var tenantId = tokenManager.getTenantId(event);

                console.log('Fetching Orders for Tenant Id: ' + tenantId);

                var searchParams = {
                    TableName:                 orderSchema.TableName,
                    KeyConditionExpression:    "tenantId = :tenantId",
                    ExpressionAttributeValues: {
                        ":tenantId": tenantId
                    }
                };
                if (credentials) {
                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

                    dynamoHelper.query(searchParams, credentials, function (error, orders) {
                        if (error) {
                            console.log('Error retrieving orders: ' + error.message);
                            reject("Error retrieving orders");
                        } else {
                            console.log('Orders successfully retrieved');
                            var orderList = { items: orders };

                            resolve(orderList);
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
                var order = JSON.parse(event.body);
                if (typeof order === "string") {
                    order = JSON.parse(order); // stringified twice somewhere create object.
                }
                var tenantId = tokenManager.getTenantId(event);

                order.orderId = uuidV4();
                order.tenantId = tenantId;
                if (credentials) {

                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

                    dynamoHelper.putItem(order, credentials, function (err, order) {
                        if (err) {
                            console.log('Error creating new order: ' + err.message);
                            reject("Error creating order");
                        }
                        else {
                            console.log('Order ' + order.title + ' created');
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

            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                // init the params from the request data
                var orderReq = JSON.parse(event.body);
                if (typeof orderReq === "string") {
                    orderReq = JSON.parse(orderReq); // stringified twice somewhere create object.
                }
                var tenantId = tokenManager.getTenantId(event);

                var keyParams = {
                    tenantId: tenantId,
                    orderId:  orderReq.orderId
                }

                console.log('Updating Order Id: ' + orderReq.orderId);
                if (credentials) {
                    var orderUpdateParams = {
                        TableName:                 orderSchema.TableName,
                        Key:                       keyParams,
                        UpdateExpression:          "set " +
                                                       "productId=:productId, " +
                                                       "productSKU=:productSKU, " +
                                                       "productDescription=:productDescription, " +
                                                       "dateOrdered=:dateOrdered, " +
                                                       "orderedBy=:orderedBy, " +
                                                       "quantity=:quantity, " +
                                                       "unitCost=:unitCost",
                        ExpressionAttributeValues: {
                            ":productId":          orderReq.productId,
                            ":productSKU":         orderReq.productSKU,
                            ":productDescription": orderReq.productDescription,
                            ":dateOrdered":        orderReq.dateOrdered,
                            ":orderedBy":          orderReq.orderedBy,
                            ":quantity":           orderReq.quantity,
                            ":unitCost":           orderReq.unitCost
                        },
                        ReturnValues:              "UPDATED_NEW"
                    };

                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

                    dynamoHelper.updateItem(orderUpdateParams, credentials, function (err, orderUpdated) {
                        if (err) {
                            console.log('Error updating order: ' + err.message);
                            reject("Error updating order");
                        }
                        else {
                            console.log('Order ' + orderReq.title + ' updated');
                            resolve(orderUpdated);
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

        console.log('Deleting Order: ' + event.pathParameters.id);
        return new Promise(function (resolve, reject) {

            var orderId = decodeURIComponent(event.pathParameters.id);

            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                var tenantId = tokenManager.getTenantId(event);

                // init parameter structure
                var deleteOrderParams = {
                    TableName: orderSchema.TableName,
                    Key:       {
                        tenantId: tenantId,
                        orderId:  orderId
                    }
                };
                if (credentials) {

                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(orderSchema, credentials, configuration);

                    dynamoHelper.deleteItem(deleteOrderParams, credentials, function (err, order) {
                        if (err) {
                            console.log('Error deleting order: ' + err.message);
                            reject("Error deleting order");
                        }
                        else {
                            console.log('Order ' + orderId + ' deleted');
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

module.exports = orderMgr;