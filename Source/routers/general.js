const M_bcrypt = require("bcrypt");
var M_Express = require("express");

var R_general = M_Express.Router();
console.info("The router is ready: general.");

R_general.post("/login", function(request, response) {
		response.writeHead(200, {"Content-Type": "application/json"});

		const ID = request.body.ID, password = request.body.password;
		if(!(global.validateID(ID))) response.end(JSON.stringify({success: false, reason: "The ID is not valid."}));
		if(!(global.validatePassword(password))) response.end(JSON.stringify({success: false, reason: "The password is not valid."}));
		else
		{
			global.db.collection("accounts").findOne({ID: ID}, {passwordHash: 1}).then(function(userAccount, error/*!!!DEBUG*/) {console.error(error);
					if(!userAccount)
					{
						response.end(JSON.stringify({success: false, reason: "Could not log-in."})); // The account does not exist.
						return;
					}

					M_bcrypt.compare(password, userAccount.passwordHash, function(error, matched) {
							if(error)
							{
								console.error("M_bcrypt.compare error:", error);
								response.end(JSON.stringify({success: false, reason: "An error occurred when comparing the password with the hash!"}));
							}
							else if(matched)
							{
								request.session.loggedInAs = ID;
								response.end(JSON.stringify({success: true}));
							}
							else
								response.end(JSON.stringify({success: false, reason: "Could not log-in."})); // The password is wrong.
						});
				}).catch((databaseError) => global.dbErrorOccurred(response, databaseError));
		}
	});

R_general.post("/logout", function(request, response) {
		response.writeHead(200, {"Content-Type": "application/json"});
		if(request.body.noGET)
		{
			request.session.loggedInAs = null;
			response.end(JSON.stringify({"success": true}));
		}
		else
			response.end(JSON.stringify({"success": false, "reason": "noGET is not truthy."}));
	});

module.exports = R_general;