'use strict';

// Declare library dependencies
const jwtDecode = require('jwt-decode');
const request = require('request');
const async = require('async');
const AWS = require('aws-sdk');


//Configure Environment
const configModule = require('./config-helper.js');
var configuration = configModule.configure(process.env.stage);
const RequestHelper = require('../libs/request-helper');
const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');

// TODO: replace temporary cache with real cache
var tokenCache = {};

/**
 * Extract an id token from a request, decode it and extract the tenant
 * id from the token.
 * @param event A request
 * @returns A tenant Id
 */
module.exports.getTenantId = function (event) {
    var tenantId = '';
    var bearerToken = event.headers['Authorization'];
    if (bearerToken) {
        bearerToken = bearerToken.substring(bearerToken.indexOf(' ') + 1);
        var decodedIdToken = jwtDecode(bearerToken);
        if (decodedIdToken)
            tenantId = decodedIdToken['custom:tenant_id'];
    }
    return tenantId;
}


/**
 * Extract an id token from a request, decode it and extract the user role
 * id from the token.
 * @param req A request
 * @returns A role
 */
module.exports.getUserRole = function(event, callback) {

    var bearerToken = event.headers['Authorization'];
    if (bearerToken) {
        bearerToken = bearerToken.substring(bearerToken.indexOf(' ') + 1);
        var decodedIdToken = jwtDecode(bearerToken);
        if (decodedIdToken)
            callback(decodedIdToken['custom:role']);
        else
            callback('unkown');
    }
}


/**
 * Decode and token and extract the user's full name from
 * the token.
 * @param idToken A bearer token
 * @returns The user's full name
 */
module.exports.getUserFullName = function(idToken) {
    var userFullName = '';
    if (idToken) {
        var decodedIdToken = jwtDecode(idToken);
        if (decodedIdToken)
            userFullName = {'firstName': decodedIdToken.given_name, 'lastName': decodedIdToken.family_name};
    }
    return userFullName;
}

/**
 * Get the authorization token from a request
 * @param req The request with the authorization header
 * @returns The user's email address
 */
module.exports.getRequestAuthToken = function(event) {
    authToken = '';
    var authHeader = event.headers['Authorization'];
    if (authHeader)
        var authToken = authHeader.substring(authHeader.indexOf(' ') + 1);
    return authToken;
}


/**
 * Decode and token and extract the token
 * @param bearerToken A bearer token
 * @returns The user's full name
 */
module.exports.decodeToken = function(bearerToken) {
    var resultToken = {};
    if (bearerToken) {
        var decodedIdToken = jwtDecode(bearerToken);
        if (decodedIdToken)
            resultToken = decodedIdToken;
    }
    return resultToken;
}

/**
 * Decode token and validate access
 * @param bearerToken A bearer token
 * @returns The users access is provided
 */
module.exports.checkRole = function(bearerToken) {
    var resultToken = {};
    if (bearerToken) {
        var decodedIdToken = jwtDecode(bearerToken);
        if (decodedIdToken)
            var resultToken = decodedIdToken['custom:role'];
    }
    return resultToken;

}

/**
 * Decode and token and extract the token
 * @param bearerToken A bearer token
 * @returns The user's full name
 */
module.exports.decodeOpenID = function(bearerToken) {
    var resultToken = {};
    if (bearerToken) {
        var decodedIdToken = jwtDecode(bearerToken);
        if (decodedIdToken)
            resultToken = decodedIdToken;
    }
    return resultToken;
}

/**
 * Get access credential from the passed in request
 * @param event A request
 * @returns The access credentials
 */
module.exports.getCredentialsFromToken = function (event, updateCredentials) {
    var bearerToken = event.headers['Authorization'];
    if (bearerToken) {
        var tokenValue = bearerToken.substring(bearerToken.indexOf(' ') + 1);
        if (!(tokenValue in tokenCache)) {
            var decodedIdToken = jwtDecode(tokenValue);
            var userName = decodedIdToken['cognito:username'];
            async.waterfall([
                function(callback) {
                    getUserPoolWithParams(userName, callback)
                },
                function(userPool, callback) {
                  authenticateUserInPool(userPool, tokenValue, callback)
                }
            ], function(error, results) {
                if (error) {
                    console.log('Error fetching credentials for user');
                    console.log(error);
                    var err = {statusCode: error.statusCode,
                                message: error.message,
                                code: error.code};
                    updateCredentials(err, null);
                    return;
                }
                else {
                    tokenCache[tokenValue] = results;
                    updateCredentials(null, results);
                    return;
                }
            });
        }
        else if (tokenValue in tokenCache) {
            updateCredentials(null, tokenCache[tokenValue]);
            return;
        }
    } else {
        console.log('Error fetching credentials for user')
        var err = {statusCode: 401,
            message: "No Authorization",
            code: "bad header"};
        updateCredentials(err, null);
        return;
    }

};

