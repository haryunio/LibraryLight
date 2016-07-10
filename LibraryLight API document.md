# LibraryLight APIs

:x: means **it is not developed yet**.

The APIs must only work with their corresponding permission(authentication).

An administrator can manage only one library.


## General

  - **To login** :x:
    - Request
      - POST
      - `/API/login`
    - Parameters
      - ID
      - password
    - Behavior
      1. Validates the inputs.
      2. Checks if the input is correct.
      3. `request.session.loggedInAs = ID`
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, reason: (the reason string)}` on failure.


## For Raspberry Pi(bookcase)s
  - **To update information of books within bookcases** :x:
    - Request
      - POST
      - `/API/takeMyBooks`
    - Parameters
      - libraryAPIToken
      - bookCode: is read from the book's RFID tag.
      - bookcaseNumber: the bookcase's number. This should be unique in the library.
    - Behavior
      1. Validates the inputs: `bookcaseNumber` cannot be a null.
      2. Gets the library ID: db.Libraries.findOne({libraryAPIToken: (the library API token)}).libraryID.
      3. `db.Books.updateOne({libraryID: (the library ID)}, {$set: {bookcaseNumber: (the bookcase number)}})`
    - Returns
      - `{success: true}` on success.
      - `{success: false, reason: (the reason string)}` on failure.


## For users

  - **To register** :x:
    - Request
      - POST
      - `/API/user/register`
    - Parameters
      - ID
      - password
    - Behavior
      1. Validates the inputs.
      2. Checks if the ID is unique.
      3. `db.Accounts.insertOne({ID: ID, passwordHash: passwordHash: passwordHash, type: type: "user", information: {usingLibraries: []}})`
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.


## For administrators

  - **To add a book in their libraries** :x:
    - Request
      - POST
      - `/API/administrator/addBook` or `/API/admin/addBook`
    - Parameters
      - ISBN: :star:...?.
      - bookCode: should be stored in the book's RFID tag.
    - Behavior
      1. Validates the inputs.
      2. Gets the ID of the administrator's library: `db.Accounts.fineOne({ID: request.session.loggedInAs}).information.libraryID`.
      3. `db.Books.insertOne({ISBN: (the ISBN), libraryID: (the library ID), bookcaseNumber: null, bookCode: (the book code)})`
    - Returns
      - `{success: true}` on success.
      - `{success: false, reason: (the reason string)}` on failure.

  - **To generate a new library API token and update it** :x:
    - Request
      - GET
      - `/API/administrator/newTheLibraryToken` or `/API/admin/newTheLibraryToken`
    - Parameters
      - _(none)_
    - Behavior
      1. Generates a new random long string, which will be the new library API token.
      2. Gets the ID of the administrator's library: `db.Accounts.findOne({ID: request.session.loggedInAs}).information.libraryID`.
      3. `db.Libraries.updateOne({libraryID: (the library ID)}, {$set: {libraryAPIToken: (the new API token)}})`
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.


## For developers



# LibraryLight DB structure
DB:
  - LibraryLight
    - Accounts
		  - ID
			- passwordHash
			- type: "administrator" | "developer" | "user"
			- information: {libraryID} | {} | {usingLibraries: [{libraryID, userCode}]}

	  - Libraries
	    - libraryID
	  	- libraryAPIToken
		  - userCodes: [{
		    - userCode
				- userID: undefined | "something"
				- permission: ["borrowable", "lightable"]  }]

		- Books
			- ISBN
			- libraryID
			- bookcaseNumber: <Raspberry Pi>
			- bookCode: <RFID>

		- Lights
		  - :star:

		- BookInformation
			- ISBN
			- title: {main, sub1, sub2}
			- description
