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
    - Parameters
    - Behavior
    - Returns


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

  - **To generate a new library API token and update it** :x:
    - Request
      - GET
      - `/API/administrator/newTheLibraryToken` or `/API/admin/newTheLibraryToken`
    - Parameters
      - _(none)_
    - Behavior
      1. Generates a new random long string, which will be the new library API token.
      2. Get the ID of the administrator's library: `db.Accounts.findOne({ID: request.session.loggedInAs}).information.libraryID`.
      3. `db.Libraries.update({libraryID: (the library ID)}, {$set: {libraryAPIToken: (the new API token)}})`
    - Returns:
      - `{"success": true}` on success.
      - `{"success": false, "reason": (the reason string)}` on failure.


## For developers
