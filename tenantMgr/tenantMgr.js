console.log("before configModule - process.env.stage = " + process.env.stage);

// Configure Environment
const configModule = require('../libs/config-helper.js');
var configuration = configModule.configure(process.env.stage);

const AWS = require('aws-sdk');

// Declare shared modules
const tokenManager = require('../libs/token-manager.js');
const DynamoDBHelper = require('../libs/dynamodb-helper.js');
const cognitoUsers = require('../libs/cognito-user.js');
const tmCommon = require('./tenantMgrCommon');
const RequestHelper = require('../libs/request-helper');
const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');

// Configure AWS Region
AWS.config.update({region: configuration.aws_region});



class tenantMgr {
    constructor(event) {
    }

    health(event) {
        console.log("User Manager Health Check");
        return new Promise((resolve, reject) => {
            resolve({service: 'Tenant Manager', isAlive: true});
        });
    }

// Create REST entry points
    getTenant(event) {
        console.log('Fetching tenant: ' + event.pathParameters.id);

        // init params structure with request params
        var tenantIdParam = {
            id: event.pathParameters.id
        };
        return new Promise(function (resolve, reject) {
            tokenManager.getCredentialsFromToken(event, function (err,credentials) {
                if (credentials) {

                        // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(tmCommon.tenantSchema, credentials, configuration);

                    dynamoHelper.getItem(tenantIdParam, credentials, function (err, tenant) {
                        if (err) {
                            console.log('Error getting tenant: ' + err.message);
                            reject('{"Error" : "Error getting tenant"}');
                        }
                        else {
                            console.log('Tenant ' + event.pathParameters.id + ' retrieved');
                            resolve(tenant);
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


    getTenants(event) {
        console.log('Fetching all tenants');

        return new Promise(function (resolve, reject) {

            tokenManager.getCredentialsFromToken(event, function(err,credentials) {
                var scanParams = {
                    TableName: tmCommon.tenantSchema.TableName,
                    FilterExpression: "#status = :active",
                    ExpressionAttributeNames:  {
                        '#status': 'status'
                    },
                    ExpressionAttributeValues: {
                        ":active": "Active"
                    }
                };

                if (credentials) {

                    // construct the helper object
                    var dynamoHelper = new DynamoDBHelper(tmCommon.tenantSchema, credentials, configuration);

                    dynamoHelper.scan(scanParams, credentials, function (error, tenants) {
                        if (error) {
                            console.log('Error retrieving tenants: ' + error.message);
                            reject('{"Error" : "Error retrieving tenants"}');
                        }
                        else {
                            var items = {items: tenants};
                            console.log('Tenants successfully retrieved items =');
                            console.log(items);
                            resolve(items);
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



    getTenantsSystem(event) {

        console.log('Fetching all tenants required to clean up infrastructure');
//Note: Reference Architecture not leveraging Client Certificate to secure system only endpoints. Please integrate the following endpoint with a Client Certificate.
//At least check that this is the system tenant ?

        var credentials = {};
        return new Promise(function (resolve, reject) {

            tokenManager.getSystemCredentials(function (err, systemCredentials) {
                if (err) {
                    reject('{"Error" : "Error retrieving systemCredentials"}');
                    return;
                }
                credentials = systemCredentials;
                var scanParams = {
                    TableName: tmCommon.tenantSchema.TableName,
                    FilterExpression: "#status = :active",
                    ExpressionAttributeNames:  {
                        '#status': 'status'
                    },
                    ExpressionAttributeValues: {
                        ":active": "Active"
                    }
                }

                // construct the helper object
                var dynamoHelper = new DynamoDBHelper(tmCommon.tenantSchema, credentials, configuration);

                dynamoHelper.scan(scanParams, credentials, function (error, tenants) {
                    if (error) {
                        console.log('Error retrieving tenants: ' + error.message);
                        reject('{"Error" : "Error retrieving tenants"}');
                    }
                    else {
                        var items = {items: tenants};
                        console.log('Tenants successfully retrieved items =');
                        console.log(items);
                        resolve(items);                    }

                });
            });
        });
    }



   update(event) {

       var tenant = JSON.parse(event.body);
       if (typeof tenant === "string") {
           tenant = JSON.parse(tenant); // stringified twice somewhere create object.
       }

       console.log('Updating tenant: ' + tenant.id);
       return new Promise(function (resolve, reject) {

           tokenManager.getCredentialsFromToken(event, function (err,credentials) {
               // init the params from the request data
               var keyParams = {
                   id: tenant.id
               }
               if (credentials) {

                   var tenantUpdateParams = {
                       TableName:                 tmCommon.tenantSchema.TableName,
                       Key:                       keyParams,
                       UpdateExpression:          "set " +
                                                      "companyName=:companyName, " +
                                                      "accountName=:accountName, " +
                                                      "ownerName=:ownerName, " +
                                                      "tier=:tier, " +
                                                      "#status=:status",
                       ExpressionAttributeNames:  {
                           '#status': 'status'
                       },
                       ExpressionAttributeValues: {
                           ":companyName": tenant.companyName,
                           ":accountName": tenant.accountName,
                           ":ownerName":   tenant.ownerName,
                           ":tier":        tenant.tier,
                           ":status":      tenant.status
                       },
                       ReturnValues:              "UPDATED_NEW"
                   };

                   // construct the helper object
                   var dynamoHelper = new DynamoDBHelper(tmCommon.tenantSchema, credentials, configuration);

                   dynamoHelper.updateItem(tenantUpdateParams, credentials, function (err, tenantSaved) {
                       if (err) {
                           console.log('Error updating tenant: ' + err.message);
                           reject("Error updating tenant");
                       }
                       else {
                           console.log('Tenant ' + tenant.title + ' updated');
                           resolve(tenantSaved);
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

        console.log('Deleting Tenant: ' + event.pathParameters.id);
        return new Promise(function (resolve, reject) {

            tokenManager.getCredentialsFromToken(event,  function (err,credentials) {

                if (err || credentials === null || credentials === undefined) {
                    // lets get error out of the way and reject now
                    errorMsg = 'Error retrieving credentials: ' + err.message;
                    console.log(errorMsg);
                    reject(errorMsg);
                }
                //ok we have have credentials - lets move on.
                // init parameter structure
                var tenantId = event.pathParameters.id;

                var deleteTenantParams = {
                    TableName: tmCommon.tenantSchema.TableName,
                    Key:       {
                        id: tenantId
                    }
                };
                var errorMsg = "";
                /*   steps ....
                        0. get tenant data
                        1. set tenant.status to deleting and deletedate = today
                        2. get list of tenant users
                        3. delete users
                        4. delete roles & policies
                        5. mark tentant.status = deleted?  or deleteItem?
                 */
                // Step 0.  Get Tenant data...
                var tenant = {};
                console.log("deleting tenant: step 0 - get get tenant details..");
                findTenantInfo(tenantId, credentials)
                    .then((data) => {
                        tenant = data;
                        console.log("deleting tenant: step 1 - set deleting status...");
                        // Step 1. set tenant.status to deleting and deletedate = today
                        return markTenantStatus(tenant, credentials, "Deleting")
                    })
                    .then(() => {
                        // Step 2. get list of tenant users
                        console.log("deleting tenant: step 2 - get list of users ..");
                        return getTenantUsers(tenant, credentials, tenant.UserPoolId);
                     })
                    .then( (users) => {
                        var items = users.items;
                        console.log("deleting tenant: step 3 - delete all users for tenant..");
                        return removeTenantUsers(items, tenant);
                    })
                    .then( async (user) => {
                        console.log("deleting tenant: step 4 - delete polices.");
                        // step 4. delete roles & policies

                        var params = {
                            "pool": {
                                "UserPool": {
                                    "Id": tenant.UserPoolId
                                }
                             },
                            "userPoolClient": user.client_id,
                            "identityPool": {
                                "IdentityPoolId": tenant.IdentityPoolId
                            },
                            "role": {
                                "systemAdminRole": tenant.systemAdminRole,
                                "systemSupportRole": tenant.systemSupportRole,
                                "trustRole": tenant.trustRole,
                            },
                            "policy": {
                                "systemAdminPolicy": tenant.systemAdminPolicy,
                                "systemSupportPolicy": tenant.systemSupportPolicy,
                            },
                            "addRoleToIdentity": '',
                            "user": user
                        };

                        var functionName = serviceDiscovery.getServiceName(process.env.PROJECT_NAME,'UserMgr','deleteTenantPolicies',process.env.stage);

                        var payLoad = {params: params};
                       return  RequestHelper.invokeLambda(functionName,payLoad)
                      })
                    .then((data) => {
                         console.log("deleting tenant: step 5 - mark tenant deleted.");
                        return  markTenantStatus(tenant, credentials, "Deleted")
                    })
                    .then(() => {
                        console.log('Tenant ' + tenantId + ' marked deleted');
                        resolve({status:true});
                    })
                    .catch((err) => {
                            errorMsg = 'Error delete user failure: ' + err.message;
                            console.log(errorMsg);
                            reject(errorMsg);
                    })
            });
        });
    }


}
function findTenantInfo(tenantId, credentials) {
    var tenantIdParam = {
        id: tenantId
    };
    return new Promise(function (resolve, reject) {
        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(tmCommon.tenantSchema, credentials, configuration);

        dynamoHelper.getItem(tenantIdParam, credentials, function (err, data) {
            console.log("findTenantInfo: check status of getItem..");
            if (err) {
                console.log('Error getting tenant: ' + err.message);
                reject('{"Error" : "Error getting tenant"}');
            } else {
                console.log('findTenantInfo: Tenant ' + tenantId + ' retrieved');
                resolve(data);
            }
        });
    });
}
function removeTenantUsers(items, tenant) {
    return new Promise(function (resolve, reject) {

        var adminUser = {};
        var status = 0;
        items.forEach(async (user) => {
            var payLoad = {
                userName:   tenant.userName,
                tenantId:   tenant.id,
                UserPoolId: tenant.UserPoolId
            };

            if (user.role == "TenantAdmin") {
                adminUser = user;
            }

            var functionName = serviceDiscovery.getServiceName(process.env.PROJECT_NAME,'UserMgr','deleteUser',process.env.stage);

            // step 3. delete users
          await  RequestHelper.invokeLambda(functionName, payLoad)
                .then((data) => {
                    console.log("invokeLambda returned success ");
                })
                .catch((err) => {
                    console.log("invokeLambda returned ERROR err = ");
                    console.log(err);
                    status += 1;
                })
        })
        if (status < items.length) {
            resolve(adminUser);
        } else {
            reject("Error deleting users");
        }
    });
}

/**
 * Extract a token from the header and return its embedded user pool id
 * @param event The request with the token
 * @returns The user pool id from the token
 */
function getUserPoolIdFromRequest(event) {
    var token = event.headers['Authorization'];
    var userPoolId;
    var decodedToken = tokenManager.decodeToken(token);
    if (decodedToken) {
        var pool = decodedToken.iss;
        userPoolId = pool.substring(pool.lastIndexOf("/") + 1);
    }
    return userPoolId;
};

function getTenantUsers(tenant, credentials, userPoolId) {
    return new Promise(function (resolve, reject) {

        cognitoUsers.getUsersFromPool(credentials, userPoolId, configuration.aws_region)
            .then(function (userList) {
                var users = {items: userList};
                resolve(users);
            })
            .catch(function (error) {
                console.log("getTenantUsers: rejected: error = ");
                console.log(error);
                reject("Error retrieving user list: " + error.message);
            });
    });
}

function markTenantStatus(tenant, credentials, newstatus) {
    var keyParams = {
        id: tenant.id
    }

    var now = new Date();

    var tenantUpdateParams = {
        TableName:                 tmCommon.tenantSchema.TableName,
        Key:                       keyParams,
        UpdateExpression:          "set " +
                                       "#status=:status, " +
                                        "statusChanged=:todaysdate ",
        ExpressionAttributeNames:  {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ":status":      newstatus,
            ":todaysdate":      now.toLocaleString(),
        },
        ReturnValues:              "UPDATED_NEW"
    };
    return new Promise(function (resolve, reject) {

        // construct the helper object
        var dynamoHelper = new DynamoDBHelper(tmCommon.tenantSchema, credentials, configuration);

        dynamoHelper.updateItem(tenantUpdateParams, credentials, function (err, tenantSaved) {
            if (err) {
                console.log('markTenantStatus: Error updating tenant: ' + err.message);
                reject("Error updating tenant: " + err.message);
            } else {
                resolve(tenantSaved);
            }
        });
    });

}
module.exports = tenantMgr;