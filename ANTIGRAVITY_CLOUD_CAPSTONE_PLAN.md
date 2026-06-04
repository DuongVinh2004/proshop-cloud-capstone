# ANTIGRAVITY_CLOUD_CAPSTONE_PLAN.md

> Mục đích: file này được gắn vào **root project ProShop MERN** để Antigravity/AI Agent thực hiện tuần tự toàn bộ yêu cầu Cloud Capstone.
>
> Agent phải đọc file này trước, sau đó đọc `skills/cloud-capstone-proshop/SKILL.md`.
>
> Quy tắc quan trọng: làm theo từng batch nhỏ, verify xong mới chuyển batch tiếp theo. Không làm kiểu sửa ồ ạt, không bỏ qua lỗi, không public port nội bộ, không hardcode secret.

---

## 0. Phạm vi yêu cầu

Triển khai repo ProShop MERN lên AWS EC2 theo hướng:

```text
Internet
  |
  v
AWS Security Group: chỉ 22 / 80 / 443
  |
  v
Nginx Reverse Proxy container
  |
  +--> Frontend React static container
  |
  +--> Backend Node/Express container
          |
          v
       MongoDB container, internal only

Observability:
Node Exporter -> Prometheus -> Grafana
Docker/Nginx logs -> Promtail -> Loki -> Grafana
Prometheus alerts -> AlertManager -> Telegram
```

Kết quả cuối cùng cần có:

- ProShop chạy được qua domain/IP.
- Frontend, Backend, MongoDB chạy bằng Docker Compose.
- Nginx reverse proxy nhận traffic 80/443.
- MongoDB không expose port `27017`.
- Backend không expose port `5000`.
- Frontend dev port `3000` không expose.
- AWS Security Group chỉ mở `22`, `80`, `443`.
- HTTPS bằng Certbot/Let’s Encrypt.
- Prometheus + Node Exporter có metrics CPU/RAM/Disk.
- Grafana dashboard có dữ liệu thật.
- Loki + Promtail query được log Nginx/Docker.
- AlertManager gửi Telegram khi CPU > 85%.
- Có script test tải/DDoS giả lập.
- Có post-mortem template và evidence checklist.

---

## 1. Quy tắc vận hành bắt buộc cho Agent

### 1.1. Trước khi sửa code

Agent phải chạy/kiểm tra:

```bash
pwd
ls -la
find . -maxdepth 2 -type f | sort | sed 's#^\./##' | head -200
```

Sau đó đọc tối thiểu:

```bash
cat package.json || true
cat backend/package.json || true
cat frontend/package.json || true
sed -n '1,220p' backend/server.js || true
sed -n '1,220p' backend/config/db.js || true
```

### 1.2. Không được làm

- Không public MongoDB ra Internet.
- Không public Backend port `5000` ra Internet.
- Không public Frontend dev port `3000` ra Internet.
- Không commit `.env`, private key, token Telegram, password thật.
- Không mở Security Group `All Traffic`.
- Không sửa business logic ProShop nếu không cần cho deployment.
- Không xóa dữ liệu seed/script gốc nếu chưa hiểu.
- Không dùng `npm start` của React dev server làm production serving.
- Không claim “đã pass” nếu chưa chạy verify tương ứng.

### 1.3. Cách cập nhật file này sau mỗi batch

Sau khi hoàn thành một batch, Agent phải sửa mục **15. Execution Status** ở cuối file:

- Đổi trạng thái batch từ `TODO` sang `DONE`.
- Ghi file đã thay đổi.
- Ghi lệnh verify đã chạy.
- Ghi lỗi còn lại nếu có.
- Nếu batch fail, đổi sang `BLOCKED` và ghi nguyên nhân + hướng xử lý.

Không xóa lịch sử batch đã làm. Chỉ cập nhật trạng thái.

---

## 2. Batch 1 — Repo discovery và health endpoint

### Mục tiêu

Hiểu repo hiện tại và đảm bảo backend có endpoint health để Nginx/monitoring kiểm tra.

### Việc cần làm

1. Xác định cấu trúc repo:
   - Backend ở `backend/`.
   - Frontend ở `frontend/`.
   - MongoDB dùng qua `MONGO_URI`.
2. Kiểm tra backend entrypoint:
   - Thường là `backend/server.js`.
3. Thêm health endpoint nếu chưa có:

