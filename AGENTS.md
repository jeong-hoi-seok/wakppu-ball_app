# wakppu-ball_app

React Native (Expo SDK 54) + TypeScript 앱.

## 필수 문서

코드 작성 전 Expo 버전 고정 문서를 참고한다.

https://docs.expo.dev/versions/v54.0.0/

## 스택

| 영역 | 도구 |
|---|---|
| 프레임워크 | Expo SDK 54, expo-router (파일 기반 라우팅) |
| 언어 | TypeScript (`strict: true`) |
| 스타일 | NativeWind 4 + Tailwind CSS v3 (`className`) |
| 상태관리 | Zustand |
| 린트/포맷 | Biome (ESLint·Prettier 대체) |

## 디렉터리

```
src/
  app/          # 화면·레이아웃 (expo-router 전용)
  components/   # 공용 UI 컴포넌트
  store/        # Zustand 스토어
  hooks/        # 커스텀 훅
  constants/    # 상수
  global.css    # Tailwind 지시어 + 전역 CSS 변수
```

경로 별칭: `@/*` → `./src/*`, `@/assets/*` → `./assets/*`

## 명령어

```bash
npm start          # 개발 서버
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
npm run lint       # Biome 검사
npm run lint:fix   # Biome 자동 수정
npm run format     # Biome 포맷
npm run typecheck  # tsc --noEmit
```

## 코딩 규칙

- 스타일은 NativeWind `className` 우선. `StyleSheet`는 필요할 때만 사용
- 화면은 `src/app/`, 재사용 UI는 `src/components/`에 둔다
- `const` 화살표 함수, 이벤트 핸들러는 `handle` 접두사
- early return, 최소 범위 diff
- UI 문구는 한국어 기본

## 설정 파일

- `tailwind.config.js` — `nativewind/preset`, `content: ./src/**`
- `babel.config.js` — `babel-preset-expo` + `nativewind/babel`
- `metro.config.js` — `withNativeWind`, 입력 `./src/global.css`
- `biome.json` — 린트·포맷 (single quote, 2칸 들여쓰기, 100자)
