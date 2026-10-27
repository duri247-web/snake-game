const STORAGE_KEY = 'todos';

// 할 일 목록
let todos = [];
let nextId = 1;

const form = document.querySelector('.input-row');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const stats = document.getElementById('todo-stats');

// LocalStorage에 저장 (사용 불가 환경에서는 무시)
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.warn('저장 실패:', e);
  }
}

// LocalStorage에서 불러오기 (데이터가 없거나 깨졌으면 빈 목록)
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) {
      todos = saved;
    }
  } catch (e) {
    todos = [];
  }
  // 다음 id는 기존 id의 최댓값 + 1
  nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
}

// 배열 내용을 화면에 다시 그림
function render() {
  list.innerHTML = '';

  // 전체/완료 개수 표시
  const doneCount = todos.filter((t) => t.done).length;
  stats.textContent = `전체 ${todos.length}개, 완료 ${doneCount}개`;

  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.classList.toggle('done', todo.done);

    // 완료/미완료 체크박스
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    // 할 일 텍스트 (textContent로 넣어 HTML 삽입 방지)
    const text = document.createElement('span');
    text.textContent = todo.text;

    // 삭제 버튼
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'del-btn';
    delBtn.textContent = '삭제';
    delBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.append(checkbox, text, delBtn);
    list.appendChild(li);
  });
}

// 할 일 추가
function addTodo() {
  const text = input.value.trim();

  // 빈 값이면 알림
  if (!text) {
    alert('할 일을 입력하세요');
    return;
  }

  todos.push({ id: nextId++, text, done: false });
  input.value = '';
  input.focus();
  save();
  render();
}

// 완료 상태 토글
function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    save();
    render();
  }
}

// 항목 삭제
function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  save();
  render();
}

function initApp() {
  load();
  // 추가 버튼 클릭과 Enter 키 모두 폼 제출로 처리됨
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTodo();
  });
  render();
}

initApp();
