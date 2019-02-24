
// Configure Environment
const configModule = require('../libs/config-helper.js');
var configuration = configModule.configure(process.env.stage);

const Response = require("../libs/response-lib");

// Declare shared modules
const tokenManager = require('../libs/token-manager.js');

const DynamoDBHelper = require('../libs/dynamodb-helper.js');
const cognitoUsers = require('../libs/cognito-user.js');
const sharedFunctions = require('./sharedfunctions');

class UserMgr {
    constructor(event) {
    }

    health(event) {
        console.log("User Manager Health Check");
        return new Promise((resolve, reject) => {
            resolve({service: 'User Manager', isAlive: true});
        });
    }

    /**
     * Get user attributes
     */
    get(event) {
        console.log('Getting user id: ' + event.pathParameters.id);
        return new Promise(function (resolve, reject) {
            tokenManager.getCredentialsFromToken(event, function (err, credentials) {
                // get the tenant id from the request
                if (credentials) {

                        var tenantId = tokenManager.getTenantId(event);

                    sharedFunctions.lookupUserPoolData(credentials, decodeURIComponent(event.pathParameters.id), tenantId, false, function (err, user) {
                        if (err) {
                            console.log("lookupPool: callback error ");
                            reject({"Error": "Error getting user"});
                        } else {
                            cognitoUsers.getCognitoUser(credentials, user, function (err, user) {
                                if (err) {
                                    console.log("getCognitoUser: callback error ");
                                    reject('Error lookup user user: ' + event.pathParameters.id);
                                }
                                else {
                                   resolve(user);
                                }
                            })
                        }
                    });
                } else {
                    console.log('Error retrieving credentials: err=' );
		            console.log(err);
                    reject(err);
                }
            });
        });

    }

    /**
     * Get a list of users using a tenant id to scope the list
     */
    getUsers(event) {
        console.log("User getUsers");
        return new Promise(function (resolve, reject) {
            tokenManager.getCredentialsFromToken(event, function (err, credentials) {

                if (credentials) {

                    var userPoolId = getUserPoolIdFromRequest(event);
                    cognitoUsers.getUsersFromPool(credentials, userPoolId, configuration.aws_region)
                        .then(function (userList) {
                            var users = { items: userList };
                            resolve(users);
                        })
                        .catch(function (error) {
                            console.log("getUsers: rejected: error = ");
                            console.log(error);
                            reject("Error retrieving user list: " + error.message);
                        });
                } else {
                    console.log('Error retrieving credentials: err=' );
		            console.log(err);
                    reject(err);
                }
            });
        });

    }

    /**
     * Create a new user
     */
    create(event) {
        return new Promise(function (resolve, reject) {
            tokenManager.getCredentialsFromToken(event, function (err, credentials) {
                var user = JSON.parse(event.body);
                if (typeof user === "string") {
                    user = JSON.parse(user); // stringified twice somewhere create object.
                }
                console.log('Creating user: user = ');
                console.log(user);
                if (credentials) {

                    // extract requesting user and role from the token
                    var authToken = tokenManager.getRequestAuthToken(event);
                    var decodedToken = tokenManager.decodeToken(authToken);
                    var requestingUser = decodedToken.email;
                    user.tier = decodedToken['custom:tier'];
                    user.tenant_id = decodedToken['custom:tenant_id'];

                    // get the user pool data using the requesting user
                    // all users added in the context of this user
                    sharedFunctions.lookupUserPoolData(credentials, requestingUser, user.tenant_id, false, function (err, userPoolData) {
                        // if the user pool found, proceed
                        if (!err) {
                            sharedFunctions.createNewUser(credentials, userPoolData.UserPoolId, userPoolData.IdentityPoolId, userPoolData.client_id, user.tenant_id, user)
                                .then(function (createdUser) {
                                    console.log('User ' + user.userName + ' created');
                                    resolve({status: 'success'});
                                })
                                .catch(function (err) {
                                    console.log('Error creating new user in DynamoDB: ' + err.message);
                                    reject({"message": err.message});
                                })
                        }
                        else {
                            reject({"Error": "User pool not found"});
                        }
                    });
                } else {
                    console.log('Error retrieving credentials: err=' );
		    console.log(err);
                    reject(err);
                }
            });
        });

    }


