# LibraryLight APIs

## Symbols
 - :x:: **it is not developed yet**.
 - :star:: **the documentation is not finished at that part**.
 - :boom:: **the API is not atomic that it can cause critical query confliction(race condition)s**.

## Terms
 - An administrator can manage only one library.
 - Library IDs given to administrators cannot be changed.
 - The type of accounts cannot be changed.
 - The APIs must only work with their corresponding permission(authentication).
 - All the APIs have to be atomic(so there have to not be any :boom:.).
 - If a database error happens when an API routine is working, `{"success": false, "reason": "Something is wrong with the database."}` will be returned.

## Problems
### **How to prevent the query confliction?**
 - Use a task(a group of queries) queue per library. It's very hard to do it.
 - Check out [this document](https://docs.mongodb.com/manual/reference/glossary/#term-concurrency-control) and try to find the solution.
 - I think I found [a great document](http://stackoverflow.com/questions/10778493/whats-the-difference-between-findandmodify-and-update-in-mongodb)! But wait a while, I have a headache now..


## General - 2 APIs

  - **To login**
    - Request
      - POST
      - `/API/login`
    - Parameters
      - `ID`
      - `password`
    - Behavior
      1. Validates the inputs.
      2. Checks if the input is correct.
      3. `request.session.loggedInAs = ID`
    - Returns
      - `{"success": false, "reason": "The ID is not valid."}`
      - `{"success": false, "reason": "The password is not valid."}`
      - When the password is wrong or the account to log-in does not exist, `{"success": false, "reason": "Could not log-in."}`.
      - `{"success": false, "reason": "An error occurred when comparing the password with the hash!"}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": true}`
    - Notes
      - You can log in when you are logged in.

  - **To logout**
    - Request
      - POST
      - `/API/logout`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy. If is not, returns `{"success": false, "reason": "noGET is not truthy."}`.
      2. `request.session.loggedInAs = null`.
      3. Returns `{"success": true}`.
    - Returns
      - `{"success": true}`
      - `{"success": false, "reason": "noGET is not truthy."}`


## For Raspberry Pi(bookcase)s - 1 API
  - **To update information of books within bookcases** :x:
    - Request
      - POST
      - `/API/takeMyBooks`
    - Parameters
      - `libraryAPIToken`
      - `bookcaseNumber`: the bookcase's number. This should be unique in the library.
      - `bookCodes`: are read from the books' RFID tag.
    - Behavior
      1. Validates the inputs: `bookcaseNumber` cannot be a null.
      2. Gets the library ID: `db.libraries.findOne({libraryAPIToken: (the library API token)}, {libraryID: 1}).libraryID`.
      3. `global.TaskManager.addTask((a function that contains the process below), "takeMyBooks", (the library ID));`
      4. Takes off its ownership from the books owned: `db.books.update({libraryID: (the library ID), bookcaseNumber: (the bookcase number)}, {$set: {bookcaseNumber: null}}, {multi: true})`.
      5. Owns the specified books: `db.books.update({libraryID: (the library ID), bookCode: {$in: (the array of the book codes)}}, {$set: {bookcaseNumber: (the bookcase number)}}, {multi: true})`.
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.


## For users - 3 APIs

  - **To register**
    - Request
      - POST
      - `/API/user/register`
    - Parameters
      - ID
      - password
    - Behavior
      1. Validates the inputs.
      2. Not strictly, checks if the ID is unique; `db.accounts.findOne({ID: (the ID)}, {"_id": 1})`. If isn't, returns `{"success": false, "reason": "The account already exists."}`.
      3. Generates a hash for the password. This work costs a lot of process resources.
      4. Creates an account if the account doesn't exist: `db.accounts.updateOne({ID: (the ID)}, {$setOnInsert: {ID: (the ID), passwordHash: (the hash for the password), type: "user", information: {usingLibraries: []}}}, {upsert: true})`.
      5. Returns `{"success": true}` if the `"upsertedId"` property of the object which the query in step 4 returned exist; otherwise, returns `{"success": false, "reason": "The account already exists."}`.
    - Returns
      - `{"success": true}`
      - `{"success": false, "reason": "The ID is not valid."}`
      - `{"success": false, "reason": "The password is not valid."}`
      - `{"success": false, "reason": "The account already exists."}`
      - `{"success": false, "reason": "Something is wrong with the database."}`

  - **To own user-code**
    - Request
      - POST
      - `/API/user/ownUserCode`
    - Parameters
      - `libraryID`: the ID of the library where the user-code is valid.
      - `userCode`: a user-code to own.
    - Behavior
      1. Validates the inputs.
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`.
      3. Checks if `theAccount.type === "user"`. If it isn't, returns `{"success": false, "reason": "You are not a user!"}`.
      4. If the user has a user code for the library(`db.userCodes.findOne({libraryID: (the library ID), userID: request.session.loggedInAs})`), returns `{"success": false, "reason": "You already have a user code for the library."}`.
      5. Owns the user code if it exists and isn't owned: `queryResult = db.userCodes.updateOne({libraryID: (the library ID), userCode: (the user code), userID: null}, {$set: {userID: request.session.loggedInAs}})`.
      6. If `queryResult.modifiedCount === 1`, returns `{"success": true}`.
      7. Else if `queryResult.modifiedCount === 0`, returns `{"success": false, "reason": "The user-code does not exist, or is already owned by another user."}`.
    - Returns
      - `{"success": false, "reason": "The library ID is not valid."}`
      - `{"success": false, "reason": "The user code is not valid."}`
      - `{"success": false, "reason": "You have to log-in!"}`
      - `{"success": false, "reason": "You are not a user!"}`
      - `{"success": false, "reason": "You already have a user code for the library."}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": false, "reason": "The user-code does not exist, or is already owned by another user."}`
      - `{"success": true}`

  - **To get the list of libraries that is being used by the user**
    - Request
      - POST
      - `/API/user/getUsingLibraries`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy. If it isn't, returns `{"success": false, "reason": "noGET is not truthy."}`.
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "user"`. If it isn't, returns `{"success": false, "reason": "You are not a user!"}`.
      4. Returns `JSON.stringify({"success": true, "usingLibraries": theAccount.information.usingLibraries})`.
    - Returns
      - `{"success": false, "reason": "You have to log-in!"}`
      - `{"success": false, "reason": "You are not a user!"}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": true, "usingLibraries": [{"libraryID": (the library ID), "userCode": (the code of the user in the library)}, ...]}`


## For administrators - 7 APIs

  - **To add books in their libraries**
    - Request
      - POST
      - `/API/administrator/addBook` or `/API/admin/addBook`
    - Parameters
      - ISBN: a string that contains the book's International Standard Book Number(EAN-13).
      - bookCode: should be stored in the book's RFID tag.
    - Behavior
      1. Validates the inputs.
      2. Gets the ID of the administrator's library: `db.accounts.fineOne({ID: request.session.loggedInAs}).information.libraryID`.
      3. Adds the book if the book was not added(if the book does not exist): `db.books.updateOne({libraryID: (the library ID), bookCode: (the book code)}, {$setOnInsert: {libraryID: (the library ID), bookCode: (the book code), bookcaseNumber: null, ISBN: (the ISBN), bookcaseUpdatedAt: null}}, {upsert: true})`.
      4. Returns `{"success": true}` if the `"upsertedId"` property of the object which the query in step 3 returned exist; otherwise, returns `{"success": false, "reason": "The book already exists."}`.
    - Returns
      - `{"success": false, "reason": "The ISBN is not valid."}`
      - `{"success": false, "reason": "The book code is not valid."}`
      - `{"success": false, "reason": "The book already exists."}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": true}`

  - **To get the information about the administrator's library**
    - Request
      - POST
      - `/API/administrator/getLibraryInformation` or `/API/admin/getLibraryInformation`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy. If it isn't, returns `{"success": false, "reason": "noGET is not truthy."}`.
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "administrator"`. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      4. `theLibraryInformation = db.libraries.findOne({"libraryID": theAccount.information.libraryID}, {"_id": 0})`
      5. Returns `JSON.stringify({"success": true, "libraryID": theLibraryInformation.libraryID, "libraryAPIToken": theLibraryInformation.libraryAPIToken})`.
    - Returns
      - `{"success": false, "reason": "noGET is not truthy."}`
      - `{"success": false, "reason": "You have to log-in!"}`
      - `{"success": false, "reason": "You are not an administrator of a library!"}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": true, "libraryID": (the library ID), "libraryAPIToken": (the library API token)}`

  - **To get the information about the user codes for the administrator's library**
    - Request
      - `/API/administrator/getUserCodes` or `/API/admin/getUserCodes`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy. If it isn't, returns `{"success": false, "reason": "noGET is not truthy."}`.
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "administrator"`. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      4. `theUserCodes = db.userCodes.find({"libraryID": theAccount.information.libraryID}, {"libraryID": 1, "userCode": 1, "userID": 1, "permission": 1, "_id": 0})`
      5. Returns `JSON.stringify({"success": true, "userCodes": theUserCodes})`.
    - Returns
      - `{"success": false, "reason": "noGET is not truthy."}`
      - `{"success": false, "reason": "You have to log-in!"}`
      - `{"success": false, "reason": "You are not an administrator of a library!"}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": true, "userCodes": [{"libraryID": (the library ID), "userCode": (a user code), "userID": (a user ID), "permission": {"borrowable": (a boolean value), "lightable": (a boolean value)}}, ...]}`

  - **To generate a user-code and make it under control**
    - Request
      - POST
      - `/API/administrator/newUserCode` or `/API/admin/newUserCode`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy. If it isn't, returns `{"success": false, "reason": "noGET is not truthy."}`.
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "administrator"`. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      4. Generates a random user code: `(length => (Math.random().toString(36).substring(2, 2 + length) + '0'.repeat(length)).substring(0, length))(20).toUpperCase()`.
      5. Adds the user code if the user code for the library does not exist.: `queryResult = db.userCodes.updateOne({libraryID: theAccount.information.libraryID, "userCode": (the newly generated user code)}, {$setOnInsert: {libraryID: theAccount.information.libraryID, "userCode": (the newly generated user code), userID: null, permission: {"borrowable": false, "lightable": false}}}, {upsert: true})`.
      6. If the user code has been added(`if(queryResult && queryResult.upsertedCount === 1)`), returns `{"success": true, "theNewUserCode": (새롭게 생성된 사용자 코드)}`.
      7. Else, returns `{"success": false, "reason": "Could not generate a new user code. Please try again."}`.
    - Returns
      - `{"success": false, "reason": "noGET is not truthy."}`
      - `{"success": false, "reason": "You have to log-in!"}`
      - `{"success": false, "reason": "You are not an administrator of a library!"}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": false, "reason": "Could not generate a new user code. Please try again."}`
      - `{"success": true, "theNewUserCode": (the newly generated user code)}`

  - **To set permissions of a specific user-code.**
    - Request
      - POST
      - `/API/administrator/setPermissions` or `/API/admin/setPermissions`
    - Parameters
      - `userCode`
      - `borrowable`
      - `lightable`
    - Behavior
      1. Validates the inputs.
      2. Checks if the client is an administrator.
      3. Gets the library ID: `db.accounts.findOne({ID: request.session.loggedInAs}, {information: 1}).information.libraryID`.
      4. `db.userCodes.updateOne({libraryID: (the library ID), "userCode": (the user code to set its permissions)}, {$set: {"permission": (permissions to set)}})`. If the returned object's property `modifiedCount` is not `1`, returns `{"success": false, "reason": "The user code does not exist."}`.
      5. Else, returns `{"success": true}`.
    - Returns
      - `{"success": false, "reason": "The user code is not valid."}`
      - `{"success": false, "reason": "The ``borrowable`` is not valid."}`
      - `{"success": false, "reason": "The ``lightable`` is not valid."}`
      - `{"success": false, "reason": "You have to log-in!"}`
      - `{"success": false, "reason": "You are not an administrator of a library!"}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": false, "reason": "The user code does not exist."}`
      - `{"success": true}`

  - **To delete a specific user-code for an administrator's library**
    - Request
      - POST
      - `/API/administrator/deleteUserCode` or `/API/admin/deleteUserCode`
    - Parameters
      - `userCode`: a user-code, to delete, for the administrator's library.
    - Behavior
      1. Validates the inputs.
      2. Checks if the client is an administrator. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      3. Gets the library ID: `db.accounts.findOne({ID: request.session.loggedInAs}, {information: 1}).information.libraryID`.
      4. Removes the user's lights: `db.lights.remove({libraryID: (the library ID), lighter: (the user code to delete)})`.
      5. Queries `db.userCodes.remove({libraryID: (the library ID), userCode: (the user code to delete)}, {justOne: true})`; if the returned does not have `deletedCount` property is `1`, returns `{"success": false, "reason": "The user code does not exist."}`.
      6. Returns `{"success": true}`.
    - Returns
      - `{"success": false, "reason": "The user code is not valid."}`
      - `{"success": false, "reason": "You have to log-in!"}`
      - `{"success": false, "reason": "You are not an administrator of a library!"}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": false, "reason": "The user code does not exist."}`
      - `{"success": true}`

  - **To generate a new library API token and update it** :x:
    - Request
      - POST
      - `/API/administrator/newLibraryAPIToken` or `/API/admin/newLibraryAPIToken`
    - Parameters
      - `noGET`: must be truthy.
    - Behavior
      1. Checks if `noGET` is truthy.
      2. Checks if `theAccount.type === "administrator"`. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      3. Generates a new random long string, which will be the new library API token.
      4. Checks if the new one is different than the existing(current) one. If it is, goes to step 3.
      5. Gets the ID of the administrator's library: `db.accounts.findOne({ID: request.session.loggedInAs}).information.libraryID`.
      6. `db.libraries.updateOne({libraryID: (the library ID)}, {$set: {libraryAPIToken: (the new library API token)}})`.
    - Returns
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.


## For developers - 0 API



# About optimization

## When to check if a document exists
 According to [this article](https://blog.serverdensity.com/checking-if-a-document-exists-mongodb-slow-findone-vs-find/), `findOne` is much slower than `find` with `limit` in order to do this. But I am using `node-mongodb-native` module, whose `findOne` consists of `find` with `limit` internally. So I'm to use just `findOne` to do this.
 ```javascript
 // https://github.com/mongodb/node-mongodb-native/blob/c41966c1b1834c33390922650e582842dbad2934/lib/collection.js#L833
 
 Collection.prototype.findOne = function() {    
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  var callback = args.pop();
  var cursor = this.find.apply(this, args).limit(-1).batchSize(1);

  // Return the item
  cursor.next(function(err, item) {
    if(err != null) return handleCallback(callback, toError(err), null);
    handleCallback(callback, null, item);
  });
}
 ```



# LibraryLight DB structure
DB:
  - LibraryLight
    - accounts
      - ID
      - passwordHash
      - type: "administrator" | "developer" | "user"
      - information: {libraryID} | {} | {usingLibraries: [{libraryID, userCode}, ...]}
    - libraries
      - libraryID
      - libraryAPIToken
    - userCodes
      - libraryID: (the ID of the library where the user code is valid)
      - userCode: (a string consists of 20 alphanumeric characters)
      - userID: null | "something"
      - permission: {"borrowable": true|false, "lightable": true|false}
    - lights
      - libraryID
      - bookcaseNumber
      - lightColor
      - ISBN
      - lighter
      - expirationTime
    - books
      - ISBN
      - libraryID
      - bookcaseNumber: <Raspberry Pi>
      - bookcaseUpdatedAt: $currentDate
      - bookCode: <RFID>
    - bookInformation
      - ISBN
      - title: {main, sub1, sub2}
      - description

## The significance of *user code*s
 If there is no _user code_, you have to submit your account ID to library administrators, in order to get the permissions to use the libraries. At that time, if you submit **others**' ID, the administrators will grant the permissions to their accounts and they will be the libraries' user. But this is not what they desired, therefore this is not a good way. To resolve this problem, I adopted a concept called ‘_user code_’; I resovled the problem above, by make one have to register his/her user codes with the IDs of the libraries that the user codes're from, to his/her account, in order to be a user of the libraries.



# MODIFYING DB & API
```
```