```js
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'proshop-backend',
    timestamp: new Date().toISOString(),
  });
});
```

4. Đảm bảo endpoint không phụ thuộc auth/database nếu chỉ dùng để health check cơ bản.

### File có thể sửa

```text
backend/server.js
```

### Verify

```bash
node --check backend/server.js
```

Nếu có thể chạy local:

```bash
npm install
npm run server
curl http://localhost:5000/api/health
```

### Definition of Done

- `backend/server.js` syntax OK.
- Có `/api/health`.
- Không phá route hiện có.

---

## 3. Batch 2 — Docker hóa Backend

### Mục tiêu

Backend build được thành Docker image production.

### File cần tạo

```text
backend/Dockerfile
backend/.dockerignore
```

### Nội dung Dockerfile ưu tiên

Nếu có `package-lock.json`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
```

Nếu không có `package-lock.json`, dùng:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
```

### `.dockerignore`

```text
node_modules
npm-debug.log
.env
.git
coverage
Dockerfile
```

### Điều cần kiểm tra

Trong `backend/package.json` phải có script:

```json
"start": "node server.js"
```

Nếu script khác, dùng đúng script hiện có, không tự ý đổi lớn.

### Verify

```bash
docker build -t proshop-backend:local ./backend
```

Nếu môi trường không có Docker, verify tối thiểu:

```bash
test -f backend/Dockerfile
test -f backend/.dockerignore
cat backend/package.json
```

### Definition of Done

- Backend Dockerfile tồn tại.
- Không copy `.env` vào image.
- Container dùng env runtime từ Compose.
- Image build được nếu có Docker.

---

## 4. Batch 3 — Docker hóa Frontend

### Mục tiêu

Frontend build static và serve bằng Nginx trong container.

### File cần tạo

```text
frontend/Dockerfile
frontend/.dockerignore
frontend/nginx.conf
```

### Cách xác định output

Đọc `frontend/package.json`:

- Create React App thường output `build`.
- Vite thường output `dist`.

Nếu không chắc, đọc config rồi chọn đúng.

### Dockerfile nếu output là `build`

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.25-alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Nếu không có `package-lock.json`, thay `npm ci` bằng `npm install`.

### `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

### `.dockerignore`

```text
node_modules
build
dist
.env
.git
coverage
npm-debug.log
Dockerfile
```

### Verify

```bash
docker build -t proshop-frontend:local ./frontend
```

Nếu không có Docker:

```bash
cd frontend
npm install
npm run build
```

### Definition of Done

- Frontend production không chạy dev server.
- SPA refresh không 404.
- Static files serve bằng Nginx.
- Build pass.

---

## 5. Batch 4 — Docker Compose app foundation

### Mục tiêu

Chạy `mongo`, `backend`, `frontend`, `nginx` cùng một Docker network nội bộ.

### File cần tạo/sửa

```text
docker-compose.yml
.env.example
infra/nginx/conf.d/proshop.conf
```

### Compose nguyên tắc

Chỉ `nginx` được expose public.

Không được có:

```yaml
ports:
  - "27017:27017"
  - "5000:5000"
  - "3000:3000"
```

### `.env.example`

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongo:27017/proshop
JWT_SECRET=change_this_to_a_long_random_secret
PAGINATION_LIMIT=8

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change_this_password

TELEGRAM_BOT_TOKEN=replace_me
TELEGRAM_CHAT_ID=replace_me
DOMAIN=example.com
CERTBOT_EMAIL=your-email@example.com
```

### `docker-compose.yml` nền tảng

Agent cần điều chỉnh theo repo thật nếu script/env khác.

```yaml
services:
  mongo:
    image: mongo:6
    container_name: proshop-mongo
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    networks:
      - proshop_internal

  backend:
    build:
      context: ./backend
    container_name: proshop-backend
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      - mongo
    networks:
      - proshop_internal

  frontend:
    build:
      context: ./frontend
    container_name: proshop-frontend
    restart: unless-stopped
    networks:
      - proshop_internal

  nginx:
    image: nginx:1.25-alpine
    container_name: proshop-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./infra/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./infra/nginx/logs:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - proshop_internal

volumes:
  mongo_data:

networks:
  proshop_internal:
    driver: bridge