    /**
     * Enable a user that is currently disabled
     */
    enable(event) {
        console.log("User enable");
        return new Promise(function (resolve, reject) {
            updateUserEnabledStatus(event, true, function (err, result) {
                if (err)
                    reject('Error enabling user');
                else
                    resolve(result);
            });
        });
    }


    /**
     * Disable a user that is currently enabled
     */
    disable(event) {
        console.log("User disable");
        return new Promise(function (resolve, reject) {
            updateUserEnabledStatus(event, false, function (err, result) {
                if (err)
                    reject('Error disabling user');
                else
                    resolve(result);
            });
        });
    }


    /**
     * Update a user's attributes
     */
    update(event) {
        console.log("User update");
        return new Promise(function (resolve, reject) {
            var user = JSON.parse(event.body);
            if (typeof user === "string") {
                user = JSON.parse(user); // stringified twice somewhere create object.
            }
            tokenManager.getCredentialsFromToken(event, function (err, credentials) {
                // get the user pool id from the request
                if (credentials) {

                    var userPoolId = getUserPoolIdFromRequest(event);

                    // update user data
                    cognitoUsers.updateUser(credentials, user, userPoolId, configuration.aws_region)
                        .then(function (updatedUser) {
                            resolve(updatedUser);
                        })
                        .catch(function (err) {
                            reject("Error updating user: " + err.message);
                        });
                } else {
                    console.log('Error retrieving credentials: err=' );
		    console.log(err);
                    reject(err);
                }
            });
        });
    }

    del(event) {
        return new Promise(function (resolve, reject) {
            var userName = decodeURIComponent(event.pathParameters.id);
            console.log('deleting user id: ' + event.pathParameters.id);
            tokenManager.getCredentialsFromToken(event, function (err, credentials) {
                if (credentials) {

                    // get the tenant id from the request
                    var tenantId = tokenManager.getTenantId(event);

                    // see if the user exists in the system
                    sharedFunctions.lookupUserPoolData(credentials, userName, tenantId, false, function (err, userPoolData) {
                        var userPool = userPoolData;
                        // if the user pool found, proceed
                        if (err) {
                            reject("User does not exist");
                        }
                        else {
                            sharedFunctions.deleteUser(credentials,userPool.UserPoolId, tenantId, userName)
                                .then(function (result) {
                                    console.log('User ' + userName + ' deleted ');
                                    resolve({status: 'success'});
                                })
                                .catch(function (error) {
                                    console.log('Error deleting  user: ' + err.message);
                                    reject({"Error": "Error deleting user"});
                                });
                        }
                    });
                } else {
                    console.log('Error retrieving credentials: err=' );
		    console.log(err);
                    reject(err);
                }
            });
        });
    }
}

/**
 * Enable/disable a user
 * @param event The request with the user information
 * @param enable True if enabling, False if disabling
 * @param callback Return results of applying enable/disable
 */
function updateUserEnabledStatus(event, enable, callback) {
    var user = JSON.parse(event.body);
    if (typeof user === "string") {
        user = JSON.parse(user); // stringified twice somewhere create object.
    }

    tokenManager.getCredentialsFromToken(event, function (err, credentials) {
        // get the tenant id from the request
        if (credentials) {

                var tenantId = tokenManager.getTenantId(event);
            // Get additional user data required for enabled/disable
            sharedFunctions.lookupUserPoolData(credentials, user.userName, tenantId, false, function (err, userPoolData) {
                var userPool = userPoolData;

                // if the user pool found, proceed
                if (err) {
                    callback(err);
                }
                else {
                    // update the user enabled status
                    cognitoUsers.updateUserEnabledStatus(credentials, userPool.UserPoolId, user.userName, enable)
                        .then(function () {
                            callback(null, {status: 'success'});
                        })
                        .catch(function (err) {
                            callback(err);
                        });
                }
            });
        } else {
                    console.log('Error retrieving credentials: err=' );
		    console.log(err);
                    reject(err);
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

module.exports = UserMgr;
