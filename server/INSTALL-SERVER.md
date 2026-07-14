# Инструкция для Claude Code: установка Агента на VPS

> Этот файл читает Claude Code. Если ты Claude — выполняй всё по шагам. Если у тебя ещё нет IP-адреса сервера и пароля root — спроси у пользователя одним сообщением: 1) IP-адрес сервера, 2) пароль root, 3) опционально: токен Telegram-бота от @BotFather. Дождись ответа, потом продолжай.

## Как общаться с пользователем

**КРИТИЧНО:** пользователь — новичок, который впервые работает с сервером. Он не знает что такое SSH, systemd, npm. Общайся с ним так:

1. **Перед каждым шагом** — объясни ОДНИМ предложением что сейчас будешь делать. Пример: «Сейчас подключаюсь к вашему серверу и проверяю связь...»
2. **После каждого шага** — коротко скажи что получилось. Пример: «Связь с сервером есть, всё ок. Перехожу к установке программ.»
3. **Если ошибка** — объясни простым языком что пошло не так и что делать. Не кидай сырой лог без объяснения.
4. **Не пугай техническими деталями.** Пользователю не нужно знать что такое sysctl или chmod. Просто делай и говори результат.
5. **Показывай прогресс.** После каждого крупного шага пиши что-то вроде: «Шаг 3 из 15 готов. Устанавливаю программы на сервер...»
6. **В конце** — дай короткий итог что установлено и как писать боту. Каждый пункт = одно конкретное действие.
7. **Если нужно действие от пользователя** (например, открыть консоль Beget) — объясни ГДЕ это, КАК найти, ЧТО нажать. Не пиши «зайдите в VNC-консоль» — пиши «откройте сайт beget.com → войдите в личный кабинет → найдите раздел VPS → нажмите на свой сервер → нажмите кнопку Консоль».

Стиль: дружелюбный, спокойный, как будто помогаешь другу настроить компьютер. Без воды, но с заботой.

## Контекст

Пользователь — ученик курса «Архитектор нейросотрудников». У него:
- Локально на компьютере: папка с файлами Агента (CLAUDE.md, SOUL.md, MEMORY.md, GOALS.md, memory/, knowledge/)
- Новый VPS (обычно Beget, Ubuntu 22 или 24), на который нужно всё перенести
- Опционально: токен Telegram-бота для установки Telegram-бота (работает через подписку Claude, API-ключ не нужен)

Твоя задача — подключиться к серверу, установить окружение, скопировать шаблоны файлов, провести интервью из 10 вопросов (заполнить плейсхолдеры), скопировать заполненные файлы обратно на сервер и (если дан токен) запустить Telegram-бота. Интервью проводится в самом конце, когда сервер полностью настроен.

## Шаг 1. Найди локальные файлы

Проверь текущую папку — есть ли там DNA-файлы Агента:

```bash
ls CLAUDE.md SOUL.md MEMORY.md GOALS.md 2>/dev/null
```

Если файлы есть — запомни путь, ты скопируешь их на сервер в шаге 5.
Если файлов нет — проверь домашнюю папку и ~/jarvis/:
```bash
ls ~/jarvis/CLAUDE.md ~/jarvis/SOUL.md 2>/dev/null
ls ~/workspace/CLAUDE.md ~/workspace/SOUL.md 2>/dev/null
```
Если нигде нет — скажи пользователю: «Не нашёл файлы Агента. Откройте Claude Code в папке где лежат SOUL.md, MEMORY.md и другие файлы, и повторите команду.»

## Шаг 2. Подключись к серверу

IP и пароль пользователь указал ранее (или ты уже спросил на входе). Используй `expect` для автоматического ввода пароля.

Сначала проверь соединение:
```bash
expect -c '
  set timeout 15
  spawn ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@IP_СЕРВЕРА "echo CONNECTION_OK"
  expect {
    "password:" { send "ПАРОЛЬ\r"; exp_continue }
    "CONNECTION_OK" { exit 0 }
    timeout { exit 1 }
    eof { exit 1 }
  }
'
```

Замени `IP_СЕРВЕРА` и `ПАРОЛЬ` на данные из сообщения пользователя.

**Если не подключается** (таймаут, ошибка) — скажи пользователю:

> Прямое подключение не прошло. Скорее всего VPN блокирует соединение. Есть простой запасной путь:
>
> 1. Зайдите в панель управления Beget → ваш VPS → кнопка «Консоль»
> 2. Войдите как root с вашим паролем
> 3. Введите: `wget https://raw.githubusercontent.com/godm6512-alt/gorelkin-agent/main/setup-server.sh -O s`
> 4. Введите: `bash s`
> 5. Скрипт всё установит. После этого напишите мне «готово» — я скопирую ваши файлы.

