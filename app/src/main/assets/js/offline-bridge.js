'use strict';
(function () {
  const KEY = 'mg-offline-state-v1';
  const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const p = (title, text, likes, image) => ({
    id: uid(), title: title, text: text, likes: likes, image: image || '',
    comments: [], createdAt: Date.now()
  });
  const poem = (title, text) => ({ id: uid(), title: title, text: text });

  function seed() {
    return {
      profiles: [
        {
          id: 'manya', username: 'manya', name: 'Маня',
          role: 'Генеральный директор по тыгыдыку',
          bio: 'Маня • Генеральный директор по тыгыдыку. Главный кормилец и оператор: Денис (папа)',
          followers: 1200000, following: 12, avatar: '',
          posts: [
            p('Профессиональный сон 20 часов в сутки', 'Мой календарь забит. С 9 до 18 — сон. После — восстановление после сна. Просьба не беспокоить. ☁️', 24801),
            p('Уничтожение корма на скорость', 'Личный рекорд обновлён. Миска опустела раньше, чем Денис успел включить камеру. Всё ради науки.', 18342),
            p('Тяжелая работа: Ничего не делать', 'Иногда самое продуктивное решение — остаться на подоконнике. Сегодня я приняла именно его.', 31609),
            p('Секретная спецоперация: Поклянчить вкусняшки у Дениса на кухне', 'Оператор Денис замечен у холодильника. Применяю взгляд, перед которым папа Денис не устоит. Цель: добавка. Статус: мурчу.', 42107)
          ],
          poems: [
            poem('Дом там, где мурчат', 'Тихо свет ложится на подушку,\nДень свернулся мягким калачом.\nМаня подставляет папе ушко —\nИ весь мир становится теплом.'),
            poem('Важные дела', 'Утром — сон, потом немного света,\nПосле — миска, полная чудес.\nУ Мани есть прекрасная примета:\nЕсли папа дома — счастлив весь.'),
            poem('Ночной маршрут', 'Спит квартира. Только лапы\nЗнают тайный поворот.\nТыгыдык — и сон у папы\nВ отпуск срочный уезжает. Вот.')
          ]
        },
        {
          id: 'barsik', username: 'barsik.cat', name: 'Кот Барсик',
          role: 'Вор сосисок',
          bio: 'Кот Барсик • Вор сосисок. Специалист по внезапным исчезновениям вашего завтрака.',
          followers: 84300, following: 32, avatar: '',
          posts: [
            p('Сосиска сама пришла', 'Я просто сидел рядом. Доказательств обратного нет. 🐾', 8401),
            p('На страже холодильника', 'Ни один продукт не пройдёт без моей проверки.', 6720)
          ],
          poems: [poem('Алиби', 'На столе была сосиска,\nЯ сидел совсем не близко.\nКто же съел её? Вопрос.\nОтвернусь и спрячу нос.')]
        },
        {
          id: 'bobik', username: 'bobik.dog', name: 'Пёс Бобик',
          role: 'Профессиональный гав',
          bio: 'Пёс Бобик • Профессиональный гав. Хороший мальчик, проверено всеми соседями.',
          followers: 62100, following: 47, avatar: '',
          posts: [
            p('Прогулка — это маленькая жизнь', 'Проверил каждый куст. Новости отличные.', 5400),
            p('Кто здесь хороший мальчик?', 'Вопрос риторический. Но ответить всё равно можно.', 7632)
          ],
          poems: [poem('Поводок', 'Только звякнул поводок —\nСчастье мчится на порог.\nЛапы, уши, мокрый нос —\nНа прогулку вышел пёс.')]
        },
        {
          id: 'musya', username: 'musya.nextdoor', name: 'Кошка Муся',
          role: 'Любимая соседка Мани',
          bio: 'Кошка Муся • Любимая соседка Мани. Эстетика подоконников и неспешных воскресений.',
          followers: 107000, following: 19, avatar: '',
          posts: [
            p('Воскресенье на подоконнике', 'Свет, тишина и никакой спешки. Мой вид заботы о себе.', 12304),
            p('В гости к Мане', 'Обсудили голубей, цены на корм и личные границы.', 15900)
          ],
          poems: [poem('По соседству', 'Через двор, через окошко\nСмотрит солнечная кошка.\nМаня машет ей хвостом:\n«Приходи, чаёк нальём».')]
        }
      ],
      feeding: { level: 64, nextFeedAt: 0, updatedAt: Date.now() },
      views: { manya: 0, barsik: 0, bobik: 0, musya: 0 },
      logs: []
    };
  }

  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { state = seed(); }
  if (!state || !Array.isArray(state.profiles)) state = seed();
  if (!state.feeding) state.feeding = { level: 64, nextFeedAt: 0, updatedAt: Date.now() };
  if (!state.views) state.views = {};
  if (!Array.isArray(state.logs)) state.logs = [];

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function level() {
    return Math.max(0, Math.round(state.feeding.level - (Date.now() - state.feeding.updatedAt) / 360000));
  }

  function snapshot() {
    return {
      profiles: state.profiles,
      feeding: { level: level(), nextFeedAt: state.feeding.nextFeedAt },
      online: 1
    };
  }

  function analytics() {
    return state.profiles.map(function (profile) {
      return {
        id: profile.id,
        name: profile.name,
        posts: profile.posts.length,
        likes: profile.posts.reduce(function (n, item) { return n + item.likes; }, 0),
        comments: profile.posts.reduce(function (n, item) { return n + item.comments.length; }, 0),
        views: state.views[profile.id] || 0
      };
    });
  }

  const sockets = new Set();

  function broadcast(type, data, adminsOnly) {
    sockets.forEach(function (socket) {
      if (adminsOnly && !socket.admin) return;
      socket._emit(type, data);
    });
  }

  function addLog(action, client) {
    const item = {
      id: uid(), time: Date.now(), action: String(action).slice(0, 180),
      client: String(client || 'offline').slice(0, 8)
    };
    state.logs.push(item);
    if (state.logs.length > 300) state.logs.shift();
    broadcast('log', item, true);
    save();
  }

  function findPost(m) {
    const profile = state.profiles.find(function (x) { return x.id === m.profileId; });
    if (!profile) return null;
    return profile.posts.find(function (x) { return x.id === m.postId; }) || null;
  }

  function compact(dataUrl) {
    return new Promise(function (resolve) {
      if (!dataUrl || typeof dataUrl !== 'string') return resolve('');
      if (dataUrl.length < 1200000) return resolve(dataUrl);
      const image = new Image();
      image.onload = function () {
        const scale = Math.min(1, 720 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.onerror = function () { resolve(''); };
      image.src = dataUrl;
    });
  }

  async function handle(m, socket) {
    if (m.type === 'track') {
      const action = String(m.action || '').slice(0, 180);
      if (action) {
        addLog(action, 'offline');
        if (action.indexOf('профиль') !== -1 && m.profileId) {
          state.views[m.profileId] = (state.views[m.profileId] || 0) + 1;
          broadcast('analytics', analytics(), true);
          save();
        }
      }
      return;
    }

    if (m.type === 'feed') {
      state.feeding = {
        level: Math.min(100, level() + 25),
        nextFeedAt: Date.now() + 1800000,
        updatedAt: Date.now()
      };
      save();
      broadcast('state', snapshot());
      socket._emit('fed', { message: 'Мур-р-р! Маня передаёт спасибо 🐾' });
      addLog('Покормил Маню вкусняшкой', 'offline');
      return;
    }

    if (m.type === 'like') {
      const item = findPost(m);
      if (item) {
        item.likes += m.liked ? 1 : -1;
        save();
        broadcast('state', snapshot());
        addLog((m.liked ? 'Кликнул на лайк: ' : 'Убрал лайк: ') + item.title, 'offline');
      }
      return;
    }

    if (m.type === 'comment') {
      const item = findPost(m);
      const text = String(m.text || '').trim().slice(0, 500);
      if (item && text) {
        item.comments.push({ id: uid(), author: 'Денис', text: text, time: Date.now() });
        save();
        broadcast('state', snapshot());
        addLog('Оставил комментарий: ' + item.title, 'offline');
      }
      return;
    }

    if (!socket.admin) {
      socket._emit('notice', { message: 'Действие недоступно. Требуется вход в панель.' });
      return;
    }

    if (m.type === 'boost') {
      const item = findPost(m);
      if (item) {
        item.likes += 5000;
        save();
        broadcast('state', snapshot());
        socket._emit('notice', { message: 'Добавлено 5 000 лайков' });
        addLog('Администратор добавил 5 000 лайков: ' + item.title, 'admin');
      }
      return;
    }

    if (m.type === 'addComment') {
      const item = findPost(m);
      const author = String(m.author || '').trim().slice(0, 50);
      const text = String(m.text || '').trim().slice(0, 500);
      if (item && author && text) {
        item.comments.push({ id: uid(), author: author, text: text, time: Date.now() });
        save();
        broadcast('state', snapshot());
        socket._emit('notice', { message: 'Комментарий опубликован' });
      }
      return;
    }

    if (m.type === 'addPost' || m.type === 'addPoem') {
      const profile = state.profiles.find(function (x) { return x.id === m.profileId; });
      const title = String(m.title || '').trim().slice(0, 160);
      const body = String(m.text || '').trim().slice(0, 2000);
      if (!profile || !title || !body) return;
      if (m.type === 'addPost') {
        if (profile.posts.length >= 100) return;
        const image = await compact(m.image);
        profile.posts.unshift(p(title, body, 0, image));
        socket._emit('notice', { message: 'Новый пост уже в ленте' });
      } else {
        if (profile.poems.length >= 100) return;
        profile.poems.unshift(poem(title, body));
        socket._emit('notice', { message: 'Стихотворение опубликовано' });
      }
      save();
      broadcast('state', snapshot());
      addLog('Опубликовано: ' + title, 'admin');
      return;
    }

    if (m.type === 'UPDATE_AVATAR') {
      const profile = state.profiles.find(function (x) { return x.id === m.profileId; });
      const avatar = await compact(m.avatar);
      if (!profile || !avatar) {
        socket._emit('notice', { message: 'Не удалось обновить аватарку' });
        return;
      }
      profile.avatar = avatar;
      save();
      broadcast('state', snapshot());
      socket._emit('notice', { message: 'Аватарка обновлена' });
    }
  }

  class OfflineSocket {
    constructor(url) {
      this.url = String(url);
      this.admin = this.url.indexOf('token=') !== -1;
      this.readyState = 0;
      this.onopen = null;
      this.onmessage = null;
      this.onclose = null;
      this.onerror = null;
      sockets.add(this);
      const socket = this;
      setTimeout(function () {
        if (socket.readyState !== 0) return;
        socket.readyState = 1;
        if (socket.onopen) socket.onopen({});
        socket._emit('state', snapshot());
        if (socket.admin) socket._emit('adminState', { logs: state.logs, analytics: analytics() });
      }, 30);
    }

    _emit(type, data) {
      if (this.readyState !== 1 || typeof this.onmessage !== 'function') return;
      this.onmessage({ data: JSON.stringify({ type: type, data: data }) });
    }

    send(raw) {
      let m;
      try { m = JSON.parse(raw); } catch (e) { return; }
      handle(m, this);
    }

    close() {
      if (this.readyState === 3) return;
      this.readyState = 3;
      sockets.delete(this);
      if (this.onclose) this.onclose({});
    }
  }

  OfflineSocket.CONNECTING = 0;
  OfflineSocket.OPEN = 1;
  OfflineSocket.CLOSING = 2;
  OfflineSocket.CLOSED = 3;
  window.WebSocket = OfflineSocket;

  function json(data, status) {
    return new Response(JSON.stringify(data), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, options) {
    const address = String(url);
    if (address.indexOf('/api/login') !== -1) {
      let body = {};
      try { body = JSON.parse((options && options.body) || '{}'); } catch (e) {}
      if (body.username === 'Manya' && body.password === 'Manya123') {
        return Promise.resolve(json({ token: 'offline-token' }));
      }
      return Promise.resolve(json({ error: 'Неверный логин или пароль' }, 401));
    }
    if (address.indexOf('/api/admin/state') !== -1) {
      const headers = (options && options.headers) || {};
      const auth = String(headers.Authorization || headers.authorization || '');
      if (auth.indexOf('offline-token') === -1) {
        return Promise.resolve(new Response('', { status: 401 }));
      }
      return Promise.resolve(json({ logs: state.logs, analytics: analytics() }));
    }
    if (address.indexOf('/api/state') !== -1) {
      return Promise.resolve(json(snapshot()));
    }
    if (nativeFetch) return nativeFetch(url, options);
    return Promise.reject(new Error('Network unavailable'));
  };
})();