/**
 * Lookup the user pool from a user name
 * @param user The username to lookup
 * @param callback Function called with found user pool
 */
module.exports.getUserPool = function(userName, callback) {
    // Create URL for user-manager request

   // functionName = 'SaaSServerless-UserMgr-dev-lookupPool';
    var functionName = serviceDiscovery.getServiceName(process.env.PROJECT_NAME,'UserMgr','lookupPool',process.env.stage);

    var payLoad = {userName: userName};


    RequestHelper.invokeLambda(functionName,payLoad)
        .then((data) => {
            callback(null,data);
        })
        .catch((err) => {
            console.log("invokeLambda returned ERROR err = ");
            console.log(err);
            callback(err);
        })

}

/**
 * Lookup the user pool from a user name
 * @param user The username to lookup
 * @param idToken Identity token
 * @return params object with user pool and idToken
 */
function getUserPoolWithParams(userName, callback) {


//    functionName = 'SaaSServerless-UserMgr-dev-lookupPool';
    var functionName = serviceDiscovery.getServiceName(process.env.PROJECT_NAME,'UserMgr','lookupPool',process.env.stage);

    var payLoad = {userName: userName};


    RequestHelper.invokeLambda(functionName,payLoad)
        .then((data) => {
            callback(null,data);
        })
        .catch((err) => {
            console.log("invokeLambda returned ERROR err = ");
            console.log(err);
            callback(err);
            /***** old versuib
             *  var err = {
                    statusCode: response.statusCode,
                    statusMessage: response.statusMessage,
                    message: body.Error ? body.Error : ''
                }
             */
        })
}

/**
 * Lookup the user pool from a user name
 * @param user The username to lookup
 * @param callback Function called with found user pool
 */
module.exports.getInfra = function(input, callback) {
    // Create URL for user-manager request
    // var userURL = userURL + '/system/' + userName;
    var tenantsUrl   = configuration.url.tenant + 's/system/';
    request({
        url: tenantsUrl,
        method: "GET",
        json: true,
        headers: {
            "content-type": "application/json",
        }
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            callback(null, body);
        }
        else {
            if (!error) {
                var lookupError = new Error("Failed looking up infra: " + response.body.Error);
                callback(lookupError, response);
            }
            else {
                callback(error, response)
            }
        }
    });
}

/**
 * Perform an HTTP Request
 * @param protocol sring
 * @param domain string
 * @param path string
 * @param method string
 * @param headers json object
 * @param json true/false
 * @return Fire off request and return result
 */
module.exports.fireRequest = function(event, callback) {

    var protocol = event.protocol;
    var path = event.path;
    var delimiter = '://';
    var domain = event.domain;
    var url = protocol + delimiter + domain + path;
    // fire the request
    request({
        url: url,
        method: event.method,
        json: true,
        headers: {
            "content-type": "application/json",
        }
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            callback(body);
        }
        else {
            callback(null, 'Error making request. \nError: ' + error);
        }
    });
};



/**
 * Authenticate the user in the user pool
 * @param userPool The pool to use for authentication
 * @param idToken The id token for this session
 * @param callback The callback for completion
 */
function authenticateUserInPool(userPool, idToken, callback) {
    var decodedIdToken = jwtDecode(idToken);
    var provider = decodedIdToken.iss;
    provider = provider.replace('https://', '');
    var params = {
        token: idToken,
        provider: provider,
        IdentityPoolId: userPool.IdentityPoolId
    }
    var getIdentity = getId(params, function (err, data) {
        if (err) {
            console.log('authenticateUserInPool: from getId: got err =');
            console.log(err);
            callback( err);
        }
        else {
           var params = {
                token: idToken,
                IdentityId: data.IdentityId,
                provider: provider
            }
            var returnedIdentity = data;
            var getCredentials = getCredentialsForIdentity(params, function (err, data) {
                if (err) {
                    console.log('authenticateUserInPool: from getCredentialsForIdentity:  err');
                    callback( err);
                } else {
                    var returnedCredentials = data;

                    // put claim and user full name into one response
                    callback(null, {"claim": returnedCredentials.Credentials});
                }
            })
        }

    })
}