И жди ответа. Когда пользователь скажет «готово» — перейди к шагу 4 (копирование файлов).

## Шаг 3. Установи систему

Выполняй каждую команду через SSH. Вспомогательная функция:

```bash
# Для каждой команды используй этот шаблон:
expect -c '
  set timeout 120
  spawn ssh -o StrictHostKeyChecking=no root@IP_СЕРВЕРА "КОМАНДА"
  expect "password:" { send "ПАРОЛЬ\r" }
  expect eof
'
```

Последовательность:

**3.1. Базовые пакеты:**
```
apt-get update -qq 2>&1 | tail -3 && apt-get install -y -qq curl git jq unzip 2>&1 | tail -3
```

**3.2. Node.js 20:**
```
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -5 && apt-get install -y -qq nodejs 2>&1 | tail -3 && node -v
```

**3.3. Claude Code CLI:**
```
npm install -g @anthropic-ai/claude-code 2>&1 | tail -5 && which claude
```

**3.4. Пользователь agent и папки:**
```
id agent 2>/dev/null || useradd -m -s /bin/bash agent && mkdir -p /home/agent/workspace/memory /home/agent/workspace/knowledge /home/agent/projects /home/agent/.agent/bot /home/agent/.claude/skills && chown -R agent:agent /home/agent && echo OK
```

**3.5. Права на Claude Code для пользователя agent:**
```
CLAUDE_REAL=$(readlink -f $(which claude 2>/dev/null) 2>/dev/null) && if [ -n "$CLAUDE_REAL" ]; then chmod -R a+rX $(dirname "$CLAUDE_REAL") 2>/dev/null; chmod -R a+rX $(dirname $(dirname "$CLAUDE_REAL")) 2>/dev/null; chmod -R a+rX $(dirname $(dirname $(dirname "$CLAUDE_REAL"))) 2>/dev/null; fi && echo OK
```

**3.6. Отключение IPv6 (фикс зависаний Node.js):**
```
sysctl -w net.ipv6.conf.all.disable_ipv6=1 2>/dev/null; sysctl -w net.ipv6.conf.default.disable_ipv6=1 2>/dev/null; echo OK
```

После каждого шага проверяй вывод. Если ошибка — покажи пользователю и предложи решение. Не останавливайся без причины.

## Шаг 4. Скопируй файлы Агента на сервер

> **Примечание:** на этом этапе файлы могут содержать `{{плейсхолдеры}}` — это нормально. Плейсхолдеры будут заполнены позже (Шаг 8 — интервью), после чего заполненные файлы будут скопированы повторно (Шаг 9).

Скопируй все DNA-файлы из локальной папки на сервер. Используй scp с expect:

```bash
# Шаблон для копирования одного файла:
expect -c '
  set timeout 30
  spawn scp -o StrictHostKeyChecking=no ./ФАЙЛ root@IP_СЕРВЕРА:/home/agent/workspace/
  expect "password:" { send "ПАРОЛЬ\r" }
  expect eof
'
```

Скопируй по очереди все DNA-файлы (каждый — если существует локально):
1. `CLAUDE.md`
2. `SOUL.md`
3. `MEMORY.md`
4. `GOALS.md`
5. `USER.md`
6. `MISSION.md`
7. `PROJECTS.md`
8. `PREFERENCES.md`
9. `LEARNED.md`

Потом скопируй папки (рекурсивно, флаг -r):
10. `memory/` → `/home/agent/workspace/memory/`
11. `knowledge/` → `/home/agent/workspace/knowledge/`

**Настройки Claude Code (.claude/):**
7. Если у пользователя есть локальная папка `.claude/` — скопируй её в `/home/agent/.claude/` (НЕ в workspace!). Это настройки Claude Code: settings.json (правила светофора) и skills/ (навыки).

Если `.claude/` нет локально — скачай дефолтные настройки и скиллы из репозитория:
```
curl -fsSL https://raw.githubusercontent.com/godm6512-alt/gorelkin-agent/main/.claude/settings.json -o /home/agent/.claude/settings.json
```

**Скачай дополнительные шаблоны (SOUL-режимы, SERVICES.md):**
```
REPO="https://raw.githubusercontent.com/godm6512-alt/gorelkin-agent/main"
for F in SERVICES.md SOUL-coder.md SOUL-researcher.md SOUL-strategist.md; do
  curl -fsSL "$REPO/$F" -o "/home/agent/workspace/$F" 2>/dev/null
done && echo OK
```

