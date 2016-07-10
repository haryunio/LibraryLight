# LibraryLight APIs
:x: means **it is not developed yet**.

## General

  - **Login**
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

## For users

  - **Register**
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

## For developers