```

### `infra/nginx/conf.d/proshop.conf`

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 20M;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://backend:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Verify

```bash
cp .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
curl -I http://localhost/
curl http://localhost/api/health
```

### Definition of Done

- `docker compose config` pass.
- App chạy qua Nginx.
- Không cần truy cập port 3000/5000/27017.
- MongoDB persist bằng volume.

---

## 6. Batch 5 — EC2 deployment docs/scripts

### Mục tiêu

Có hướng dẫn hoặc script để cài Docker trên EC2 Ubuntu và deploy.

### File cần tạo

```text
scripts/ec2-install-docker.sh
docs/cloud-capstone-deployment.md
```

### `scripts/ec2-install-docker.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

sudo apt update
sudo apt install -y ca-certificates curl gnupg git apache2-utils stress

sudo install -m 0755 -d /etc/apt/keyrings

if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi

sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker "${USER}"

echo "Docker installed. Log out and SSH back in for group changes to apply."
docker --version
docker compose version
```

### Verify

```bash
bash -n scripts/ec2-install-docker.sh
```

### Definition of Done

- Có script cài Docker.
- Có tài liệu deploy.
- Tài liệu có lệnh `docker compose up -d --build`.
- Tài liệu nhắc Security Group chỉ mở 22/80/443.

---

## 7. Batch 6 — HTTPS/Certbot

### Mục tiêu

Chuẩn bị cấu hình HTTPS bằng Certbot/Let’s Encrypt.

### File cần tạo/sửa

```text
infra/nginx/conf.d/proshop.ssl.conf.example
scripts/enable-ssl.sh
```

### Compose cần bổ sung

```yaml
certbot:
  image: certbot/certbot:v2.11.0
  container_name: proshop-certbot
  volumes:
    - ./certbot/www:/var/www/certbot
    - ./certbot/conf:/etc/letsencrypt
  networks:
    - proshop_internal
```

Nginx cần mount:

```yaml
    volumes:
      - ./infra/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./infra/nginx/logs:/var/log/nginx
      - ./certbot/www:/var/www/certbot
      - ./certbot/conf:/etc/letsencrypt
```

Nginx public ports:

```yaml
ports:
  - "80:80"
  - "443:443"