**Установи скиллы (навыки агента):**
Скиллы — это готовые инструкции, которые усиливают агента. Скачай базовые скиллы:
```
REPO="https://raw.githubusercontent.com/godm6512-alt/gorelkin-agent/main"
for SKILL in discovery-interview content-creator fullstack-developer frontend-design reminder; do mkdir -p /home/agent/.claude/skills/$SKILL && curl -fsSL "$REPO/.claude/skills/$SKILL/SKILL.md" -o /home/agent/.claude/skills/$SKILL/SKILL.md; done && echo OK
```

После копирования — поправь владельца и создай симлинк для единой памяти:
```
chown -R agent:agent /home/agent/workspace /home/agent/.claude && ln -sf /home/agent/workspace/CLAUDE.md /home/agent/CLAUDE.md && chown -h agent:agent /home/agent/CLAUDE.md && echo OK
```

> **Зачем симлинк:** Claude Code (и бот, и любая сессия, открытая в `/home/agent/`) ищет `CLAUDE.md` в текущей папке. Симлинк делает так, что все точки входа читают один и тот же файл с правилами — единый мозг агента.

## Шаг 5. Проверь результат

Выполни на сервере:
```
echo '=== Node.js ===' && node -v && echo '=== Claude Code ===' && which claude && echo '=== Файлы Агента ===' && ls -la /home/agent/workspace/ && echo '=== Папки ===' && ls -d /home/agent/workspace/memory /home/agent/workspace/knowledge 2>/dev/null
```

Покажи пользователю результат. Скажи:

> Сервер готов. Установлено:
> - Node.js (версия)
> - Claude Code CLI
> - Ваши файлы Агента скопированы в /home/agent/workspace/
> - Рабочая папка для проектов: /home/agent/projects/

## Шаг 6. Установи Telegram-бота (если указан токен бота)

**Если пользователь указал Telegram-бот токен** — установи бота. Если токен не указан — пропусти этот шаг и перейди к шагу 7.

**6.1. Скачай файлы бота из репозитория:**
```
REPO="https://raw.githubusercontent.com/godm6512-alt/gorelkin-agent/main"
BOT="/home/agent/.agent/bot"
mkdir -p $BOT/lib $BOT/scripts $BOT/migrations

# Core bot files
for F in index.js secrets-menu.js voice-helper.js package.json VERSION; do
  curl -fsSL "$REPO/bot/$F" -o "$BOT/$F"
done

# Lib (semantic memory — optional, works without sql.js)
for F in db.js embeddings.js memory-indexer.js memory-search.js; do
  curl -fsSL "$REPO/bot/lib/$F" -o "$BOT/lib/$F"
done

# Scripts
for F in manage-schedule.js memory-search.js reindex.js; do
  curl -fsSL "$REPO/bot/scripts/$F" -o "$BOT/scripts/$F"
done

# Migrations
curl -fsSL "$REPO/bot/migrations/001_memory_index.sql" -o "$BOT/migrations/001_memory_index.sql"

echo OK
```

**6.2. Установи зависимости:**
```
cd /home/agent/.agent/bot && npm install --production 2>&1 | tail -5 && echo OK
```

**6.3. Создай файл окружения:**
```
cat > /home/agent/.agent/.env << 'ENVEOF'
BOT_TOKEN=ТОКЕН_БОТА
AGENT_HOME=/home/agent
ENVEOF
```
Замени `ТОКЕН_БОТА` на значение из сообщения пользователя.

**Безопасность (auto-lock):** Бот автоматически привязывается к первому пользователю, который напишет ему `/start`. После этого бот отвечает ТОЛЬКО ему — все остальные игнорируются. Данные владельца сохраняются в `/home/agent/.agent/owner.json`. Ничего дополнительно настраивать не нужно.

**6.4. Поправь владельца файлов:**
```
chown -R agent:agent /home/agent/.agent
```

**6.5. Зарегистрируй systemd-сервис (БЕЗ запуска):**
```
curl -fsSL https://raw.githubusercontent.com/godm6512-alt/gorelkin-agent/main/bot/agent-bot.service -o /etc/systemd/system/agent-bot.service && systemctl daemon-reload && systemctl enable agent-bot && echo OK
```

> **Важно:** бот НЕ запускается сейчас. Он будет запущен в Шаге 10, после того как файлы Агента будут заполнены данными пользователя. Это нужно чтобы бот сразу заработал с правильными данными.

Скажи пользователю: «Telegram-бот подготовлен. Запустим его чуть позже, когда настроим Вашего Агента.»

## Шаг 7. Авторизуй Claude Code

Авторизация делается прямо через твоё SSH-подключение к серверу — отдельная программа на компьютере пользователя для этого не нужна.

Запусти на сервере (через `run_remote`/expect, как в предыдущих шагах):
```
sudo -u agent claude auth login
```

