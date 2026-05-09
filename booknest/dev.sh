#!/usr/bin/env bash
set -euo pipefail

# ─── 配置 ─────────────────────────────────────────────
PG_CONTAINER="booknest-pg"
PG_IMAGE="postgres:16-alpine"
PG_PORT=5433
PG_USER="booknest"
PG_PASS="booknest123"
PG_DB="booknest"

REDIS_CONTAINER="booknest-redis"
REDIS_IMAGE="redis:7-alpine"
REDIS_PORT=6379

BACKEND_PORT=4000
FRONTEND_PORT=4001

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$SCRIPT_DIR/.dev-pids"

# ─── 颜色 ─────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# ─── 前置检查 ──────────────────────────────────────────
check_docker() {
  if ! command -v docker &>/dev/null; then
    fail "Docker 未安装或不在 PATH 中"
  fi
  if ! docker info &>/dev/null; then
    fail "Docker 未启动，请先运行 Docker"
  fi
}

# ─── 容器管理 ──────────────────────────────────────────
ensure_container() {
  local name=$1 image=$2 port=$3 env_args="${4:-}"

  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    log "$name 已在运行"
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    info "启动已有容器 $name..."
    docker start "$name" >/dev/null
  else
    info "创建并启动容器 $name..."
    docker run -d --name "$name" \
      ${env_args} \
      -p "${port}" \
      "$image" >/dev/null
  fi
}

wait_for_pg() {
  info "等待 PostgreSQL 就绪..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" &>/dev/null; then
      log "PostgreSQL 已就绪"
      return
    fi
    retries=$((retries - 1))
    sleep 1
  done
  fail "PostgreSQL 启动超时"
}

wait_for_redis() {
  info "等待 Redis 就绪..."
  local retries=15
  while [ $retries -gt 0 ]; do
    if docker exec "$REDIS_CONTAINER" redis-cli ping &>/dev/null; then
      log "Redis 已就绪"
      return
    fi
    retries=$((retries - 1))
    sleep 1
  done
  fail "Redis 启动超时"
}

wait_for_http() {
  local port=$1 name=$2
  info "等待 $name 就绪 (port $port)..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if curl -sf "http://localhost:${port}/" >/dev/null 2>&1 || \
       curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
      log "$name 已就绪"
      return
    fi
    retries=$((retries - 1))
    sleep 2
  done
  warn "$name 未在预期时间内响应（可能仍在启动中）"
}

# ─── PID 管理 ──────────────────────────────────────────
save_pid() {
  mkdir -p "$PID_DIR"
  echo "$2" > "$PID_DIR/$1.pid"
}

read_pid() {
  local pidfile="$PID_DIR/$1.pid"
  if [ -f "$pidfile" ]; then
    cat "$pidfile"
  fi
}

kill_by_pid() {
  local name=$1
  local pid
  pid=$(read_pid "$name")
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    info "停止 $name (PID $pid)..."
    kill "$pid" 2>/dev/null || true
    # 同时杀掉整个进程组（npm run dev 会产生子进程）
    kill -- -"$pid" 2>/dev/null || true
    log "$name 已停止"
  fi
  rm -f "$PID_DIR/$name.pid"
}

