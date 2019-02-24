const Response = require("../libs/response-lib");

const configModule = require('../libs/config-helper.js');
var configuration = configModule.configure(process.env.stage);

// Declare shared modules
const tokenManager = require('../libs/token-manager.js');
const cognitoUsers = require('../libs/cognito-user.js');
const DynamoDBHelper = require('../libs/dynamodb-helper.js');

const sharedFunctions = require('./sharedfunctions');

class UserInternals {
    constructor(event) {
    };

    /**
     * Lookup user pool for any user - no user data returned
     */
    lookupPool(event) {

        var userName = event.userName;
        console.log('User lookupPool - userName = ');
        console.log(userName);

        return new Promise(function (resolve, reject) {
            tokenManager.getSystemCredentials(function (err, credentials) {
                if (err) {
                    console.log('getSystemCredentials returned err = ');
                    console.log(err);
                    reject('{"Error" : "Error retrieving systemCredentials"}');
                    return;
                }

                sharedFunctions.lookupUserPoolData(credentials, userName, null, true, function (err, user) {
                    if (err) {
                        console.log("lookupPool: callback error -  "+err.message);
                        reject({"Error": err.message});
                    } else {
                        if (user.length == 0)
                            reject({"Error": "User not found"});
                        else
                            resolve(user);
                    }
                });
            });
        });

    };


    /**
     * Provision a new system admin user
     */
    createSystem(event) {
        console.log("User createSystem");

        var user = event;
        user.tier = configuration.tier.system;
        user.role = configuration.userRole.systemAdmin;
        // get the credentials for the system user
        var credentials = {};
        return new Promise(function (resolve, reject) {
            tokenManager.getSystemCredentials(function (err, systemCredentials) {
                if (err) {
                    console.log('getSystemCredentials returned err = ');
                    console.log(err);
                    reject('{"Error" : "Error retrieving systemCredentials"}');
                    return;
                }

                if (systemCredentials) {
                    credentials = systemCredentials;
                    // provision the tenant admin and roles
                    provisionAdminUserWithRoles(user, credentials, configuration.userRole.systemAdmin, configuration.userRole.systemUser,
                        function (err, result) {
                            if (err) {
                                var msg = err.message;

                                reject(msg);
                            }
                            else {
                                resolve(result);
                            }
                        });
                }
                else {
                    console.log("Error Obtaining System Credentials");
                    reject("Error provisioning system admin user");
                }
            });
        });

    }



    /**
     * Provision a new tenant admin user
     */
    reg(event) {
        console.log("User reg");
        var user = event;
       return new Promise(function (resolve, reject) {

            // get the credentials for the system user
            var credentials = {};
            tokenManager.getSystemCredentials(function (err, systemCredentials) {
                if (err) {
                    console.log('getSystemCredentials returned err = ');
                    console.log(err);
                    reject('{"Error" : "Error retrieving systemCredentials"}');
                    return;
                }

                credentials = systemCredentials;

                // provision the tenant admin and roles
                provisionAdminUserWithRoles(user, credentials, configuration.userRole.tenantAdmin, configuration.userRole.tenantUser,
                    function (err, result) {
                        if (err) {
                            reject("Error provisioning tenant admin user");
                        }
                        else
                            resolve(result);
                    });
            });
        });

    }

    deleteUser(event) {
        var userName = event.userName;
        var tenantId = event.tenantId;
        var UserPoolId = event.UserPoolId;

        return new Promise(function (resolve, reject) {
            tokenManager.getSystemCredentials(function (err, credentials) {
                if (err) {
                    console.log('getSystemCredentials returned err = ');
                    console.log(err);
                    reject('{"Error" : "Error retrieving systemCredentials"}');
                    return;
                }

                sharedFunctions.deleteUser(credentials, UserPoolId, tenantId, userName)
                    .then(function (result) {
                        console.log('User ' + userName + ' deleted ');
                        resolve({status: 'success'});
                    })
                    .catch(function (error) {
                        console.log('Error deleting  user: ' + err.message);
                        reject({"Error": "Error deleting user"});
                    });


            });
        });
    }

