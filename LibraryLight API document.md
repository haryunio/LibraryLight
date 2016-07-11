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
      - `{"success": false, "reason": (the reason string)}` on failure.

  - **To logout** :x:
    - Request
      - POST
      - `/API/logout`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy.
      2. `request.session.loggedInAs = null`.
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.


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
      2. Gets the library ID: `db.Libraries.findOne({libraryAPIToken: (the library API token)}).libraryID`.
      3. `db.Books.updateOne({libraryID: (the library ID)}, {$set: {bookcaseNumber: (the bookcase number)}})`
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.


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
      3. Generates a hash for the password.
      4. `db.Accounts.insertOne({ID: (the ID), passwordHash: (the hash for the password), type: type: "user", information: {usingLibraries: []}})`
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.

  - **To get the list of libraries that is being used by the user** :x:
    - Request
      - POST
      - `/API/user/getUsingLibraries`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy. If it isn't, returns `{"success": false, "reason": "noGET is not truthy."}`.
      2. `theAccount = db.Accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "user"`. If it isn't, returns `{"success": false, "reason": "You are not a user!"}`.
      4. Returns `JSON.stringify({"success": true, "usingLibraries": theAccount.information.usingLibraries})`.
    - Returns
      - `{"success": true, "usingLibraries": [{"libraryID": (the library ID), "userCode": (the code of the user in the library)}, ...]}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.


## For administrators

  - **To add a book in their libraries** :x:
    - Request
      - POST
      - `/API/administrator/addBook` or `/API/admin/addBook`
    - Parameters
      - ISBN: a string that contains the book's International Standard Book Number(EAN-13).
      - bookCode: should be stored in the book's RFID tag.
    - Behavior
      1. Validates the inputs.
      2. Gets the ID of the administrator's library: `db.Accounts.fineOne({ID: request.session.loggedInAs}).information.libraryID`.
      3. `db.Books.insertOne({ISBN: (the ISBN), libraryID: (the library ID), bookcaseNumber: null, bookCode: (the book code)})`
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.

  - **To get information about the administrator's library** :x:
    - Request
      - POST
      - `/API/administrator/libraryInformation` or `/API/admin/libraryInformation`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy. If it isn't, returns `{"success": false, "reason": "noGET is not truthy."}`.
      2. `theAccount = db.Accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "administrator"`. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      4. `theLibraryInformation = db.Libraries.findOne({libraryID: theAccount.information.libraryID})`
      5. Returns `JSON.stringify({"success": true, "libraryID": theLibraryInformation.libraryID, "libraryAPIToken": theLibraryInformation.libraryAPIToken, "userCodes": theLibraryInformation.userCodes})`.
    - Returns
      - `{"success": true, "libraryID": (the library ID), "libraryAPIToken": (the library API token), "userCodes": (information about the user-codes)}` on success.
      - `{"success": false}` on failure.

  - **To generate a user-code and make it under control** :x:
    - Request
      - POST
      - `/API/administrator/newUserCode` or `/API/admin/newUserCode`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy. If it isn't, returns `{"success": false, "reason": "noGET is not truthy."}`.
      2. `theAccount = db.Accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "administrator"`. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      4. Generates a random user code: `(length => (Math.random().toString(36).substring(2, 2 + length) + '0'.repeat(length)).substring(0, length))(20).toUpperCase()`.
      5. Checks if it's duplicated: `db.Libraries.findOne({libraryID: theAccount.information.libraryID, "userCodes.$.userCode": (the user code)}, {"_id": 1})`. If it already exists, goes to step 4.
      6. `db.Libraries.updateOne({libraryID: theAccount.information.libraryID}, {$push: {userCodes: {userCode: (the user code), userID: null, permission: []}}})`
      7. Returns `JSON.stringify({"success": true, "newUserCode": (the user code)})`
    - Returns
      - `{"success": true, "newUserCode": (the new user code)}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.

  - **To set permissions of a specific user-code.** :x:
    - Request
      - POST
      - `/API/administrator/setPermissions` or `/API/admin/setPermissions`
    - Parameters
      - `userCode`
      - `permissions`
    - Behavior
      1. Validates the inputs.
      2. Gets the library ID: `db.Accounts.findOne({ID: request.session.loggedInAs}, {information: 1}).information.libraryID`.
      3. `db.Libraries.updateOne({libraryID: (the library ID), "userCodes.$.userCode": (the user code)}, {$set: {"userCodes.$.permission": (the permissions)}})`. If the returned is not `{"modifiedCount": 1}`, returns `{"success": false, "reason": "The user code does not exist."}`.
    - Returns

  - **To delete a specific user-code for an administrator's library** :x:
    - Request
      - POST
      - `/API/administrator/deleteUserCode` or `/API/admin/deleteUserCode`
    - Parameters
      - userCode: a user-code, to delete, for the administrator's library.
    - Behavior
      1. Validates the inputs.
      2. Gets the library ID: `db.Accounts.findOne({ID: request.session.loggedInAs}, {information: 1}).information.libraryID`.
      3. `db.Libraries.updateOne({libraryID: (the library ID)}, {$pull: {userCodes: {$elemMatch: {userCode: (the user code)}}}})`. If the returned is not `{"modifiedCount": 1}`, returns `{"success": false, "reason": "The user code does not exist."}`.
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.

  - **To generate a new library API token and update it** :x:
    - Request
      - POST
      - `/API/administrator/newLibraryAPIToken` or `/API/admin/newLibraryAPIToken`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy.
      2. Generates a new random long string, which will be the new library API token.
      3. Gets the ID of the administrator's library: `db.Accounts.findOne({ID: request.session.loggedInAs}).information.libraryID`.
      4. `db.Libraries.updateOne({libraryID: (the library ID)}, {$set: {libraryAPIToken: (the new API token)}})`
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
      - information: {libraryID} | {} | {usingLibraries: [{libraryID, userCode}, ...]}
    - Libraries
      - libraryID
      - libraryAPIToken
      - userCodes: [ {
        - userCode
        - userID: undefined | "something"
        - permission: ["borrowable", "lightable"] }, ...]
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
