# LibraryLight API
## 기호
 - :x:: **아직 개발되지 않았음**.
 - :star:: **그 부분의 문서화가 덜 되었음**.
 - :boom:: **그 API가 원자적이지 않아서 치명적인 쿼리 충돌(경쟁 상태)을 야기할 수 있음**.

## 조건
 - 하나의 관리자는 오직 하나의 도서관만 관리할 수 있다.
 - 관리자에게 주어진 도서관 ID는 바뀌지 않는다.
 - 계정의 유형은 바뀌지 않는다.
 - API들은 각기 요구되는 권한(인증)이 있어야 동작한다.
 - 모든 API들은 원자적이어야 한다(즉 :boom:이 없어야 한다.).
 - API 루틴이 실행되고 있을 때에 데이터베이스 오류가 나면, `{"success": false, "reason": "Something is wrong with the database."}`가 반환된다.

## 문제점
### **쿼리 충돌을 어떻게 방지할 것인가?**
 - 어떤 도서관에 대한 정보를 다루는지로 들어온 API 요청을 나누어, 각 도서관에 해당하는 _작업 큐_에 넣어 각 도서관마다 순차적으로 처리한다.
 - [이 문서](https://docs.mongodb.com/manual/reference/glossary/#term-concurrency-control)를 확인하여 해결책을 찾아 본다.
 - [좋은 문서](http://stackoverflow.com/questions/10778493/whats-the-difference-between-findandmodify-and-update-in-mongodb)를 찾은 것 같네요! 그런데 잠깐만요. 지금 머리가 조금 아프네요…….

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
  - **책장 안에 있는 책의 정보를 갱신하기** :x: :boom:
    - 요청
      - POST
      - `/API/takeMyBooks`
    - 인자
      - `libraryAPIToken`
      - `bookcaseNumber`: 책장 번호이다. 이것은 그 도서관에서 유일해야 한다.
      - `bookCodes`: 이것은 그 책들의 RFID 태그에서 읽힌 책 코드들로 이루어진 배열이다.
    - 동작
      1. 입력이 유효한지 검사한다. 이때에 `bookcaseNumber`는 `null`이면 안 된다.
      2. 도서관 ID를 얻는다: `db.libraries.findOne({libraryAPIToken: (그 도서관 API 토큰)}, {libraryID: 1}).libraryID`.
      3. 기존에 꽂혀(소유하고) 있던 책에 대한 소유권을 제거한다: `db.books.update({libraryID: (그 도서관 ID), bookcaseNumber: (그 책장 번호)}, {$set: {bookcaseNumber: null}}, {multi: true})`.
      4. 인수에 명시된 책을 소유한다: `db.books.update({libraryID: (그 도서관 ID), bookCode: {$in: (그 책 코드들로 이루어진 배열)}}, {$set: {bookcaseNumber: (그 책장 번호)}}, {multi: true})`.
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
      2. 입력된 ID가 이미 등록된 계정의 ID인지 엄격하지 않게 확인한다: `db.accounts.findOne({ID: (그 계정 ID)}, {"_id": 1})`. 만약 그렇다면, `{"success": false, "reason": "The account already exists."}`를 반환한다.
      3. 입력된 암호에 대한 해시를 생성한다. 이는 연산 비용이 많이 드는 작업이다.
      4. 계정이 이미 있지 않으면 계정을 생성한다: `db.accounts.updateOne({ID: (그 계정 ID)}, {ID: (그 계정 ID), passwordHash: (그 암호에 대한 해시), type: "user", information: {usingLibraries: []}}, {upsert: true})`.
      5. 4번 단계에서 사용한 쿼리의 반환 값의 `"upsertedId"` 프로퍼티가 존재하면 `{"success": true}`를 반환하고, 아니면 `{"success": false, "reason": "The account already exists."}`를 반환한다.
    - 반환 값
      - 성공 시, `{"success": true}`.
      - `{"success": false, "reason": "The account already exists."}`
      - 실패 시, `{"success": false, "reason": (실패 까닭이 담긴 문자열)}`.
      - `{"success": false, "reason": "Something is wrong with the database."}`

  - **사용자 코드를 소유하기** :x:
    - 요청
      - POST
      - `/API/user/ownUserCode`
    - 인자
      - `libraryID`: 그 사용자 코드가 유효한 도서관의 ID이다.
      - `userCode`: 소유할 사용자 코드이다.
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. 그 사용자 코드가 존재하고 소유되어 있지 않다면 소유한다: `queryResult = db.userCodes.updateOne({libraryID: (그 도서관 ID), userCode: (그 사용자 코드), userID: null}, {$set: {userID: request.session.loggedInAs}})`.
      3. 만약 `queryResult.modifiedCount === 1`이면, `{"success": true}`를 반환한다.
      4. 그것이 아니고 `queryResult.modifiedCount === 0`이라면, `{"success": false, "reason": "The user-code does not exist, or is already owned by another user."}`를 반환한다.
      5. 그것도 아니면, `{"success": false, "reason": "Something unexpected has happened!"}`를 반환한다.
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
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
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
      2. 그 관리자(요청자)의 도서관의 ID를 얻는다: `db.accounts.fineOne({ID: request.session.loggedInAs}).information.libraryID`.
      3. 그 책이 이미 있지 않으면 그 책을 추가한다: `db.books.updateOne({libraryID: (그 도서관 ID), bookCode: (그 책 코드)}, {$setOnInsert: {libraryID: (그 도서관 ID), bookCode: (그 책 코드), bookcaseNumber: null, ISBN: (그 국제 표준 도서 번호), bookcaseUpdatedAt: null}}, {upsert: true})`.
      4. 3번 단계에서 사용한 쿼리의 반환 값의 `"upsertedId"` 프로퍼티가 존재하면 `{"success": true}`를 반환하고, 아니면 `{"success": false, "reason": "The book already exists."}`를 반환한다.
    - 반환 값
      - 성공 시, `{"success": true}`.
      - `{"success": false, "reason": "The book already exists."}`
      - 실패 시, `{"success": false, "reason": (실패 까닭이 담긴 문자열)}`.

  - **그 관리자(요청자)의 도서관에 대한 정보 얻기** :x:
    - 요청
      - POST
      - `/API/administrator/getLibraryInformation` 또는 `/API/admin/getLibraryInformation`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. `theAccount.type === "administrator"`인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "You are not an administrator of a library!"}`를 반환한다.
      4. `theLibraryInformation = db.libraries.findOne({"libraryID": theAccount.information.libraryID}, {"_id": 0})`
      5. `JSON.stringify({"success": true, "libraryID": theLibraryInformation.libraryID, "libraryAPIToken": theLibraryInformation.libraryAPIToken, "userCodes": theLibraryInformation.userCodes})`를 반환한다.
    - 반환 값
      - `{"success": false, "reason": "You are not an administrator of a library!"}`
      - `{"success": true, "libraryID": (그 도서관 ID), "libraryAPIToken": (그 도서관 API 토큰)}`
      - `{"success": false, "reason": "Something is wrong with the database."}`

  - **그 관리자(요청자)의 도서관의 사용자 코드에 대한 정보 얻기** :x:
    - 요청
      - `/API/administrator/getUserCodes` 또는 `/API/admin/getUserCodes`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. `theAccount.type === "administrator"`인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "You are not an administrator of a library!"}`를 반환한다.
      4. `theUserCodes = db.userCodes.find({"libraryID": theAccount.information.libraryID}, {"libraryID": 1, "userCode": 1, "userID": 1, "permission": 1, "_id": 0})`
      5. `JSON.stringify({"success": true, "userCodes": theUserCodes})`를 반환한다.
    - 반환 값
      - `{"success": false, "reason": "You are not an administrator of a library!"}`.
      - `{"success": true, "userCodes": (그 사용자 코드들에 대한 정보):star:<배열의 형태로 나타낼 것>}`
      - `{"success": false, "reason": "Something is wrong with the database."}`

  - **사용자 코드를 생성하고 관리하에 두기** :x: :boom:
    - 요청
      - POST
      - `/API/administrator/newUserCode` 또는 `/API/admin/newUserCode`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. `theAccount = db.accounts.findOne({ID: request.session.loggedInAs}, {type: 1, information: 1})`
      3. `theAccount.type === "administrator"`인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "You are not an administrator of a library!"}`를 반환한다.
      4. 무작위의 사용자 코드를 생성한다: `(length => (Math.random().toString(36).substring(2, 2 + length) + '0'.repeat(length)).substring(0, length))(20).toUpperCase()`.
      5. 생성된 사용자 코드가 이미 그 도서관에 존재하는지 확인한다: `db.libraries.findOne({libraryID: theAccount.information.libraryID, "userCodes.$.userCode": (새롭게 생성된 사용자 코드)}, {"_id": 1})`. 만약 그렇다면, 4번 동작으로 간다.
      6. `db.libraries.updateOne({libraryID: theAccount.information.libraryID}, {$push: {userCodes: {userCode: (새롭게 생성된 사용자 코드), userID: null, permission: []}}})`
      7. `JSON.stringify({"success": true, "newUserCode": (새롭게 생성된 사용자 코드)})`를 반환한다.
    - 반환 값
      - 성공 시, `{"success": true, "newUserCode": (새롭게 생성된 사용자 코드)}`.
      - 실패 시, `{"success": false, "reason": (실패 까닭이 담긴 문자열)}`.

  - **특정한 사용자 코드의 권한 설정하기** :x:
    - 요청
      - POST
      - `/API/administrator/setPermissions` 또는 `/API/admin/setPermissions`
    - 인자
      - `userCode`
      - `permissions`
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. `theAccount.type === "administrator"`인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "You are not an administrator of a library!"}`를 반환한다.
      3. 그 관리자(요청자)의 도서관의 ID를 얻는다: `db.accounts.findOne({ID: request.session.loggedInAs}, {information: 1}).information.libraryID`.
      4. `db.libraries.updateOne({libraryID: (그 도서관 ID), "userCodes.$.userCode": (권한을 설정할 사용자 코드)}, {$set: {"userCodes.$.permission": (설정할 권한들)}})` 후에, 만약 그 반환 값이 `{"modifiedCount": 1}`가 아니면, `{"success": false, "reason": "The user code does not exist."}`를 반환한다.
      5. 
    - 반환 값:star:

  - **그 도서관의 특정한 사용자 코드 제거하기** :x:
    - 요청
      - POST
      - `/API/administrator/deleteUserCode` 또는 `/API/admin/deleteUserCode`
    - 인자
      - userCode: 제거할, 그 도서관에 존재하는 사용자 코드이다.
    - 동작
      1. 입력된 인수가 유효한지 확인한다.
      2. `theAccount.type === "administrator"`인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "You are not an administrator of a library!"}`를 반환한다.
      3. 그 관리자(요청자)의 도서관의 ID를 얻는다: `db.accounts.findOne({ID: request.session.loggedInAs}, {information: 1}).information.libraryID`.
      4. `db.libraries.updateOne({libraryID: (그 도서관 ID)}, {$pull: {userCodes: {$elemMatch: {userCode: (제거할 사용자 코드)}}}})` 후에, 만약 그 반환 값이 `{"modifiedCount": 1}`이 아니면, `{"success": false, "reason": "The user code does not exist."}`를 반환한다.
      5. :star: 아니면 성공.
    - 반환 값
      - 성공 시, `{"success": true}`.
      - 실패 시, `{"success": false, "reason": (실패 까닭이 담긴 문자열)}`.

  - **새로운 도서관 API 토큰을 생성하여 그것을 도서관 API 토큰으로 하기** :x:
    - 요청
      - POST
      - `/API/administrator/newLibraryAPIToken` 또는 `/API/admin/newLibraryAPIToken`
    - 인자
      - `noGET`: 반드시 참 값이어야 한다.
    - 동작
      1. `noGET`이 참 값인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "noGET is not truthy."}`를 반환한다.
      2. `theAccount.type === "administrator"`인지 확인한다. 그렇지 않다면, `{"success": false, "reason": "You are not an administrator of a library!"}`를 반환한다.
      3. 새로운 도서관 API 토큰이 될 무작위의 긴 문자열을 생성한다.
      4. 그것이 기존의 도서관 API 토큰과 같은지 확인한다. 만약 그렇다면, 3번 동작으로 간다.
      5. 그 관리자(요청자)의 도서관의 ID를 얻는다: `db.accounts.findOne({ID: request.session.loggedInAs}).information.libraryID`.
      6. `db.libraries.updateOne({libraryID: (그 도서관 ID)}, {$set: {libraryAPIToken: (그 새로운 도서관 API 토큰)}})`
    - 반환 값
      - 성공 시, `{"success": true}`.
      - 실패 시, `{"success": false, "reason": (실패 까닭이 담긴 문자열)}`.


