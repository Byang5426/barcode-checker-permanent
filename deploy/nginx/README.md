# Nginx 配置

服务器上的 nginx 主配置路径：
```
/www/server/panel/vhost/nginx/39.97.234.165.conf
```

⚠️ **BT-Panel 会自动重生成这个文件**，所以不要在 BT-Panel 面板里点"添加反代/SSL"等。

## 当前结构

3 个 server block：

1. **HTTP (port 80)** — 只保留 `/.well-known/acme-challenge/` 走 HTTP（acme.sh 续期用），其他全部 301 到 HTTPS
2. **HTTPS bare domain** (`byang.top`) — 301 到 `www.byang.top`
3. **HTTPS www** (`www.byang.top`) — 实际服务：landing 页 + `/barcode/` 反代 + `/langchain-projects/` 静态

## 证书位置

```
/etc/nginx/ssl/byang.top/         (fullchain.pem + privkey.pem)
/etc/nginx/ssl/www.byang.top/     (fullchain.pem + privkey.pem)
```

## acme.sh 自动续期

`~/.acme.sh/acme.sh --install-cert` 时已经配了 `--reloadcmd 'nginx -s reload'`，所以 60 天前会自动续期 + reload nginx。

## 如果被 BT-Panel 覆盖了

恢复命令：
```bash
scp deploy/nginx/39.97.234.165.conf aliyun:/tmp/restore-nginx.conf
ssh aliyun "cp /tmp/restore-nginx.conf /www/server/panel/vhost/nginx/39.97.234.165.conf && nginx -t && nginx -s reload"
```

## 历史

- 旧版（HTTP only）被 BT-Panel 自动生成的反代 `c6b...conf` 劫持了所有请求
- 当前是 2026-06-03 手动重写后的版本
