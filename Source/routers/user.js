const M_bcrypt = require("bcrypt");
var M_Express = require("express");

var R_user = M_Express.Router();
console.info("The router is ready: user.");

R_user.post("/register", function(request, response) {
		response.writeHead(200, {"Content-Type": "application/json"});

		const ID = request.body.ID, password = request.body.password;
		if(!(global.validateID(ID))) response.end(JSON.stringify({success: false, reason: "The ID is not valid."}));
		else if(!(global.validatePassword(password))) response.end(JSON.stringify({success: false, reason: "The password is not valid."}));
		else
		{
			global.db.collection("accounts").findOne({ID: ID}, {"_id": 1}).then(function(matchedAccount) {
					if(matchedAccount)
					{
						response.end(JSON.stringify({"success": false, "reason": "The account already exists."}));
						return;
					}	

					M_bcrypt.hash(password, 12, function(error, resultHash) {
							if(error)
							{
								response.end(JSON.stringify({success: false, reason: "An error occurred when generating a hash for the password."}));
								return;
							}

							global.db.collection("accounts").updateOne({ID: ID},
								{$setOnInsert: {
									ID: ID,
									passwordHash: resultHash,
									type: "user",
									information: {usingLibraries: []}
								}}, {upsert: true}).then(function(queryResult) {
									if(queryResult && queryResult.upsertedCount === 1) response.end(JSON.stringify({"success": true}));
									else
										response.end(JSON.stringify({"success": false, "reason": "The account already exists."}));
								}).catch((databaseError) => global.dbErrorOccurred(response, databaseError))
						});
				}).catch((databaseError) => global.dbErrorOccurred(response, databaseError));
		}
	});

R_user.post("/ownUserCode", function(request, response) {
		response.writeHead(200, {"Content-Type": "application/json"});

		const libraryID = request.body.libraryID, userCode = request.body.userCode;
		if(!(global.validateLibraryID(libraryID))) response.end(JSON.stringify({success: false, reason: "The library ID is not valid."}));
		if(!(global.validateUserCode(userCode))) response.end(JSON.stringify({success: false, reason: "The user code is not valid."}));
		else
		{
			global.checkAccountType(response, "user", request.session.loggedInAs).then(function() {
					global.db.collection("userCodes").findOne({libraryID: libraryID, userID: request.session.loggedInAs}).then(function(alreadyOwnedUserCode) {
							if(alreadyOwnedUserCode)
							{
								response.end(JSON.stringify({"success": false, "reason": "You already have a user code for the library."}));
								return;
							}

							global.db.collection("userCodes").updateOne({
									libraryID: libraryID,
									userCode: userCode,
									userID: null
								}, {$set: {
									userID: request.session.loggedInAs
								}}).then(function(queryResult) {
									if(queryResult.result["nModified"] === 1) response.end(JSON.stringify({"success": true}));
									else
										response.end(JSON.stringify({"success": false, "reason": "The user-code does not exist, or is already owned by another user."}));
								}).catch((databaseError) => global.dbErrorOccurred(response, databaseError));
						}).catch((databaseError) => global.dbErrorOccurred(response, databaseError));
				});
		}
	});

R_user.post("/getUsingLibraries", function(request, response) {
		if(!(request.body.noGET))
		{
			response.end(JSON.stringify({"success": false, "reason": "noGET is not truthy."}));
			return;
		}

		global.checkAccountType(response, "user", request.session.loggedInAs).then(function(account) {
				try
				{
					response.end(JSON.stringify({"success": true, "usingLibraries": account.information.usingLibraries}));
				}
				catch(error) // account.information.usingLibraries
				{
					console.error("A fatal error occurred. Something may be wrong with the database. The error: ", error);
				}
			});
	});

module.exports = R_user;