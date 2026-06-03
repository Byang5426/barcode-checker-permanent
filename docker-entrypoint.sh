#!/bin/sh
set -e

echo "⏳ Waiting for MySQL to be ready..."
for i in $(seq 1 30); do
  if node -e "
    const mysql = require('mysql2/promise');
    (async () => {
      try {
        const c = await mysql.createConnection(process.env.DATABASE_URL);
        await c.end();
        process.exit(0);
      } catch(e) { process.exit(1); }
    })();
  " 2>/dev/null; then
    echo "✅ MySQL is ready!"
    break
  fi
  echo "   Retry $i/30..."
  sleep 2
done

echo "📦 Running database migrations..."
npx drizzle-kit migrate || echo "⚠️ Migration warning (may be already applied)"

echo "🚀 Starting server..."
exec node dist/index.js