Команда выведет ссылку вида `https://claude.ai/...` и код. Покажи их пользователю прямо в чате:

> Нужно авторизовать Claude на сервере, чтобы бот работал через Вашу подписку. Это разово.
>
> **Шаг 1.** Откройте ссылку: `<ССЫЛКА ИЗ ВЫВОДА>`
> **Шаг 2.** Нажмите Authorize
> **Шаг 3.** Если появится код для подтверждения — пришлите мне его, я введу
>
> Когда авторизуетесь — напишите «готово».

Жди ответа. Когда пользователь пришлёт код (если он требовался) — введи его в ту же SSH-сессию. Если строка вывода показала «Logged in as ...» без доп. кода — авторизация уже завершена, продолжай.

## Шаг 8. Интервью — настройка Агента под пользователя

Скажи пользователю:

> Сервер полностью настроен. Теперь самое интересное — настроим Агента под Вас. Задам 10 коротких вопросов (5-7 минут).

**Прочитай файл `INSTALL.md`** из локальной папки (где лежат скачанные файлы) и **выполни Шаги 1-6** (приветствие, чтение файлов, интервью из 10 вопросов, замена плейсхолдеров, удаление WIZARD-комментариев, превью пользователю).

**НЕ выполняй Шаги 7-9 из INSTALL.md** (удаление файлов и коммит) — это сделаем здесь, в Шаге 11.

После того как пользователь подтвердил превью — возвращайся сюда и продолжай с Шага 9.

## Шаг 9. Скопируй заполненные файлы на сервер

Теперь DNA-файлы заполнены реальными данными пользователя. Скопируй их на сервер повторно — они заменят шаблоны с {{плейсхолдерами}}.

Используй тот же шаблон scp с expect из Шага 4. Скопируй все 9 DNA-файлов (каждый — если существует):
1. `CLAUDE.md`
2. `SOUL.md`
3. `MEMORY.md`
4. `GOALS.md`
5. `USER.md`
6. `MISSION.md`
7. `PROJECTS.md`
8. `PREFERENCES.md`
9. `LEARNED.md`

После копирования — поправь владельца:
```
chown -R agent:agent /home/agent/workspace && echo OK
```

Скажи пользователю: «Ваши данные скопированы на сервер. Агент теперь знает кто Вы.»

## Шаг 10. Запусти Telegram-бота

**Если пользователь указал токен бота** — теперь запускаем:
```
systemctl start agent-bot && sleep 3 && systemctl status agent-bot --no-pager -l 2>&1 | head -15
```

Если бот запустился — скажи пользователю:

> Telegram-бот запущен! Напишите своему боту в Telegram `/start` — он уже знает Вас и готов к работе.
> Бот работает 24/7 на сервере. Он использует вашу подписку Claude — никаких API-ключей и доплат не нужно.

Если ошибка — покажи лог (`journalctl -u agent-bot -n 20 --no-pager`) и предложи решение.

**Если токен бота не указан** — пропусти этот шаг.

## Шаг 11. Локальная очистка

Удали служебные файлы из локальной папки и сделай первый коммит:

```bash
git rm -r INSTALL.md README.md examples/ 2>/dev/null || true
git add -A
git commit -m "Архитектура Агента собрана"
```

Если у пользователя настроен git remote — сделай `git push`. Если нет — спроси и помоги настроить.

## Шаг 12. Финальная шпаргалка

Выведи пользователю итог:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Установка Агента на сервер завершена
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Что готово
  — Сервер настроен (Node.js, Claude Code CLI)
  — Claude авторизован через Вашу подписку
  — 8 DNA-файлов заполнены Вашими данными
  — Файлы Агента на сервере: /home/agent/workspace/
  — Telegram-бот запущен (если давали токен)

Как работать с Агентом
  — Telegram-бот: напишите боту — он уже знает Вас
  — Дальше правки на сервере — через меня (Claude Code) по SSH
  — Файл SOUL.md — «паспорт» Вашего Агента

Полезные команды бота
  /model   — переключить модель (Sonnet/Opus/Haiku)
  /status  — проверить состояние
  /settings — подключить API-ключи (Deepgram, GitHub, и др.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

После вывода шпаргалки — коротко поздравь пользователя с установкой и попрощайся. Не нужно повторять то, что уже на экране.

## Важно

- НЕ показывай пароль пользователя в выводе после его ввода
- НЕ показывай токены и API-ключи в выводе
- НЕ сохраняй пароль в файлы (кроме .env для бота)
- НЕ задавай уточняющих вопросов — действуй по шагам
- Если что-то падает — покажи ошибку и предложи решение, не останавливайся молча
- Если expect не найден (Linux без expect) — предложи установить: `apt-get install -y expect` или предложи VNC-путь
