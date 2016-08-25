module.exports = function() {
		Object.defineProperty(global, "generateRandomUppercaseAlphanumericString", {value: function generateRandomUppercaseAlphanumericString(stringLength) {
				// This code works well only for generating a random string that consists of 15 or less characters, in Node.js.
				return (Math.random().toString(36).substring(2, 2 + stringLength) + '0'.repeat(stringLength)).substring(0, stringLength).toUpperCase();
			}});
		Object.defineProperty(global, "generateRandomAlphanumericString", {value: function generateRandomAlphanumericString(stringLength) {
				// WHY? I cannot use `const`s & `let`s instead of the `var`s in this function! If I do that, the routine stops when loading & running this module!
				var alphanumerics = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
				var result = "";
				for(var index = 0; index < stringLength; index++)
					result += alphanumerics[Math.floor(Math.random() * alphanumerics.length)];

				return result;
			}});
		Object.defineProperty(global, "parseBoolean", {value: function parseBoolean(string) {
				if(typeof string === "string") return {"true": true, "false": false}[string.toLowerCase()];
			}});

		Object.defineProperty(global, "validateID", {value: function validateID(string) {
				return typeof string === "string" && /^[a-zA-Z0-9]{5,15}$/.test(string) && string.search(/[a-zA-Z]/) != -1;
			}});
		Object.defineProperty(global, "validatePassword", {value: function validatePassword(string) {
				return typeof string === "string" && /^[a-zA-Z0-9]{5,15}$/.test(string) && string.search(/[a-zA-Z]/) != -1;
			}});
		Object.defineProperty(global, "validateLibraryID", {value: function validateLibraryID(string) {
				return typeof string === "string" && /^[1-9][0-9]{0,9}$/.test(string);
			}});
		Object.defineProperty(global, "validateUserCode", {value: function validateUserCode(string) {
				return typeof string === "string" && /^[A-Z0-9]{7}$/.test(string);
			}});
		Object.defineProperty(global, "validateISBN", {value: function validateISBN(string) {
				return typeof string === "string" && /^[0-9]{13}$/.test(string)
					&& (
						(
							(Number.parseInt(string[0])
							+ Number.parseInt(string[2])
							+ Number.parseInt(string[4])
							+ Number.parseInt(string[6])
							+ Number.parseInt(string[8])
							+ Number.parseInt(string[10])
							+ Number.parseInt(string[12]))
							+
							(Number.parseInt(string[1])
							+ Number.parseInt(string[3])
							+ Number.parseInt(string[5])
							+ Number.parseInt(string[7])
							+ Number.parseInt(string[9])
							+ Number.parseInt(string[11])) * 3
						) % 10 === 0
					);
			}});
		Object.defineProperty(global, "validateBookCode", {value: function validateBookCode(string) {
				return typeof string === "string" && /^[a-zA-Z0-9]{1,100}$/.test(string);
			}});
		Object.defineProperty(global, "validateLibraryAPIToken", {value: function validateLibraryAPIToken(string) {
				return typeof string === "string" && /^[a-zA-Z0-9]{128}$/.test(string);
			}});
		Object.defineProperty(global, "validateBookcaseNumber", {value: function validateBookcaseNumber(number) {
				return typeof number === "number" && number <= 99999;
			}});

		Object.defineProperty(global, "dbErrorOccurred", {value: function aDatabaseErrorOccurred(response, databaseError) {
				console.error("A database error occurred", databaseError);
				response.end(JSON.stringify({"success": false, "reason": "Something is wrong with the database."}));
			}});
		Object.defineProperty(global, "checkAccountType", {value: function checkAccountType(response, type, accountID) {
			/*
				{"success": false, "reason": "You have to log-in!"}
				{"success": false, "reason": "You are not a user!"} or {"success": false, "reason": "You are not an administrator of a library!"}
				{"success": false, "reason": "Something is wrong with the database."}
			*/
				return new Promise(function(resolve) {
						if(!accountID)
						{
							response.end(JSON.stringify({success: false, reason: "You have to log-in!"}));
							return;
						}

						global.db.collection("accounts").findOne({ID: accountID}, {type: 1, information: 1}).then(function(account) {
								if(!account) response.end(JSON.stringify({success: false, reason: "You have to log-in!"}));
								else if(account.type === type) resolve(account);
								else
								{
									if(type === "user") response.end(JSON.stringify({success: false, reason: "You are not a user!"}));
									else if(type === "administrator") response.end(JSON.stringify({success: false, reason: "You are not an administrator of a library!"}));
								}
							}).catch((databaseError) => global.dbErrorOccurred(response, databaseError));
					});
				
			}});
		Object.defineProperty(global, "addTask", {value: (function closure() {
				var taskChains = {};
				return function addTask(taskChainName, taskPromise) {
						if(!(taskChainName in taskChains)) taskChains[taskChainName] = Promise.resolve();
						taskChains[taskChainName] = taskChains[taskChainName].then(() => taskPromise);
					};
			})()});
	/*
		Object.defineProperty(global, "taskManager", {value: new (function TaskManager() {
				var taskChains = {};

				this.addTask = function addTask(taskChainName, taskPromise) {
						if(!(taskChainName in taskChains)) taskChains[taskChainName] = Promise.resolve();
						taskChains[taskChainName] = taskChains[taskChainName].then(() => taskPromise);
					};
			})});
	*/

		console.info("The global methods are ready.");
	};