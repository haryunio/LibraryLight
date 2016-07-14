# LibraryLight API

:x: 표시는 **그것이 아직 개발되지 않았음**을 나타낸다.

API들은 각기 요구되는 권한(인증)이 있어야 동작한다.

하나의 관리자는 오직 하나의 도서관만 관리할 수 있다.

**문제: 쿼리 동시 처리 시의 충돌을 어떻게 방지할 것인가?**
1. 어떤 도서관에 대한 정보를 다루는지로 들어온 API 요청을 나누어, 각 도서관에 해당하는 _작업 큐_에 넣어 각 도서관마다 순차적으로 처리한다.
2. [이 문서](https://docs.mongodb.com/manual/reference/glossary/#term-concurrency-control)를 확인하여 해결책을 찾아 본다.


## 일반적인 것 - 2개의 API가 문서화되었음.

  - **로그인 하기** :x:
    - 요청
      - POST
      - `/API/login`
    - 인자
      - ID
      - password
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. 입력된 계정 정보가 맞는지 확인한다.
      3. `request.session.loggedInAs = ID`
    - 반환 값
      - 성공 시, `{"success": true}`.
      - 실패 시, `{"success": false, "reason": (실패 까닭이 담긴 문자열)}`.

  - **로그아웃 하기** :x:
    - 요청
      - POST
      - `/API/logout`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. `request.session.loggedInAs = null`.
    - 반환 값
      - 성공 시, `{"success": true}`.
      - 실패 시, `{"success": false, "reason": (실패 까닭이 담긴 문자열)}`.


## Raspberry Pi(책장)을 위한 것 - 1개의 API가 문서화되었음.
  - **책장 안에 있는 책의 정보를 갱신하기** :x:
    - 요청
      - POST
      - `/API/takeMyBooks`
    - 인자
      - `libraryAPIToken`
      - `bookcaseNumber`: 책장 번호이다. 이것은 그 도서관에서 유일해야 한다.
      - `bookCodes`: 이것은 그 책들의 RFID 태그에서 읽힌 책 코드들로 이루어진 배열이다.
    - 동작
      1. 입력이 유효한지 검사한다. 이때에 `bookcaseNumber`는 `null`이면 안 된다.
      2. 도서관 ID를 얻는다: `db.Libraries.findOne({libraryAPIToken: (the library API token)}, {libraryID: 1}).libraryID`.
      3. 기존에 꽂혀(소유하고) 있던 책에 대한 소유권을 제거한다: `db.Books.update({libraryID: (the library ID), bookcaseNumber: (the bookcase number)}, {$set: {bookcaseNumber: null}}, {multi: true})`.
      4. 인수에 명시된 책을 소유한다: `db.Books.update({libraryID: (the library ID), bookCode: {$in: (the array of the book codes)}}, {$set: {bookcaseNumber: (the bookcase number)}}, {multi: true})`.
    - 반환 값
      - 성공 시, `{"success": true}`.
      - 실패 시, `{"success": false, "reason": (실패 까닭이 담긴 문자열)}`.


## 사용자(도서관 이용자)를 위한 것 - 3개의 API가 문서화되었음.

  - **회원 가입하기** :x:
    - 요청
      - POST
      - `/API/user/register`
    - 인자
      - ID
      - password
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. 입력된 ID가 이미 등록된 계정의 ID인지 확인한다.
      3. 입력된 암호에 대한 해시를 생성한다.
      4. `db.Accounts.insertOne({ID: (the ID), passwordHash: (그 암호에 대한 해시), type: type: "user", information: {usingLibraries: []}})`
    - 반환 값
      - `{"success": true}` on success.
      - `{"success": false, "reason": (실패 까닭이 담긴 문자열)}` on failure.

  - **사용자 코드를 소유하기** :x:
    - 요청
      - POST
      - `/API/user/ownUserCode`
    - 인자
      - `libraryID`: 그 사용자 코드가 유효한 도서관의 ID이다.
      - `userCode`: 소유할 사용자 코드이다.
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. `queryResult = db.Libraries.updateOne({libraryID: (그 도서관 ID), "userCodes.$.userCode": (그 사용자 코드), "userCodes.$.userID": null}, {$set: {"userCodes.$.userID": request.session.loggedInAs}})`
      3. 만약 데이터베이스 오류가 나면, `{"success": false, "reason": "Something is wrong with the database."}`를 반환한다.
      4. 만약 `queryResult.modifiedCount === 1`이면, `{"success": true}`를 반환한다.
      5. 그것이 아니고 `queryResult.modifiedCount === 0`이라면, `{"success": false, "reason": "The user-code does not exist, or is already owned by another user."}`를 반환한다.
      6. 그것도 아니면, `{"success": false, "reason": "Something unexpected has happened!"}`를 반환한다.
    - 반환 값
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": true}`
      - `{"success": false, "reason": "The user-code does not exist, or is already owned by another user."}`
      - `{"success": false, "reason": "Something unexpected has happened!"}`

  - **이용하고 있는 도서관 목록 얻기** :x:
    - 요청
      - POST
      - `/API/user/getUsingLibraries`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. `theAccount = db.Accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. `theAccount.type === "user"`인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "You are not a user!"}`를 반환한다.
      4. `JSON.stringify({"success": true, "usingLibraries": theAccount.information.usingLibraries})`를 반환한다.
    - 반환 값
      - `{"success": false, "reason": "noGET is not truthy."}`
      - `{"success": false, "reason": "Something is wrong with the database."}`
      - `{"success": false, "reason": "You are not a user!"}`
      - `{"success": true, "usingLibraries": [{"libraryID": (그 도서관 ID), "userCode": (그 도서관에서의 그 사용자(요청자)의 코드)}, ...]}`


## 도서관 관리자를 위한 것 - 6개의 API가 문서화되었음.

  - **도서관에 책 추가하기** :x:
    - 요청
      - POST
      - `/API/administrator/addBook` 또는 `/API/admin/addBook`
    - 인자
      - ISBN: 추가할 책의 EAN-13 형식의 국제 표준 도서 번호를 담고 있는 문자열이다.
      - bookCode: 이것은 그 책의 RFID 태그에 기록되어 있어야 한다.
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. 그 관리자(요청자)의 도서관의 ID를 얻는다: `db.Accounts.fineOne({ID: request.session.loggedInAs}).information.libraryID`.
      3. Checks if the book was already added: `db.Books.findOne({libraryID: (the library ID), bookCode: (the book code)}, {"_id": 1})`.
      4. `db.Books.insertOne({ISBN: (the ISBN), libraryID: (the library ID), bookcaseNumber: null, bookCode: (the book code)})`
    - 반환 값
      - `{"success": true}` on success.
      - `{"success": false, "reason": (실패 까닭이 담긴 문자열)}` on failure.

  - **To get information about the administrator's library** :x:
    - 요청
      - POST
      - `/API/administrator/libraryInformation` or `/API/admin/libraryInformation`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. `theAccount = db.Accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "administrator"`. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      4. `theLibraryInformation = db.Libraries.findOne({libraryID: theAccount.information.libraryID})`
      5. 반환 값 `JSON.stringify({"success": true, "libraryID": theLibraryInformation.libraryID, "libraryAPIToken": theLibraryInformation.libraryAPIToken, "userCodes": theLibraryInformation.userCodes})`.
    - 반환 값
      - `{"success": true, "libraryID": (the library ID), "libraryAPIToken": (the library API token), "userCodes": (information about the user-codes)}` on success.
      - `{"success": false}` on failure.

  - **To generate a user-code and make it under control** :x:
    - 요청
      - POST
      - `/API/administrator/newUserCode` or `/API/admin/newUserCode`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. `theAccount = db.Accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. Checks if `theAccount.type === "administrator"`. If it isn't, returns `{"success": false, "reason": "You are not an administrator of a library!"}`.
      4. Generates a random user code: `(length => (Math.random().toString(36).substring(2, 2 + length) + '0'.repeat(length)).substring(0, length))(20).toUpperCase()`.
      5. Checks if it's duplicated: `db.Libraries.findOne({libraryID: theAccount.information.libraryID, "userCodes.$.userCode": (the user code)}, {"_id": 1})`. If it already exists, goes to step 4.
      6. `db.Libraries.updateOne({libraryID: theAccount.information.libraryID}, {$push: {userCodes: {userCode: (the user code), userID: null, permission: []}}})`
      7. 반환 값 `JSON.stringify({"success": true, "newUserCode": (the user code)})`
    - 반환 값
      - `{"success": true, "newUserCode": (the new user code)}` on success.
      - `{"success": false, "reason": (실패 까닭이 담긴 문자열)}` on failure.

  - **To set permissions of a specific user-code.** :x:
    - 요청
      - POST
      - `/API/administrator/setPermissions` or `/API/admin/setPermissions`
    - 인자
      - `userCode`
      - `permissions`
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. Gets the library ID: `db.Accounts.findOne({ID: request.session.loggedInAs}, {information: 1}).information.libraryID`.
      3. `db.Libraries.updateOne({libraryID: (the library ID), "userCodes.$.userCode": (the user code)}, {$set: {"userCodes.$.permission": (the permissions)}})`. If the returned is not `{"modifiedCount": 1}`, returns `{"success": false, "reason": "The user code does not exist."}`.
    - 반환 값

  - **To delete a specific user-code for an administrator's library** :x:
    - 요청
      - POST
      - `/API/administrator/deleteUserCode` or `/API/admin/deleteUserCode`
    - 인자
      - userCode: a user-code, to delete, for the administrator's library.
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. Gets the library ID: `db.Accounts.findOne({ID: request.session.loggedInAs}, {information: 1}).information.libraryID`.
      3. `db.Libraries.updateOne({libraryID: (the library ID)}, {$pull: {userCodes: {$elemMatch: {userCode: (the user code)}}}})`. If the returned is not `{"modifiedCount": 1}`, returns `{"success": false, "reason": "The user code does not exist."}`.
    - 반환 값
      - `{"success": true}` on success.
      - `{"success": false, "reason": (실패 까닭이 담긴 문자열)}` on failure.

  - **To generate a new library API token and update it** :x:
    - 요청
      - POST
      - `/API/administrator/newLibraryAPIToken` or `/API/admin/newLibraryAPIToken`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. Generates a new random long string, which will be the new library API token.
      3. Gets the ID of the administrator's library: `db.Accounts.findOne({ID: request.session.loggedInAs}).information.libraryID`.
      4. `db.Libraries.updateOne({libraryID: (the library ID)}, {$set: {libraryAPIToken: (the new API token)}})`
    - 반환 값
      - `{"success": true}` on success.
      - `{"success": false, "reason": (실패 까닭이 담긴 문자열)}` on failure.


## For developers - 0 API



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
        - userID: null | "something"
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