    deleteTenantPolicies(event) {

        return new Promise(function (resolve, reject) {
            tokenManager.getSystemCredentials(function (err, credentials) {
                if (err) {
                    console.log('getSystemCredentials returned err = ');
                    console.log(err);
                    reject('{"Error" : "Error retrieving systemCredentials"}');
                    return;
                }

                var params = event.params;

                removeRolesPolicies(params, credentials)
                        .then((cleanupStatus) => {
                            console.log("results of cleanup process. should all have ok status");
                            console.log(cleanupStatus);
                            resolve({status:true});
                            return {status:true};
                        })
                        .catch((cleanupStatus) => {
                            console.log("ERROR: results of cleanup process.");
                            console.log(cleanupStatus);
                            reject(cleanupStatus);
                            return cleanupStatus;
                        });

            });
        });
    }
}

module.exports = UserInternals;

/**
 * Provision an admin user and the associated policies/roles
 * @param user The user being created
 * @param credentials Credentials to use for provisioning
 * @param adminPolicyName The name of of the admin policy to provisioned
 * @param userPolicyName The name of the user policy to be provisioned
 * @param callback Returns an object with the results of the provisioned items
 */

function provisionAdminUserWithRoles(user, credentials, adminPolicyName, userPolicyName, callback) {
    // vars that are used across multiple calls
    var createdUserPoolData = {};
    var trustPolicyTemplate = {};
    var createdTrustPolicyRole = {};
    var createdUserPoolClient = {};
    var createdIdentityPool = {};
    var createdAdminPolicy = {};
    var createdAdminRole = {};
    var createdUserPolicy = {};
    var createdUserRole = {};

    var aws_account = tokenManager.getAccountId();
    // setup params for template generation
    var policyCreationParams = {
        tenantId: user.tenant_id,
        accountId: aws_account,
        region: configuration.aws_region,
        tenantTableName: configuration.table.tenant,
        userTableName: configuration.table.user,
        productTableName: configuration.table.product,
        orderTableName: configuration.table.order
    };

    // init role based on admin policy name
    user.role = adminPolicyName;

    // see if this user is already in the system
    sharedFunctions.lookupUserPoolData(credentials, user.userName, user.tenant_id, true, function(err, userPoolData) {
        if (!err){
            console.log('provisionAdminUserWithRoles:  {"Error" : "User already exists"}');
            callback( new Error ('User already exists!'));
        }
        else {
            // create the new user
           cognitoUsers.createUserPool(user.tenant_id)
                .then(function (poolData) {
                    createdUserPoolData = poolData;

                    var clientConfigParams = {
                        "ClientName": createdUserPoolData.UserPool.Name,
                        "UserPoolId": createdUserPoolData.UserPool.Id
                    };

                    // add the user pool to the policy template configuration (couldn't add until here)
                    policyCreationParams.userPoolId = createdUserPoolData.UserPool.Id;

                    // crete the user pool for the new tenant
                    return cognitoUsers.createUserPoolClient(clientConfigParams);
                })
                .then(function(userPoolClientData) {
                    createdUserPoolClient = userPoolClientData;
                    var identityPoolConfigParams = {
                        "ClientId": userPoolClientData.UserPoolClient.ClientId,
                        "UserPoolId": userPoolClientData.UserPoolClient.UserPoolId,
                        "Name": userPoolClientData.UserPoolClient.ClientName
                    };
                    return cognitoUsers.createIdentityPool(identityPoolConfigParams);
                })
                .then(function(identityPoolData) {
                    createdIdentityPool = identityPoolData;

                    // create and populate policy templates
                    trustPolicyTemplate = cognitoUsers.getTrustPolicy(identityPoolData.IdentityPoolId);

                    // get the admin policy template
                    var adminPolicyTemplate = cognitoUsers.getPolicyTemplate(adminPolicyName, policyCreationParams);

                    // setup policy name
                    var policyName = user.tenant_id + '-' + adminPolicyName + 'Policy';

                    // configure params for policy provisioning calls
                    var adminPolicyParams = {
                        "policyName": policyName,
                        "policyDocument": adminPolicyTemplate
                    };

                    return cognitoUsers.createPolicy(adminPolicyParams)
                })
                .then(function (adminPolicy) {
                    createdAdminPolicy = adminPolicy;

                    return sharedFunctions.createNewUser(credentials, createdUserPoolData.UserPool.Id, createdIdentityPool.IdentityPoolId, createdUserPoolClient.UserPoolClient.ClientId, user.tenant_id, user);
                })
                .then(function() {
                    // get the admin policy template
                    var userPolicyTemplate = cognitoUsers.getPolicyTemplate(userPolicyName, policyCreationParams);
                    // setup policy name
                    var policyName = user.tenant_id + '-' + userPolicyName + 'Policy';

                    // configure params for policy provisioning calls
                    var userPolicyParams = {
                        "policyName": policyName,
                        "policyDocument": userPolicyTemplate
                    };

                    return cognitoUsers.createPolicy(userPolicyParams)
                })
                .then(function(userPolicy) {
                    createdUserPolicy = userPolicy;

                    var adminRoleName = user.tenant_id + '-' + adminPolicyName;
                    var adminRoleParams = {
                        "policyDocument": trustPolicyTemplate,
                        "roleName": adminRoleName
                    };

                    return cognitoUsers.createRole(adminRoleParams);
                })
                .then(function(adminRole) {
                    createdAdminRole = adminRole;

                    var userRoleName = user.tenant_id + '-' + userPolicyName;
                    var userRoleParams = {
                        "policyDocument": trustPolicyTemplate,
                        "roleName": userRoleName
                    };

                    return cognitoUsers.createRole(userRoleParams)
                })
                .then(function(userRole) {
                    createdUserRole = userRole;
                    var trustPolicyRoleName = user.tenant_id + '-Trust';
                    var trustPolicyRoleParams = {
                        "policyDocument": trustPolicyTemplate,
                        "roleName": trustPolicyRoleName
                    };

                    return cognitoUsers.createRole(trustPolicyRoleParams)
                })
                .then(function(trustPolicyRole) {
                    createdTrustPolicyRole = trustPolicyRole;
                    var adminPolicyRoleParams = {
                        PolicyArn: createdAdminPolicy.Policy.Arn,
                        RoleName: createdAdminRole.Role.RoleName
                    };

                    return cognitoUsers.addPolicyToRole(adminPolicyRoleParams);
                })
                .then(function() {
                    var userPolicyRoleParams = {
                        PolicyArn: createdUserPolicy.Policy.Arn,
                        RoleName: createdUserRole.Role.RoleName
                    };

                    return cognitoUsers.addPolicyToRole(userPolicyRoleParams);
                })
                .then(function() {
                    var addRoleToIdentityParams = {
                        "IdentityPoolId": createdIdentityPool.IdentityPoolId,
                        "trustAuthRole": createdTrustPolicyRole.Role.Arn,
                        "rolesystem": createdAdminRole.Role.Arn,
                        "rolesupportOnly": createdUserRole.Role.Arn,
                        "ClientId": createdUserPoolClient.UserPoolClient.ClientId,
                        "provider": createdUserPoolClient.UserPoolClient.UserPoolId,
                        "adminRoleName": adminPolicyName,
                        "userRoleName": userPolicyName
                    };
                    return cognitoUsers.addRoleToIdentity(addRoleToIdentityParams);
                })
                .then(function(identityRole) {
                    var returnObject = {
                        "pool": createdUserPoolData,
                        "userPoolClient": createdUserPoolClient,
                        "identityPool": createdIdentityPool,
                        "role": {
                            "systemAdminRole": createdAdminRole.Role.RoleName,
                            "systemSupportRole": createdUserRole.Role.RoleName,
                            "trustRole": createdTrustPolicyRole.Role.RoleName
                        },
                        "policy": {
                            "systemAdminPolicy": createdAdminPolicy.Policy.Arn,
                            "systemSupportPolicy": createdUserPolicy.Policy.Arn,
                        },
                        "addRoleToIdentity": identityRole
                    };
                    callback(null, returnObject)
                })
                .catch (async function(err) {
                    console.log('provisionAdminUserWithRoles:cognitoUsers.createUserPool:  got err = ');
                    console.log(err);
                    var params = buildObj(createdUserPoolData, createdUserPoolClient,
                        createdIdentityPool, createdAdminRole, createdUserRole,
                        createdTrustPolicyRole , createdAdminPolicy, createdUserPolicy,
                        '', user);
                    console.log("start cleanup of failed Onboarding. ");
                    try {
                        let status = await cleanupFailedOnboarding(params);
                        callback(err);
                    }
                    catch(error) {
                        console.log('Cleanup error = ');
                        console.log(error)
                        callback(err);

                    }
                });
        }
    });
}

