# LibraryLight scenario

:small_orange_diamond:: users' API.
:small_blue_diamond:: library administrators' API.
:small_red_triangle:: bookcases' API.

1. 사용자가 책첵 서비스가 적용된 도서관을 이용하려고 한다.
2. :small_orange_diamond: `/API/user/register` 그러기 위하여 **그 사용자**는 책첵 계정을 생성(회원 가입)한다.
3. 그 사용자가 그 도서관에 가서 인증 절차를 밟았다. 그 도서관의 관리자가 그 도서관을 쓸 수 있는 권한을 그 사용자에게 부여하고자 한다.
4. :small_blue_diamond: `/API/administrator/libraryInformation` **그 관리자**가 user-code 목록이 나타난 관리 페이지를 확인한다. 이 페이지에는 그 도서관의 ID도 같이 보인다.
5. :small_blue_diamond: `/API/administrator/newUserCode` **그 관리자**가 새로운 user-code를 생성한다. 
6. :small_blue_diamond: `/API/administrator/setPermissions` **그 관리자**가 그 user-code에 책을 빌릴 수 있는 권한(`"borrowable"`)과 책장을 점등할 수 있는 권한(`"lightable"`)을 부여한다.
7. 그 관리자가 그 도서관의 ID와 그 user-code를 그 사용자에게 알린다.
8. :small_orange_diamond: `/API/login` **그 사용자**가 자신의 책첵 계정에 로그인한다.
9. :small_orange_diamond: `/API/user/ownUserCode` **그 사용자**가 자신의 계정에 그 도서관의 ID와 그 user-code를 입력하여 그 user-code에 자신의 계정을 연결한다.
10. 이제 그 사용자는 그 도서관을 이용할 수 있다.
11. :small_blue_diamond: `/API/administrator/addBook` **그 관리자**가 그 도서관에 책을 추가·등록한다.
12. :small_orange_diamond: `/API/user/getUsingLibraries` **그 사용자**가 자신이 이용하는 도서관의 목록을 확인한다.
13. :small_orange_diamond: **그 사용자**가 찾고자 하는 책을 검색한다. 검색 조건은 그 책이 꽂힌 도서관(다중 선택 가능), 그 책의 ISBN, 그 책의 제목 등이다.
14. :small_orange_diamond: **그 사용자**가 특정 책이 꽂힌 책장을 점등해 달라는 요청을 보내고 그 결과를 안내받는다.
15. :small_red_triangle: **그 책장을 관리하는 Raspberry Pi**가 자신에게 오는 점등 요청을 주기적으로 확인하여 점등 처리를 한다.
16. :small_red_triangle: `/API/takeMyBooks` 그 사용자가 책을 그 책장에서 빼고, **그 책장을 관리하는 Raspberry Pi**가 책장에 꽂힌 책들의 정보를 읽어 주 서버에 보내 갱신한다. 이때에 그 도서관의 API token을 이용하여 그 도서관으로부터 온 갱신 요청임을 인증한다.
17. :small_orange_diamond: **그 사용자**가 책을 빌린다(첵책 페이지에서 특정한 책을 빌릴 수 있다.). 주 서버의 데이터베이스에서, 그 책의 ‘빌린 자’ 항목과 그 사용자의 ‘빌린 책’ 항목이 갱신된다.
18. 그 사용자가 빌린 책 중에서 일부를 분실하여, 그 분실된 책이 있던 도서관의 관리자에게 그 사실을 알리고 그 관리자에게 그 책에 대한 대금을 지불한다.
19. :small_blue_diamond: **그 관리자**가 그 사용자가 빌린 책을 검색한다. 검색 조건을 ‘특정한 사용자가 빌린 책 또는 빌려지지 않은 책’, ‘책장에 없는 책’, ‘빌려져 있는 기간’, ‘빌려진 일시’, ‘반납된 일시’ 등으로 하는 것은 관리자의 권한이 있어야 한다. 참고로 ‘빌려지지 않은 책’과 ‘책장에 없는 책’을 조건으로 검색하여 도난되었을 수 있는 책을 확인할 수 있다.
20. :small_blue_diamond: **그 관리자**가 그 사용자가 분실했다고 한 책을 제거한다. 이때에 그 사용자의 ‘빌린 책’ 항목에서 그 책에 대한 정보가 제거된다.
21. :interrobang: **그 사용자**가 자신이 빌린 책을 반납한다.
22. :small_orange_diamond: `/API/logout` **그 사용자**가 로그아웃한다.
23. 그 사용자가 책첵을 탈퇴하려고 한다.
24. :small_blue_diamond: `/API/administrator/deleteUserCode` 그 사용자가 이용하는 **도서관의 관리자**가 그 사용자의 user-code를 제거한다.
25. :small_orange_diamond: **그 사용자**가 책첵을 탈퇴한다. 그 사용자에 해당하는 모든 user-code가 제거된다.(문제: 하기 문제 참고.)

`/API/administrator/newLibraryAPIToken`



## Comments

### 무인 시스템일 경우, 책 도난이 발생할 수 있다.
 - _책 대여에 대한 무인 시스템_을 포기하거나 해결 방안을 찾아야 한다.

###  찾지도 않을 책이 꽂혀 있는 책장을 함부로 점등하는 사용자의 처리 문제.
 - 점등 후, 그 책이 실제로 그 책장에서 사라진 여부를 이용할 수 있다.

### 회원 탈퇴 시에 그 사용자가 빌린 책이 남아 있을 경우의 처리 문제.
 - 빌린 책이 남아 있으면 회원 탈퇴가 불가능하게 만들면 편할 텐데, 그렇게 하면 다른 문제가 발생할 수 있다.

### 책 빼돌리기 문제.
 1. 비싼 책을 빌린다.
 2. 비싼 책의 RFID 태그 A에 저장된 값을 읽어, 그 값을 RFID 태그 B에 쓴다.
 3. B를 공책에 붙이고 공책을 반납한다.
 4. 이 과정이 무인으로 진행된다면, Raspberry Pi는 그 공책을 그 비싼 책으로 인식할 것이고, 그 비싼 책은 빼돌려질 것이다.
 5. 이것을 방지하려면 _책 반납에 대한 무인 시스템_을 포기하여야 한다.
