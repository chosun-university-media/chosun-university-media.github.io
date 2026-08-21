# 회원 인증 설정

이 디렉터리의 `schema.sql`은 회원 프로필, 관리자 승인 상태 및 접근 정책을 생성합니다.

1. Supabase 프로젝트의 SQL Editor에서 `schema.sql` 전체를 실행합니다.
2. Authentication > URL Configuration의 Site URL을 실제 배포 주소로 지정합니다.
3. Redirect URLs에 `https://배포주소/auth/confirm`을 추가합니다.
4. 프로젝트 URL과 Publishable key를 배포 환경변수에 등록합니다.
5. 관리자 비밀번호 재설정 함수는 `supabase functions deploy admin-reset-password`로 배포합니다.

관리자 이메일은 `qjtjt1827@naver.com`으로 지정되어 있습니다. 이 이메일로 가입한 계정은 자동으로 관리자 승인을 받습니다.

비밀번호는 Supabase Auth에서 해시로 저장되므로 관리자에게도 기존 값이 표시되지 않습니다. 관리자는 회원 관리 화면에서 새 비밀번호로 재설정할 수 있습니다.