function buildObj(createdUserPoolData, createdUserPoolClient, createdIdentityPool, createdAdminRole, createdUserRole, createdTrustPolicyRole , createdAdminPolicy, createdUserPolicy, identityRole, user) {

    var returnObject = {
        "pool": createdUserPoolData,
        "userPoolClient": createdUserPoolClient,
        "identityPool": createdIdentityPool,
        "role": {
            "systemAdminRole": createdAdminRole.Role.RoleName,
            "systemSupportRole": createdUserRole.Role.RoleName,
            "trustRole": createdTrustPolicyRole.Role.RoleName
        },
        "policy": {
            "systemAdminPolicy": createdAdminPolicy.Policy.Arn,
            "systemSupportPolicy": createdUserPolicy.Policy.Arn,
        },
        "addRoleToIdentity": identityRole,
        "user": user
    };
    return returnObject;
}

var cleanupStatus = {}; // holds cleanupstatus of each function
function updStatus(key,type, value) {
    cleanupStatus[key] = {'type': type, 'value':value};
}

function deleteUserFromDB(user,credentials) {
    return new Promise((resolve, reject) => {
        var dynamoHelper = new DynamoDBHelper(sharedFunctions.userSchema, credentials, configuration);
        var deleteOrderParams = {
            TableName: sharedFunctions.userSchema.TableName,
            Key:       {
                tenant_id: user.tenant_id,
                id:        user.userName
            }
        };

        dynamoHelper.deleteItem(deleteOrderParams, credentials, function (err, deletedUser) {
            if (err) {
                console.log('deleteItem: db got err = ');
                console.log(err);
                reject(err);
                updStatus('user','err',err);
            }
            else {
                console.log('deleteItem: db put good. deleteUser = ');
                console.log(deletedUser);
                resolve(user);
                updStatus('user','ok',user);
            }
        });
    });
}

