// 현재 카운트 값
let count = 0;

const countEl = document.getElementById('count');

// 화면의 숫자를 현재 값으로 갱신하고 부호에 따라 색상 클래스 적용
function render() {
  countEl.textContent = count;
  countEl.classList.toggle('positive', count > 0);
  countEl.classList.toggle('negative', count < 0);
}

// 증가 버튼: 1 증가
document.getElementById('increase').addEventListener('click', () => {
  count += 1;
  render();
});

// 감소 버튼: 1 감소
document.getElementById('decrease').addEventListener('click', () => {
  count -= 1;
  render();
});

// 리셋 버튼: 0으로 초기화
document.getElementById('reset').addEventListener('click', () => {
  count = 0;
  render();
});
