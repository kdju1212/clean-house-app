# 우리동네 청소업체 — 모바일 앱

[clean_house](https://github.com/kdju1212/clean_house) 웹 레포의 `/api/mobile/*` API를 그대로 쓰는 Expo(React Native) 앱입니다. 지역 매칭, 예약 검증 등 핵심 로직은 웹과 동일한 백엔드 코드를 공유하고, 이 레포는 화면(UI)만 담당합니다.

## 기술 스택
- Expo SDK 57 + expo-router (파일 기반 라우팅, 웹 레포의 App Router와 동일한 개념)
- TypeScript
- `@react-native-seoul/kakao-login` — 카카오 네이티브 로그인
- `@react-native-async-storage/async-storage` — 로그인 토큰 · 선택 지역 로컬 저장

## 로컬 개발 환경 준비

### 1. 환경 변수
```bash
cp .env.example .env
```
`EXPO_PUBLIC_API_URL`은 clean_house 웹 레포를 로컬에서 `npm run dev`로 띄운 주소를 가리킵니다. 실기기/Android 에뮬레이터로 테스트할 땐 `localhost`가 아니라 PC의 LAN IP를 써야 폰에서 접속됩니다.

### 2. 패키지 설치
```bash
npm install
```

### 3. 카카오 네이티브 앱 키 설정
`app.json`의 `plugins` 항목에 있는 `kakaoAppKey` 값(`KAKAO_NATIVE_APP_KEY_PLACEHOLDER`)을 [카카오 개발자 콘솔](https://developers.kakao.com/console/app)에서 발급받은 **네이티브 앱 키**로 교체하세요. 웹 레포의 `AUTH_KAKAO_ID`(REST API 키)와는 다른 키입니다.

## ⚠️ Expo Go로는 실행이 안 돼요

카카오 로그인은 커스텀 네이티브 모듈이라 Expo Go 앱에서는 동작하지 않습니다. 아래처럼 **개발 빌드(dev client)**를 만들어야 실제 로그인 테스트가 가능해요.

```bash
npx expo install expo-dev-client
npx expo run:android   # 또는: npx expo run:ios (macOS 필요)
```

로그인 없이 화면 구조만 빠르게 보고 싶다면 `npx expo start`로 Expo Go에서 실행해도 되지만, 카카오 로그인 버튼을 누르면 에러가 납니다 (정상입니다).

## 폴더 구조
```
app/                     # expo-router 화면 (파일 = 라우트)
  _layout.tsx            # 루트 레이아웃
  index.tsx              # 진입점 — 저장된 토큰 유무에 따라 /login 또는 /home으로 리다이렉트
  login.tsx               # 카카오 로그인 화면
  home.tsx                # 로그인 후 화면 (플레이스홀더)
src/
  api/
    client.ts             # /api/mobile/* 호출용 fetch 래퍼 (토큰 자동 첨부)
    auth.ts                # 카카오 토큰 -> 우리 서버 토큰 교환
  storage/
    auth-storage.ts        # 로그인 토큰 · 선택 지역 AsyncStorage 저장
```

## 다음에 만들 화면
- 지역 선택 (`/api/mobile/regions`)
- 카테고리별 업체 목록 (`/api/mobile/categories/[slug]/companies`)
- 예약 신청 (`/api/mobile/reservations`)
