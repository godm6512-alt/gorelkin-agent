# Установка Агента на VPS

## Когда использовать

Пользователь просит установить/перенести своего Агента на удалённый сервер (VPS). Типичные фразы:
- «Установи на сервер»
- «Настрой мой VPS»
- «Перенеси агента на сервер»
- «Подключись к моему серверу и поставь всё»
- «У меня есть сервер, IP такой-то»

## Что нужно от пользователя

Перед началом спроси (если не сказал сам):
1. **IP-адрес сервера** — например 123.45.67.89
2. **Root-пароль** — его дали при регистрации VPS

Больше ничего не спрашивай. Остальное определишь сам.

## Что ты делаешь (полный план)

### Шаг 1. Проверь локальные файлы

Посмотри есть ли в текущей папке заполненные DNA-файлы (CLAUDE.md, SOUL.md, MEMORY.md, GOALS.md). Если в них есть {{плейсхолдеры}} — сначала предложи пройти интервью (INSTALL.md), потом вернуться к установке на сервер.

Если файлы заполнены — запомни их, ты скопируешь их на сервер.

### Шаг 2. Подключись к серверу по SSH

Используй `expect` для автоматического ввода пароля (на macOS expect предустановлен):

```bash
expect -c '
  spawn ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@IP_ADDRESS "echo CONNECTION_OK"
  expect {
    "password:" { send "PASSWORD\r"; expect eof }
    "CONNECTION_OK" { }
    timeout { exit 1 }
  }
'
```

Замени IP_ADDRESS и PASSWORD на данные пользователя.

**Если SSH не работает** (таймаут, connection refused, VPN блокирует):
Скажи пользователю:
> «Прямое подключение не проходит — скорее всего VPN блокирует. Есть простой запасной путь: зайдите в панель управления Beget → VPS → Консоль (VNC). Там введите две команды:
> 1. wget https://raw.githubusercontent.com/godm6512-alt/gorelkin-agent/main/setup-server.sh -O s
> 2. bash s
> Скрипт всё установит. После этого скажите мне — я скопирую ваши файлы.»

### Шаг 3. Установи систему на сервере

Выполни setup-server.sh на сервере. Можно по частям через SSH-команды:

```bash
# Вспомогательная функция для удалённых команд
run_remote() {
  expect -c "
    spawn ssh -o StrictHostKeyChecking=no root@IP_ADDRESS \"$1\"
    expect \"password:\" { send \"PASSWORD\r\" }
    expect eof
  "
}
```

Последовательность установки:

**3.1. Обновление системы и базовые пакеты:**
```bash
run_remote "apt-get update -qq && apt-get install -y -qq curl git jq unzip"
```

**3.2. Node.js 20:**
```bash
run_remote "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y -qq nodejs"
```

**3.3. Claude Code CLI:**
```bash
run_remote "npm install -g @anthropic-ai/claude-code"
```

**3.4. Пользователь agent + папки:**
```bash
run_remote "id agent 2>/dev/null || useradd -m -s /bin/bash agent && mkdir -p /home/agent/workspace /home/agent/projects && chown -R agent:agent /home/agent"
```

**3.5. Права на Claude Code для пользователя agent:**
```bash
run_remote "CLAUDE_REAL=\$(readlink -f \$(which claude)) && chmod -R a+rX \$(dirname \$CLAUDE_REAL) 2>/dev/null; chmod -R a+rX \$(dirname \$(dirname \$CLAUDE_REAL)) 2>/dev/null; chmod -R a+rX \$(dirname \$(dirname \$(dirname \$CLAUDE_REAL))) 2>/dev/null || true"
```

**3.6. Отключение IPv6 (fix для Node.js зависаний):**
```bash
run_remote "sysctl -w net.ipv6.conf.all.disable_ipv6=1 2>/dev/null; sysctl -w net.ipv6.conf.default.disable_ipv6=1 2>/dev/null || true"
```

После каждого шага проверяй результат. Если что-то упало — покажи ошибку пользователю и предложи решение.

### Шаг 4. Скопируй DNA-файлы на сервер

Используй `scp` с expect для копирования заполненных файлов:

```bash
# Копирование одного файла
expect -c '
  spawn scp -o StrictHostKeyChecking=no ./CLAUDE.md root@IP_ADDRESS:/home/agent/workspace/
  expect "password:" { send "PASSWORD\r" }
  expect eof
'
```

Скопируй все DNA-файлы (9 штук):
- CLAUDE.md
- SOUL.md
- USER.md
- MEMORY.md
- MISSION.md
- GOALS.md
- PROJECTS.md
- PREFERENCES.md
- LEARNED.md
- memory/README.md (и содержимое memory/ если есть дневники)
- knowledge/README.md (и содержимое knowledge/ если есть файлы)
- .claude/ (папка со скиллами, если есть)

Потом поправь владельца:
```bash
run_remote "chown -R agent:agent /home/agent/workspace"
```

### Шаг 5. Покажи результат

Подключись к серверу и проверь что всё на месте:
```bash
run_remote "echo '=== Node ===' && node -v && echo '=== Claude ===' && which claude && echo '=== Файлы ===' && ls -la /home/agent/workspace/ && echo '=== Папки ===' && ls -la /home/agent/"
```

Покажи пользователю:
> «Готово! На вашем сервере установлено:
> - Node.js [версия]
> - Claude Code CLI
> - Ваши файлы Агента в /home/agent/workspace/
> - Папка для проектов /home/agent/projects/
>
> Дальше я буду подключаться к серверу сам, когда понадобится что-то поправить — отдельно ничего настраивать не нужно.»

## Безопасность

- НЕ показывай пароль сервера в чате после того как пользователь его ввёл
- НЕ сохраняй пароль в файлы
- После успешной установки предложи сменить пароль или настроить вход по ключу

## Если что-то пошло не так

- **SSH не подключается** → VPN блокирует. Предложи VNC (2 команды)
- **Node.js не ставится** → попробуй другую версию: setup_22.x
- **Claude Code не ставится** → проверь npm: `run_remote "npm -v"`, если нет — переставь Node.js
- **expect не найден** → на Linux: `apt-get install -y expect`, на macOS — предустановлен

## Результат

После выполнения всех шагов:
- Сервер готов к работе
- DNA-файлы на месте
