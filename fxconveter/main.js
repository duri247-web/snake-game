const API_URL = 'https://api.exchangerate-api.com/v4/latest/';

const amountEl = document.getElementById('amount');
const fromEl = document.getElementById('from');
const toEl = document.getElementById('to');
const resultEl = document.getElementById('result');

// 변환 버튼 클릭 시 환율을 조회해 결과 표시
async function convert() {
  const amount = parseFloat(amountEl.value);
  if (isNaN(amount)) {
    resultEl.textContent = '금액을 입력하세요';
    return;
  }

  const from = fromEl.value;
  const to = toEl.value;

  try {
    const res = await fetch(API_URL + from);
    if (!res.ok) throw new Error('응답 오류');
    const data = await res.json();

    const converted = amount * data.rates[to];
    resultEl.textContent =
      `${amount.toLocaleString()} ${from} = ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`;
  } catch (e) {
    resultEl.textContent = '환율 정보를 가져오지 못했습니다';
  }
}

// 교환 버튼: From과 To 통화를 서로 바꾸고, 금액이 있으면 바로 변환
document.getElementById('swap-btn').addEventListener('click', () => {
  [fromEl.value, toEl.value] = [toEl.value, fromEl.value];
  if (amountEl.value !== '') {
    convert();
  }
});

document.getElementById('convert').addEventListener('click', convert);
