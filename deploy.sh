#!/bin/bash
# =====================================================
#  一键部署脚本（跑在服务器上）
#  用法: bash deploy.sh
# =====================================================
set -euo pipefail

PROJECT_DIR="/www/wwwroot/byang"
COMPOSE_FILE="docker-compose.production.yml"

cd "$PROJECT_DIR"

echo "📥 1. git pull"
git pull

echo ""
echo "🔨 2. 重建镜像"
docker compose -f "$COMPOSE_FILE" build

echo ""
echo "🚀 3. 重启容器（无停机：up -d 会先起新容器再停旧的）"
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "🗑️  4. 清理旧镜像（可选，释放磁盘）"
docker image prune -f

echo ""
echo "✅ 部署完成。检查状态："
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo "   访问: http://www.byang.top/barcode/"
