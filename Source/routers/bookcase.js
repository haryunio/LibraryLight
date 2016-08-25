var M_Express = require("express");

var R_bookcase = M_Express.Router();
console.info("The router is ready: bookcase.");

R_bookcase.post("/takeMyBooks", function(request, response) {
		const libraryAPIToken = request.body.libraryAPIToken;
		const bookcaseNumber = Number.parseInt(request.body.bookcaseNumber);
		try
		{
			const bookCodes = JSON.parse(request.body.bookCodes);

			if(!(global.validateLibraryAPIToken(libraryAPIToken))) response.end(JSON.stringify({success: false, reason: "The library API token is not valid."}));
			else if(!(global.validateBookcaseNumber(bookcaseNumber))) response.end(JSON.stringify({success: false, reason: "The bookcase number is not valid."}));
			else if(!(Array.isArray(bookCodes) && bookCodes.every(bookCode => global.validateBookCode(bookCode)))) response.end(JSON.stringify({success: false, reason: "The `bookCodes` is not valid."}));
			else
			{
				global.db.collection("libraries").findOne({libraryAPIToken: libraryAPIToken}, {libraryID: 1}).then(function(libraryInformation) {
						if(!(libraryInformation && libraryInformation.libraryID))
						{
							console.error(`A fatal error occurred. Something may be wrong with the database.`
									+ `The libraryInformation(${JSON.stringify(libraryInformation)}) at takeMyBooks is invalid.`);
							return;
						}

						const libraryID = libraryInformation.libraryID;
						global.addTask("takeMyBooks_" + libraryID, new Promise(function(resolve) {
								const databaseErrorHandler = function(databaseError) {
										global.dbErrorOccurred(response, databaseError);
										resolve();
									};

								global.db.collection("books").update({
										libraryID: libraryID,
										bookcaseNumber: bookcaseNumber
									}, {$set: {
										bookcaseNumber: null
									}}, {$currentDate: {
										bookcaseUpdatedAt: true
									}}, {multi: true}).then(function() {
										global.db.collection("books").update({
												libraryID: libraryID,
												bookCode: {$in: bookCodes}
											}, {$set: {
												bookcaseNumber: null
											}}, {$currentDate: {
												bookcaseUpdatedAt: true
											}}, {multi: true}).then(function(queryResponse) {
												response.end(JSON.stringify({success: true})); // true 말고도 여러 가지 반환. 정상 update됐는지 등.
												resolve();
											}).catch(databaseErrorHandler);
									}).catch(databaseErrorHandler);
							}));
					}).catch((databaseError) => global.dbErrorOccurred(response, databaseError));
			}
		}
		catch(parsingError)
		{
			response.end(JSON.stringify({success: false, reason: "The `bookCodes` is not valid."}));
		}
	});

module.exports = R_bookcase;