function removeRolesPolicies(params,credentials) {
    return new Promise((resolve, reject) => {
        console.log('removeRolesPolicies: params = ');
        console.log(params);

        var user = params.user;
        var UserPoolId = params.pool.UserPool.Id;
        var IdentityPoolId = params.identityPool.IdentityPoolId;
        var systemAdminRole = params.role.systemAdminRole; // Role Name
        var systemSupportRole = params.role.systemSupportRole; // Role Name
        var trustRole = params.role.trustRole;  // Role Name
        var systemAdminPolicy = params.policy.systemAdminPolicy;  // ARN
        var systemSupportPolicy = params.policy.systemSupportPolicy;  // ARN

        // use then/catch for each - so we note what specific funtion succeded / failed.
        // a signle catch would stop everything and only say we got an error.

        cognitoUsers.deleteUserPool(UserPoolId)
            .then((user) => { updStatus('deleteUserPool','ok',user);
                return cognitoUsers.deleteIdentityPool(IdentityPoolId)
            })
            .catch((err) => { updStatus('deleteUserPool','err',err);
                return cognitoUsers.deleteIdentityPool(IdentityPoolId)
            })
            .then((user) => { updStatus('deleteIdentityPool','ok',user);
                return cognitoUsers.detachRolePolicy(systemAdminPolicy, systemAdminRole)
            })
            .catch((err) => { updStatus('deleteIdentityPool','err',err);
                return cognitoUsers.detachRolePolicy(systemAdminPolicy, systemAdminRole)
            })
            .then((user) => { updStatus('detachSystemRolePolicy','ok',user);
                return cognitoUsers.detachRolePolicy(systemSupportPolicy, systemSupportRole)
            })
            .catch((err) => { updStatus('detachSystemRolePolicy','err',err);
                return cognitoUsers.detachRolePolicy(systemSupportPolicy, systemSupportRole)
            })
            .then((user) => { updStatus('detachSupportRolePolicy','ok',user);
                return cognitoUsers.deletePolicy(systemAdminPolicy)
            })
            .catch((err) => { updStatus('detachSupportRolePolicy','err',err);
                return cognitoUsers.deletePolicy(systemAdminPolicy)
            })
            .then((user) => { updStatus('deleteAdminPolicy','ok',user);
                return cognitoUsers.deletePolicy(systemSupportPolicy)
            })
            .catch((err) => { updStatus('deleteAdminPolicy','err',err);
                return cognitoUsers.deletePolicy(systemSupportPolicy)
            })
            .then((user) => { updStatus('deleteSupportPolicy','ok',user);
                return cognitoUsers.deleteRole(systemAdminRole)
            })
            .catch((err) => { updStatus('deleteSupportPolicy','err',err);
                return cognitoUsers.deleteRole(systemAdminRole)
            })
            .then((user) => { updStatus('deleteAdminPolicy','ok',user);
                return cognitoUsers.deleteRole(systemSupportRole)
            })
            .catch((err) => { updStatus('deleteAdminPolicy','err',err);
                return cognitoUsers.deleteRole(systemSupportRole)
            })
            .then((user) => { updStatus('deleteSupportRole','ok',user);
                return cognitoUsers.deleteRole(trustRole)
            })
            .catch((err) => { updStatus('deleteSupportRole','err',err);
                return cognitoUsers.deleteRole(trustRole)
            })
            .then((user) => { updStatus('deleteTrustRole','ok',user);
                resolve(cleanupStatus);
                return cleanupStatus;
            })
            .catch((err) => { updStatus('deleteTrustRole','err',err);
                reject(cleanupStatus);
                return cleanupStatus;
            });
    });

 }
function cleanupFailedOnboarding(params) {
    console.log("Cleaning up Identity Reference Architecture: ");

    return new Promise((resolve, reject) => {

        tokenManager.getSystemCredentials(function (err, credentials) {
            if (err) {
                console.log('getSystemCredentials returned err = ');
                console.log(err);
                reject('{"Error" : "Error retrieving systemCredentials"}');
                return;
            }

            var user = params.user;


            // use then/catch for each - so we note what specific funtion succeded / failed.
            // a signle catch would stop everything and only say we got an error.


            deleteUserFromDB(user, credentials)
                .then((user) => { updStatus('user','ok',user);
                    return removeRolesPolicies(params, credentials)
                })
                .catch((err) => { updStatus('user','err',user);
                    return removeRolesPolicies(params, credentials)
                })
                .then((cleanupStatus) => {
                    resolve(cleanupStatus);
                    return cleanupStatus;
                })
                .catch((cleanupStatus) => {
                    reject(cleanupStatus);
                    return cleanupStatus;
                });

        });
        console.log('AFTER getCredentialsFromToken ');

    });
}