## 개발자를 위한 것 - 0개의 API가 문서화되었음.



# 최적화에 대하여

## 특정한 문서가 있는지 확인할 때
 [이 글](https://blog.serverdensity.com/checking-if-a-document-exists-mongodb-slow-findone-vs-find/)에 따르면, 특정한 문서가 있는지 확인할 때에, `findOne`은 `find`와 `limit`의 조합보다 매우 느리다고 한다. 그러나 나는 `node-mongodb-native` 모듈을 쓰고 이 모듈의 `findOne`은 내부적으로 `find`와 `limit`의 조합으로 구현되어 있기 때문에, 특정한 문서가 있는지 확인하기 위해 `findOne`을 쓰겠다.
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



# LibraryLight 데이터베이스 구조
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
      - libraryID: (그 사용자 코드가 유효한 도서관의 ID)
      - userCode: (20 자의, 반각 숫자 또는 라틴 알파벳으로 이루어진 문자열)
      - userID: null | "이 사용자 코드에 해당하는 계정의 ID"
      - permission: {"borrowable": true|false, "lightable": true|false}
    - lights
      - :star:
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

## *사용자 코드*의 의의
 _사용자 코드_가 없다고 가정하면, 도서관 관리자에게 그 도서관을 이용할 권한을 받기 위해 계정 ID를 제출하여야 할 것이고, 이때에 **타인** A의 ID를 제출하면 그 도서관의 관리자가 그 ID에 그 권한을 부여하여 A가 그 도서관의 이용자가 될 것이다. 그런데 이는 A의 요청에 의한 것이 아니므로, 이런 방식은 바람직하지 않다. 이에 ‘_사용자 코드_’라는 개념을 도입하여, 특정한 계정을 가진 자가 특정한 도서관의 이용자가 되려면 그 도서관에서 발급한 사용자 코드를 그 계정으로 로그인한 상태에서 도서관 ID와 함께 등록해야 하게 만듦으로써 상기된 방식의 문제점을 해결하였다.



# MODIFING DB & API
```
userCode

/API/admin/newUserCode
/API/admin/setPermissions
/API/admin/deleteUserCode
```
