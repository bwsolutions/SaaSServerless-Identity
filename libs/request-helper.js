
const AWS = require('aws-sdk');
var lambda = new AWS.Lambda();
const serviceDiscovery = require('../serviceDiscovery/serviceDiscovery-helper');

module.exports.invokeLambda = function (functionName, payLoad, invocationType="RequestResponse", logType="Tail", qualifier="$LATEST") {


    var serviceAPI = process.env.serviceURL ;

    return new Promise( (resolve,reject) => {

        serviceDiscovery.lookupService(functionName,'1.0.0',serviceAPI)
            .then((data) => {
                if (data.status !== "healthy") {
                    console.log("service not available. aborting");
                    reject("service not available. aborting");
                }
                var params = {
                    FunctionName:   data.endpoint_url,
                    InvocationType: invocationType,
                    LogType:        logType,
                    Payload:        JSON.stringify(payLoad),
                    Qualifier:      qualifier
                };

                lambda.invoke(params, function (err, response) {
                    if (err === null) {
                        if (response.StatusCode === 200) {
                            var data = JSON.parse(response.Payload);
                            if (data.statusCode === 200) {
                                // successful response
                                resolve(data);
                            } else {
                                var lookupError = new Error("Failed looking up user pool: " + data.Error);
                                console.log("lambda.invoke returned error ");
                                console.log(lookupError);
                                reject(lookupError);
                            }
                        } else {
                            var message = response.FunctionError ? response.FunctionError : "unknown error";
                            var lookupError = new Error("Lambda Function failure: " + message);
                            console.log("invoke returned error ");
                            console.log(lookupError);
                            reject(lookupError);
                        }
                    } else {
                        console.log("invoke returned error ");
                        console.log(err, err.stack);
                        reject(err);

                    }// an error occurred
                });
            })
            .catch((err) => {
                console.log("service lookup failure ");
                console.log(err);
                reject(err);
            })
    });
}