```

### `proshop.ssl.conf.example`

```nginx
server {
    listen 80;
    server_name example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    client_max_body_size 20M;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /uploads/ {
        proxy_pass http://backend:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /grafana/ {
        proxy_pass http://grafana:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### `scripts/enable-ssl.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: ./scripts/enable-ssl.sh <domain> <email>"
  exit 1
fi

mkdir -p certbot/www certbot/conf

docker compose up -d nginx

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

cp infra/nginx/conf.d/proshop.ssl.conf.example infra/nginx/conf.d/proshop.conf
sed -i "s/example.com/$DOMAIN/g" infra/nginx/conf.d/proshop.conf

docker compose restart nginx

echo "SSL enabled for $DOMAIN"
```

### Verify

```bash
bash -n scripts/enable-ssl.sh
docker compose config
```

Trên EC2:

```bash
./scripts/enable-ssl.sh your-domain.com your-email@example.com
curl -I https://your-domain.com
docker compose run --rm certbot renew --dry-run
```

### Definition of Done

- Có SSL config.
- Có challenge path.
- HTTP redirect HTTPS.
- Có security headers cơ bản.
- Có renew dry-run hướng dẫn.

---

## 8. Batch 7 — Prometheus + Node Exporter

### Mục tiêu

Thu thập metrics CPU/RAM/Disk của EC2.

### File cần tạo/sửa

```text
infra/prometheus/prometheus.yml
infra/prometheus/alerts.yml
docker-compose.yml
```

### Compose service

```yaml
node-exporter:
  image: prom/node-exporter:v1.8.2
  container_name: proshop-node-exporter
  restart: unless-stopped
  pid: host
  volumes:
    - /proc:/host/proc:ro
    - /sys:/host/sys:ro
    - /:/rootfs:ro
  command:
    - '--path.procfs=/host/proc'
    - '--path.sysfs=/host/sys'
    - '--path.rootfs=/rootfs'
  networks:
    - proshop_internal

prometheus:
  image: prom/prometheus:v2.54.1
  container_name: proshop-prometheus
  restart: unless-stopped
  volumes:
    - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - ./infra/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
    - prometheus_data:/prometheus
  networks:
    - proshop_internal
```

Thêm volume:

```yaml
prometheus_data:
```

### `infra/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/alerts.yml

scrape_configs:
  - job_name: node-exporter
    static_configs:
      - targets:
          - node-exporter:9100

  - job_name: prometheus
    static_configs:
      - targets:
          - prometheus:9090
```

### Verify

```bash
docker compose config
docker compose up -d prometheus node-exporter
docker compose exec prometheus wget -qO- http://node-exporter:9100/metrics | head
```

### Definition of Done

- Node Exporter có metrics.
- Prometheus đọc được target.
- Không public port `9090` trực tiếp ra Internet.

---

## 9. Batch 8 — Grafana dashboard

### Mục tiêu

Dashboard Grafana có CPU/RAM/Disk và datasource tự động.

### File cần tạo/sửa

```text
infra/grafana/provisioning/datasources/prometheus.yml
infra/grafana/provisioning/datasources/loki.yml
infra/grafana/provisioning/dashboards/dashboards.yml
infra/grafana/dashboards/node-exporter-overview.json
docker-compose.yml
```

### Compose service

```yaml
grafana:
  image: grafana/grafana:11.1.4
  container_name: proshop-grafana
  restart: unless-stopped
  environment:
    GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER:-admin}
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
    GF_SERVER_ROOT_URL: "%(protocol)s://%(domain)s/grafana/"
    GF_SERVER_SERVE_FROM_SUB_PATH: "true"
  volumes:
    - grafana_data:/var/lib/grafana
    - ./infra/grafana/provisioning:/etc/grafana/provisioning:ro
    - ./infra/grafana/dashboards:/var/lib/grafana/dashboards:ro
  networks:
    - proshop_internal
```

Thêm volume:

```yaml
grafana_data:
```

### Datasource Prometheus

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### Verify

```bash
docker compose config
docker compose up -d grafana
```

Truy cập qua Nginx:

```text
http://EC2_PUBLIC_IP/grafana/
https://your-domain.com/grafana/
```

### Definition of Done

- Grafana chạy.
- Prometheus datasource OK.
- Dashboard có CPU/RAM/Disk.
- Không public Grafana port trực tiếp nếu không cần.

---

## 10. Batch 9 — Loki + Promtail

### Mục tiêu

Thu log Docker containers, đặc biệt Nginx và Backend, vào Loki để query trong Grafana.

### File cần tạo/sửa

```text
infra/loki/loki.yml
infra/promtail/promtail.yml
docker-compose.yml
```

### Compose service

```yaml
loki:
  image: grafana/loki:2.9.8
  container_name: proshop-loki
  restart: unless-stopped
  command: -config.file=/etc/loki/local-config.yaml
  volumes:
    - ./infra/loki/loki.yml:/etc/loki/local-config.yaml:ro
    - loki_data:/loki
  networks:
    - proshop_internal

promtail:
  image: grafana/promtail:2.9.8
  container_name: proshop-promtail
  restart: unless-stopped
  volumes:
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - ./infra/nginx/logs:/var/log/nginx:ro
    - ./infra/promtail/promtail.yml:/etc/promtail/config.yml:ro
  command: -config.file=/etc/promtail/config.yml
  depends_on:
    - loki
  networks:
    - proshop_internal
```

Thêm volume:

```yaml
loki_data:
```

### `infra/loki/loki.yml`

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
```

### `infra/promtail/promtail.yml`

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: nginx-files
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          source: file
          __path__: /var/log/nginx/*.log

  - job_name: docker-containers
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 10s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
      - source_labels: ['__meta_docker_container_id']
        target_label: 'container_id'
```

### Verify

```bash
docker compose config
docker compose up -d loki promtail
docker compose logs --tail=50 promtail
```

Trong Grafana Explore:

```logql
{job="nginx"}
```

hoặc:

```logql
{container=~".*proshop.*"}
```

### Definition of Done

- Loki datasource OK.
- Query được Nginx access log.
- Query được backend/container log.
- Có bằng chứng LogQL.

---

## 11. Batch 10 — AlertManager Telegram

### Mục tiêu

CPU > 85% trong thời gian ngắn thì gửi Telegram.

### File cần tạo/sửa

```text
infra/alertmanager/alertmanager.yml
infra/prometheus/alerts.yml
docker-compose.yml
```

### Compose service

```yaml
alertmanager:
  image: prom/alertmanager:v0.27.0
  container_name: proshop-alertmanager
  restart: unless-stopped
  volumes:
    - ./infra/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
  command:
    - '--config.file=/etc/alertmanager/alertmanager.yml'
  networks:
    - proshop_internal
```

Prometheus cần thêm:

```yaml
command:
  - '--config.file=/etc/prometheus/prometheus.yml'
  - '--web.enable-lifecycle'
```

Trong `prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### `infra/prometheus/alerts.yml`

```yaml
groups:
  - name: ec2-alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100) > 85
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "CPU usage is above 85%"
          description: "EC2 CPU usage has been above 85% for more than 1 minute."
```

### `infra/alertmanager/alertmanager.yml`

Cảnh báo: file YAML này không tự expand `.env` nếu chạy AlertManager trực tiếp. Nếu cần dynamic token, agent phải tạo template render script hoặc ghi hướng dẫn thay placeholder thủ công.

```yaml
route:
  receiver: telegram
  group_wait: 10s
  group_interval: 30s
  repeat_interval: 5m

receivers:
  - name: telegram
    telegram_configs:
      - bot_token: "REPLACE_TELEGRAM_BOT_TOKEN"
        chat_id: REPLACE_TELEGRAM_CHAT_ID
        parse_mode: HTML
        message: |
          🚨 <b>{{ .CommonLabels.alertname }}</b>
          Severity: {{ .CommonLabels.severity }}
          Summary: {{ .CommonAnnotations.summary }}
          Description: {{ .CommonAnnotations.description }}
```

### Verify

```bash
docker compose config
docker compose up -d alertmanager prometheus
docker compose logs --tail=50 alertmanager
```

Test CPU:

```bash
stress --cpu 2 --timeout 180
```

Hoặc:

```bash
ab -n 10000 -c 300 http://localhost/
```

### Definition of Done

- Prometheus rule loaded.
- Alert chuyển sang firing khi CPU cao.
- AlertManager nhận alert.
- Telegram nhận message.
- Có ảnh/bằng chứng.

---

## 12. Batch 11 — DDoS simulation scripts

### Mục tiêu

Có script test tải phục vụ demo và post-mortem.

### File cần tạo

```text
scripts/simulate-ddos.sh
docs/postmortem-template.md
```

### `scripts/simulate-ddos.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-}"
TOTAL_REQUESTS="${2:-5000}"
CONCURRENCY="${3:-200}"

if [ -z "$TARGET_URL" ]; then
  echo "Usage: ./scripts/simulate-ddos.sh <url> [total_requests] [concurrency]"
  echo "Example: ./scripts/simulate-ddos.sh https://example.com/ 5000 200"
  exit 1
fi

if ! command -v ab >/dev/null 2>&1; then
  echo "apache benchmark 'ab' not found. Install with: sudo apt install apache2-utils -y"
  exit 1
fi

mkdir -p evidence

OUTPUT_FILE="evidence/ab-$(date +%Y%m%d-%H%M%S).txt"

echo "Running Apache Benchmark..."
echo "Target: $TARGET_URL"
echo "Requests: $TOTAL_REQUESTS"
echo "Concurrency: $CONCURRENCY"

ab -n "$TOTAL_REQUESTS" -c "$CONCURRENCY" "$TARGET_URL" | tee "$OUTPUT_FILE"

echo "Saved result to $OUTPUT_FILE"
```

### `docs/postmortem-template.md`

```markdown
# ProShop Cloud Capstone — Incident Post-mortem

## 1. Incident Summary

- Date/time:
- System:
- Detected by:
- Severity:
- Short summary:

## 2. Timeline

| Time | Event |
|---|---|
| HH:MM | Load test started |
| HH:MM | CPU crossed 85% |
| HH:MM | Telegram alert received |
| HH:MM | Grafana checked |
| HH:MM | Loki/LogQL used to inspect logs |
| HH:MM | Suspicious IP/request pattern identified |
| HH:MM | Mitigation applied |
| HH:MM | System recovered |

## 3. Detection

- Prometheus alert:
- AlertManager notification:
- Grafana dashboard evidence:
- Loki query evidence:

## 4. Impact

- User-facing impact:
- API impact:
- Database impact:
- Duration:
- Data loss: Yes/No

## 5. Root Cause

- Direct cause:
- Contributing factors:
- Missing protection:

## 6. Evidence

### Apache Benchmark

```text
Paste ab result here.
```

### Grafana

- Screenshot path:

### Telegram

- Screenshot path:

### Loki / LogQL

Query used:

```logql
{job="nginx"}
```

Finding:

```text
Describe suspicious request/IP pattern.
```

## 7. Mitigation

- Immediate action:
- IP block/rate limit:
- Service restart if any:

## 8. Prevention

- Nginx rate limiting:
- AWS WAF/CloudFront:
- More alerts:
- Backup/restore:
- Capacity planning:

## 9. Lessons Learned

- What worked:
- What did not work:
- What to improve before production:
```

### Verify

```bash
bash -n scripts/simulate-ddos.sh
```

### Definition of Done

- Script chạy được.
- Kết quả lưu vào `evidence/`.
- Post-mortem template đầy đủ.

---

## 13. Batch 12 — Nginx rate limiting hardening

### Mục tiêu

Có cấu hình giảm tác động request flood cơ bản.

### File cần sửa

```text
infra/nginx/conf.d/proshop.conf
```

### Gợi ý cấu hình

Cần đặt `limit_req_zone` ở context `http`, không đặt trong `server`. Vì file `conf.d/*.conf` được include trong context `http` của Nginx official image, có thể đặt ở đầu file:

```nginx
limit_req_zone $binary_remote_addr zone=global_req_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api_req_limit:10m rate=5r/s;
```

Trong location `/api/`:

```nginx
limit_req zone=api_req_limit burst=20 nodelay;
```

Trong location `/`:

```nginx
limit_req zone=global_req_limit burst=50 nodelay;
```

### Verify

```bash
docker compose exec nginx nginx -t
docker compose restart nginx
```

### Definition of Done

- `nginx -t` pass.
- App vẫn truy cập được.
- Khi test tải mạnh, có thể xuất hiện 503/429 tùy config và CPU đỡ tăng hơn.
- Có ghi chú trong docs.

---

## 14. Batch 13 — Final evidence and demo readiness

### Mục tiêu

Chuẩn bị đầy đủ bằng chứng bảo vệ.

### Tạo thư mục

```bash
mkdir -p evidence
```

### Lệnh thu bằng chứng

```bash
docker compose ps > evidence/docker-compose-ps.txt
docker compose config > evidence/docker-compose-config.txt
docker compose logs --tail=200 nginx > evidence/nginx-logs.txt
docker compose logs --tail=200 backend > evidence/backend-logs.txt
curl -I http://localhost/ > evidence/http-check.txt || true
curl http://localhost/api/health > evidence/backend-health.txt || true
```

Nếu có HTTPS:

```bash
curl -I https://YOUR_DOMAIN > evidence/https-check.txt
```

### Ảnh cần chụp

```text
evidence/
├── 01-website-https.png
├── 02-aws-security-group.png
├── 03-docker-compose-ps.png
├── 04-prometheus-targets.png
├── 05-grafana-dashboard.png
├── 06-loki-logql-nginx.png
├── 07-telegram-alert.png
├── 08-ab-test-result.txt
├── 09-postmortem-report.md
└── 10-architecture-diagram.png
```

### Definition of Done

- Có đủ evidence text.
- Có ảnh dashboard/log/alert/security group.
- Có post-mortem.
- Có thể demo trơn tru trong 5–7 phút.

---

## 15. Execution Status

Agent phải cập nhật bảng này sau từng batch.

| Batch | Tên | Status | Changed files | Verification | Notes |
|---:|---|---|---|---|---|
| 1 | Repo discovery + health endpoint | DONE | backend/server.js | node --check backend/server.js | health endpoint already existed |
| 2 | Docker Backend | DONE | backend/Dockerfile, backend/.dockerignore | Test-Path backend/Dockerfile | Docker not running locally, verified files |
| 3 | Docker Frontend | DONE | frontend/Dockerfile, infra/frontend/nginx.conf | Test-Path infra/frontend/nginx.conf | Docker not running, verified files |
| 4 | Compose + Nginx foundation | DONE | docker-compose.yml, .env.example, infra/nginx/conf.d/proshop.conf | docker compose config | All files exist and are valid |
| 5 | EC2 deploy docs/scripts | DONE | docs/cloud-capstone-deployment.md | bash -n scripts/ec2-install-docker.sh | created missing docs
| 6 | HTTPS/Certbot | DONE | infra/nginx/conf.d/proshop.ssl.conf.example, scripts/enable-ssl.sh | docker compose config | All files exist and are valid |
| 7 | Prometheus + Node Exporter | DONE | infra/prometheus/prometheus.yml, infra/prometheus/rules/proshop-alerts.yml | docker compose config | Verified files exist |
| 8 | Grafana dashboard | DONE | infra/grafana/provisioning/datasources/datasources.yml, infra/grafana/dashboards/proshop-cloud-capstone.json | Test-Path | Verified files exist and contain prometheus and loki |
| 9 | Loki + Promtail | DONE | infra/loki/loki-config.yml, infra/promtail/promtail-config.yml | Test-Path | Verified files exist |
| 10 | AlertManager Telegram | DONE | infra/alertmanager/alertmanager.yml, infra/prometheus/rules/proshop-alerts.yml | Test-Path | Verified files exist |
| 11 | DDoS simulation + postmortem | DONE | scripts/simulate-ddos.sh, docs/postmortem-template.md | Test-Path | Verified files exist |
| 12 | Nginx rate limiting | DONE | infra/nginx/conf.d/proshop.conf | Select-String limit_req | Added limit_req to config |
| 13 | Final evidence/demo readiness | DONE | evidence/ | docker compose config > evidence | Generated config evidence |

---

## 16. Final acceptance checklist

Agent chỉ được kết luận hoàn thành khi tất cả checklist dưới đây đạt.

### Deploy

- [ ] `docker compose up -d --build` chạy được.
- [ ] Website truy cập qua Nginx.
- [ ] `/api/health` trả JSON OK.
- [ ] MongoDB lưu data bằng Docker volume.
- [ ] Restart container không mất data.

### Security

- [ ] Docker Compose không expose MongoDB `27017`.
- [ ] Docker Compose không expose Backend `5000`.
- [ ] Docker Compose không expose Frontend `3000`.
- [ ] AWS Security Group chỉ mở 22/80/443.
- [ ] SSH port 22 giới hạn IP cá nhân nếu có thể.
- [ ] HTTPS hoạt động.
- [ ] HTTP redirect HTTPS.
- [ ] Secret nằm trong `.env`, không commit.

### Monitoring

- [ ] Node Exporter có metrics.
- [ ] Prometheus target UP.
- [ ] Grafana datasource OK.
- [ ] Dashboard có CPU/RAM/Disk.
- [ ] Loki nhận log.
- [ ] Promtail không lỗi.
- [ ] LogQL query được Nginx/backend logs.

### Alerting

- [ ] Alert rule CPU > 85% tồn tại.
- [ ] AlertManager chạy.
- [ ] Telegram nhận alert thật.
- [ ] Có bằng chứng ảnh.

### Incident report

- [ ] Chạy được script `simulate-ddos.sh`.
- [ ] Có output Apache Benchmark.
- [ ] Có Grafana screenshot khi CPU tăng.
- [ ] Có LogQL evidence.
- [ ] Có post-mortem theo template.
- [ ] Có mitigation/prevention rõ ràng.

---

## 17. Lệnh demo nhanh

```bash
docker compose ps
curl -I http://localhost/
curl http://localhost/api/health
docker compose logs --tail=20 nginx
docker compose logs --tail=20 backend
```

Test tải:

```bash
./scripts/simulate-ddos.sh http://localhost/ 5000 200
```

Nếu chạy trên domain HTTPS:

```bash
./scripts/simulate-ddos.sh https://YOUR_DOMAIN/ 5000 200
```

---

## 18. Câu trình bày khi bảo vệ

> Hệ thống ProShop được triển khai trên AWS EC2 bằng Docker Compose. Frontend, Backend và MongoDB chạy trong Docker network nội bộ. Internet chỉ truy cập vào Nginx Reverse Proxy qua cổng 80/443. MongoDB và Backend không expose ra Internet. Hệ thống có HTTPS bằng Let’s Encrypt, Prometheus/Node Exporter để theo dõi CPU RAM Disk, Loki/Promtail để thu log, Grafana để trực quan hóa, và AlertManager gửi cảnh báo Telegram khi CPU vượt 85%. Khi mô phỏng DDoS bằng Apache Benchmark, nhóm kiểm tra dashboard, nhận alert, truy vấn LogQL để tìm request bất thường và viết post-mortem kèm biện pháp chặn IP/rate limit/WAF.
