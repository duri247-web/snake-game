# 바이브코딩 실습

HTML, CSS, JavaScript로 만든 작은 웹앱 모음입니다. 각 폴더는 `index.html`, `style.css`, `main.js`로 구성된 독립 프로젝트이며, 빌드 없이 `index.html`을 브라우저에서 열면 바로 실행됩니다.

## 프로젝트

| 폴더 | 설명 |
| --- | --- |
| [Snake game](Snake%20game/) | 스네이크 게임. 난이도 선택, 일시정지, 레벨 시스템, 효과음, 최고 점수 저장 |
| [todo](todo/) | 할 일 목록. 추가/삭제/완료 토글, LocalStorage 저장, 전체·완료 개수 표시 |
| [count](count/) | 카운터. 증가/감소/리셋, 양수는 초록색·음수는 빨간색 표시 |
| [fxconveter](fxconveter/) | 환율 변환기(USD, EUR, KRW, JPY). 통화 교환 버튼 지원 |
| [Hello world](Hello%20world/) | 자기소개 카드 페이지 |
| [My todo](My%20todo/) | 기본 카운터 (색상 표시 없는 초기 버전) |

## Snake game

- 400x400 캔버스, 20x20 격자, 방향키로 조종
- 먹이를 먹으면 +10점, 50점마다 레벨업(이동 간격 10ms 단축)
- 난이도: 쉬움 200ms / 보통 150ms(기본) / 어려움 100ms / 매우 어려움 50ms
- 벽이나 자기 몸에 부딪히면 게임 오버
- 최고 점수는 LocalStorage에 저장

## 환율 변환기

[exchangerate-api](https://api.exchangerate-api.com/v4/latest/USD)의 환율 데이터를 사용하므로 인터넷 연결이 필요합니다.

## 실행 방법

```bash
git clone https://github.com/duri247-web/snake-game.git
```

받은 폴더에서 원하는 프로젝트 폴더의 `index.html`을 브라우저로 엽니다.
