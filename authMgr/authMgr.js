const request = require('request');

// Configure Environment
//const configModule = require('../libs/config-helper.js');
//var configuration = configModule.configure(process.env.stage);

//const AWS = require('aws-sdk');
//const async = require('async');
//const config = require('config');

//const Response = require("../libs/response-lib");

// Declare shared modules
const tokenManager = require('../libs/token-manager.js');

//AWS Dependencies for Cognito and AWS SDK
global.fetch = require('node-fetch')
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;


class authMgr {

    health(event) {
        console.log("Auth Manager Health Check");
        return new Promise((resolve, reject) => {
            resolve({service: 'Auth Manager', isAlive: true});
        });
    }



  authenticate(event) {
// process login request

      return new Promise(function (resolve, reject) {

          var user = JSON.parse(event.body);
          if (typeof user === "string") {
              user = JSON.parse(user); // stringified twice somewhere create object.
          }

          console.log('authenticate -Looking up user pool data for: ' + user.userName);

          tokenManager.getUserPool(user.userName, function (error, userPoolLookup) {
              if (!error) {
                  // get the pool data from the response
                  var poolData = {
                      UserPoolId: userPoolLookup.userPoolId,
                      ClientId:   userPoolLookup.client_id
                  };
                  // construct a user pool object
                  var userPool = new CognitoUserPool(poolData);
                  // configure the authentication credentials
                  var authenticationData = {
                      Username: user.userName,
                      Password: user.password
                  };
                  // create object with user/pool combined
                  var userData = {
                      Username: user.userName,
                      Pool:     userPool
                  };

                  // init Cognito auth details with auth data
                  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

                  // authenticate user to in Cognito user pool
                  // change cognitoUser because of not a constructor error
                  var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
                  //var cognitoUser = new AWS.CognitoIdentityServiceProvider.CognitoUser(userData);

                  cognitoUser.authenticateUser(authenticationDetails, {
                      onSuccess:           function (result) {
                          // get the ID token
                          var idToken = result.getIdToken().getJwtToken();
                          var AccessToken = result.getAccessToken().getJwtToken();
                          var refreshToken = result.getRefreshToken();
                          resolve({token: idToken, access: AccessToken, refresh: refreshToken});
                      },
                      onFailure:           function (err) {
                          //if (res.status != 400) {
                          console.error('authenticateUser:onFailure:  err =');
                          console.error(err);
                          reject(err);
                          //  return;
                          //}
                      },
                      mfaRequired:         function (codeDeliveryDetails) {
                          // MFA is required to complete user authentication.
                          // Get the code from user and call

                          //MFA is Disabled for this QuickStart. This may be submitted as an enhancement, if their are sufficient requests.
                          var mfaCode = '';

                          if (user.mfaCode == undefined) {
                              //res.status(200);
                              resolve({mfaRequired: true});
                          }
                          cognitoUser.sendMFACode(mfaCode, this)

                      },
                      newPasswordRequired: function (userAttributes, requiredAttributes) {
                          // User was signed up by an admin and must provide new
                          // password and required attributes, if any, to complete
                          // authentication.
                          if (user.newPassword == undefined) {
                              //res.status(200);
                              resolve({newPasswordRequired: true});
                          }
                          // These attributes are not mutable and should be removed from map.
                          delete userAttributes.email_verified;
                          delete userAttributes['custom:tenant_id'];
                          cognitoUser.completeNewPasswordChallenge(user.newPassword, userAttributes, this);
                      }
                  });
              }
              else {
                  console.error("Error Authenticating User: " + error);
                  //res.status(404);
                  reject(error);
              }
          });
      });
  }

    refresh(event) {
// process login request

        return new Promise(function (resolve, reject) {

            var user = JSON.parse(event.body);
            if (typeof user === "string") {
                user = JSON.parse(user); // stringified twice somewhere create object.
            }

            console.log('refresh -Looking up user pool data for: ' + user.userName);

            tokenManager.getUserPool(user.userName, function (error, userPoolLookup) {
                if (!error) {
                    // get the pool data from the response
                    var poolData = {
                        UserPoolId: userPoolLookup.userPoolId,
                        ClientId:   userPoolLookup.client_id
                    };
                    // construct a user pool object
                    var userPool = new CognitoUserPool(poolData);
                    // configure the authentication credentials
                    var authenticationData = {
                        Username: user.userName,
                        Password: user.password
                    };
                    // create object with user/pool combined
                    var userData = {
                        Username: user.userName,
                        Pool:     userPool
                    };

                    // init Cognito auth details with auth data
                    // AmazonCognitoIdentity
                    // change authenticationDetails because of not a constructor error
                    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
                    // authenticate user to in Cognito user pool
                    // change cognitoUser because of not a constructor error
                    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

                    cognitoUser.refreshSession(user.refreshToken, (err, result) => {
                        if (err) {
                            //if (res.status != 400) {
                            reject(err);
                            //  return;
                            //}
                        } else {
                            // get the ID token
                            var idToken = result.getIdToken().getJwtToken();
                            var AccessToken = result.getAccessToken().getJwtToken();
                            var refreshToken = result.getRefreshToken();
                            resolve({token: idToken, access: AccessToken, refresh: refreshToken});
                        }
                    });
                }
                else {
                    console.log("Error refreshing User: " + error);
                    //res.status(404);
                    reject(error);
                }
            });
        });
    }
}

module.exports = authMgr;