/**
 * Get AWS Credentials with Cognito Federated Identity and ID Token
 * @param IdentityPoolId The Identity Pool ID
 * @param idToken The id token for this session
 * @param callback The callback for completion
 */
function getCredentialsForIdentity(event, callback) {
    var cognitoidentity = new AWS.CognitoIdentity({apiVersion: '2014-06-30',region: configuration.aws_region});
    var params = {
        IdentityId: event.IdentityId, /* required */
        //CustomRoleArn: 'STRING_VALUE',
        Logins: {
            [event.provider]: event.token,
            /* '<IdentityProviderName>': ... */
        }
    };

    cognitoidentity.getCredentialsForIdentity(params, function (err, data) {
        if (err) {
            console.log("getCredentialsForIdentity: callback from cognitoidentity.getCredentialsForIdentity err =");
            console.log(err, err.stack);
            callback(err);
        }
        else {
            callback(null, data);
        }
    });
};

/**
 * Get Cognito Federated identity
 * @param IdentityPoolId The Identity Pool ID
 * @param AccountId The AWS Account Number
 * @param Logins Provider Map Provider : ID Token
 */
function getId (event, callback) {
    var cognitoidentity = new AWS.CognitoIdentity({apiVersion: '2014-06-30',region: configuration.aws_region});
    var params = {
        IdentityPoolId: event.IdentityPoolId, /* required */
       /*  AccountId: configuration.aws_account, not required */
        Logins: {
            [event.provider]: event.token,
            /* '<IdentityProviderName>': ... */
        }
    };

    cognitoidentity.getId(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            callback(err);
        }
        else {
            callback(null,data);
        }
    });
};

/**
 * Perform an HTTP Request
 * @param protocol sring
 * @param domain string
 * @param path string
 * @param method string
 * @param headers json object
 * @param json true/false
 * @return Fire off request and return result
 */
function fireRequest(event, callback) {

    var protocol = event.protocol;
    var path = event.path;
    var delimiter = '://';
    var domain = event.domain;
    var url = protocol + delimiter + domain + path;
    // fire the request
    request({
        url: url,
        method: event.method,
        json: true,
        headers: {
            "content-type": "application/json",
        }
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            callback(body);
        }
        else {
            callback(null, 'Error making request. \nError: ' + error);
        }
    });
};

module.exports.getSystemCredentials = function(callback) {
    var sysCreds = '';
    var sysConfig = new AWS.Config();
    sysConfig.getCredentials(function(err) {

        if (err) {
            console.log('Unable to Obtain Credentials');
            callback(err);
        } // credentials not loaded
        else{
            var tempCreds = sysConfig.credentials;

            var {accessKeyId, sessionToken,
                    secretAccessKey, expireTime,
                    envPrefix } = sysConfig.credentials;
            sysCreds = {
                SessionToken: sessionToken,
                AccessKeyId: accessKeyId,
                SecretKey: secretAccessKey,
                Expiration: expireTime,
                expireTime,
                envPrefix,
            }
            var credentials = {"claim": sysCreds};
           callback(null, credentials);
            /*******
             * use default properties to get data -
             * following code not needed

            if (tempCreds.metadata == undefined || tempCreds.metadata == null){
                var credentials = {"claim": tempCreds};
                console.log("sysConfig.getCredentials no metadata..");
                console.log(credentials);
                callback(null,credentials);
            }
            else {
                sysCreds = {
                    SessionToken: tempCreds.metadata.Token,
                    AccessKeyId: tempCreds.metadata.AccessKeyId,
                    SecretKey: tempCreds.metadata.SecretAccessKey,
                    Expiration: tempCreds.metadata.Expiration,
                }
                var credentials = {"claim": sysCreds};
                console.log("sysConfig.getCredentials new sysCreds.."+credentials);
                callback(null, credentials);
            }
             **/


        }
    })

}