# ─── 命令 ──────────────────────────────────────────────
cmd_start() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════${NC}"
  echo -e "${CYAN}  BookNest Dev Server Starter${NC}"
  echo -e "${CYAN}═══════════════════════════════════════${NC}"
  echo ""

  check_docker

  # 1. PostgreSQL
  ensure_container "$PG_CONTAINER" "$PG_IMAGE" "$PG_PORT:$PG_PORT->5432/tcp" \
    "-e POSTGRES_USER=$PG_USER -e POSTGRES_PASSWORD=$PG_PASS -e POSTGRES_DB=$PG_DB"
  wait_for_pg

  # 2. Redis
  ensure_container "$REDIS_CONTAINER" "$REDIS_IMAGE" "$REDIS_PORT:$REDIS_PORT->6379/tcp"
  wait_for_redis

  # 3. Backend
  if pid=$(read_pid "backend") && kill -0 "$pid" 2>/dev/null; then
    log "后端已在运行 (PID $pid)"
  else
    info "启动后端..."
    cd "$SCRIPT_DIR/backend"
    nohup npm run dev > /tmp/booknest-backend.log 2>&1 &
    save_pid "backend" "$!"
    log "后端启动中 (PID $!)"
  fi
  wait_for_http "$BACKEND_PORT" "后端"

  # 4. Frontend
  if pid=$(read_pid "frontend") && kill -0 "$pid" 2>/dev/null; then
    log "前端已在运行 (PID $pid)"
  else
    info "启动前端..."
    cd "$SCRIPT_DIR/frontend"
    nohup npm run dev > /tmp/booknest-frontend.log 2>&1 &
    save_pid "frontend" "$!"
    log "前端启动中 (PID $!)"
  fi
  wait_for_http "$FRONTEND_PORT" "前端"

  echo ""
  echo -e "${GREEN}═══════════════════════════════════════${NC}"
  echo -e "${GREEN}  所有服务已启动！${NC}"
  echo -e "${GREEN}═══════════════════════════════════════${NC}"
  echo ""
  echo -e "  前端:  ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
  echo -e "  后端:  ${CYAN}http://localhost:${BACKEND_PORT}${NC}"
  echo -e "  数据库: ${CYAN}localhost:${PG_PORT}${NC}"
  echo -e "  Redis:  ${CYAN}localhost:${REDIS_PORT}${NC}"
  echo ""
  echo -e "  日志: ${CYAN}tail -f /tmp/booknest-backend.log${NC}"
  echo -e "        ${CYAN}tail -f /tmp/booknest-frontend.log${NC}"
  echo ""
  echo -e "  停止: ${YELLOW}bash dev.sh stop${NC}"
  echo ""
}

cmd_stop() {
  echo ""
  info "停止 BookNest 开发服务..."

  kill_by_pid "frontend"
  kill_by_pid "backend"

  if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    info "停止 PostgreSQL..."
    docker stop "$PG_CONTAINER" >/dev/null
    log "PostgreSQL 已停止"
  fi

  if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
    info "停止 Redis..."
    docker stop "$REDIS_CONTAINER" >/dev/null
    log "Redis 已停止"
  fi

  rm -rf "$PID_DIR"
  log "所有服务已停止"
  echo ""
}

cmd_status() {
  echo ""
  echo -e "${CYAN}  BookNest 服务状态${NC}"
  echo -e "${CYAN}─────────────────────${NC}"

  check_service() {
    local name=$1 port=$2
    if curl -sf "http://localhost:${port}/" >/dev/null 2>&1 || \
       curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
      echo -e "  $name: ${GREEN}运行中${NC} (port $port)"
    else
      echo -e "  $name: ${RED}未运行${NC}"
    fi
  }

  check_container() {
    local name=$1 port=$2
    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
      echo -e "  $name: ${GREEN}运行中${NC} (port $port)"
    else
      echo -e "  $name: ${RED}未运行${NC}"
    fi
  }

  check_container "$PG_CONTAINER" "$PG_PORT"
  check_container "$REDIS_CONTAINER" "$REDIS_PORT"
  check_service "后端" "$BACKEND_PORT"
  check_service "前端" "$FRONTEND_PORT"
  echo ""
}

# ─── 入口 ──────────────────────────────────────────────
case "${1:-}" in
  start)  cmd_start  ;;
  stop)   cmd_stop   ;;
  status) cmd_status ;;
  *)
    echo "用法: bash dev.sh {start|stop|status}"
    echo ""
    echo "  start  — 启动所有服务 (PostgreSQL + Redis + 后端 + 前端)"
    echo "  stop   — 停止所有服务"
    echo "  status — 查看服务运行状态"
    exit 1
    ;;
esac
