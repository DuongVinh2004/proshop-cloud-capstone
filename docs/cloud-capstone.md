# ProShop Cloud Capstone Deployment Guide

Tài liệu này biến repo ProShop MERN thành một bài nộp phù hợp yêu cầu đồ án **Cloud Computing & SRE**: Docker hóa ứng dụng 3 lớp, đưa lên AWS EC2, bảo mật bằng Nginx reverse proxy + Security Group + HTTPS, giám sát bằng Prometheus/Loki/Grafana/AlertManager và có kịch bản kiểm thử tải.

## 1. Kiến trúc mục tiêu

```text
Internet
  |
  | HTTP/HTTPS only
  v
AWS Security Group
  |-- 22: chỉ IP cá nhân của nhóm
  |-- 80: 0.0.0.0/0
  |-- 443: 0.0.0.0/0 sau khi bật SSL
  |-- Không mở 27017, 5000, 3000, 9090, 9093, 3100
  v
Nginx Reverse Proxy container
  |-- /                 -> Frontend React static container
  |-- /api/*            -> Backend Node/Express container
  |-- /uploads/*        -> Backend upload files
  |-- /grafana/*        -> Grafana dashboard
  v
Internal Docker networks
  |-- app_net: nginx, frontend, backend, grafana, prometheus, loki, promtail, alertmanager
  |-- db_net internal: backend <-> mongo only
```

Database MongoDB chỉ nằm trong Docker internal network `db_net`, không publish port `27017` ra host. Backend NodeJS cũng chỉ `expose` port `5000` trong Docker network, không mở trực tiếp ra Internet.

## 2. File đã bổ sung/chỉnh sửa

| Hạng mục | File |
|---|---|
| Backend Dockerfile | `backend/Dockerfile` |
| Frontend Dockerfile | `frontend/Dockerfile` |
| Compose app + monitoring | `docker-compose.yml` |
| Reverse proxy | `infra/nginx/conf.d/proshop.conf` |
| HTTPS template | `infra/nginx/conf.d/proshop.ssl.conf.example` |
| Frontend static Nginx | `infra/frontend/nginx.conf` |
| Prometheus | `infra/prometheus/prometheus.yml` |
| Alert rules | `infra/prometheus/rules/proshop-alerts.yml` |
| AlertManager Telegram | `infra/alertmanager/alertmanager.yml` |
| Loki | `infra/loki/loki-config.yml` |
| Promtail | `infra/promtail/promtail-config.yml` |
| Grafana provisioning | `infra/grafana/provisioning/**` |
| Dashboard mẫu | `infra/grafana/dashboards/proshop-cloud-capstone.json` |
| EC2 helper script | `scripts/ec2-install-docker.sh` |
| SSL helper script | `scripts/enable-ssl.sh` |
| Load test helper | `scripts/simulate-ddos.sh` |
| Backend health check | `backend/server.js` thêm `/api/health` |

## 3. Chạy local hoặc trên EC2

### 3.1. Chuẩn bị `.env`

```bash
cp .env.example .env
nano .env
```

Bắt buộc đổi các giá trị sau trước khi chạy trên EC2:

```env
MONGO_ROOT_PASSWORD=mat_khau_mongo_manh
JWT_SECRET=chuoi_bi_mat_it_nhat_32_ky_tu
GRAFANA_ADMIN_PASSWORD=mat_khau_grafana_manh
DOMAIN=your-domain.com
TELEGRAM_BOT_TOKEN=bot_token_tu_botfather
TELEGRAM_CHAT_ID=chat_id_cua_nhom_telegram
```

### 3.2. Build và chạy

```bash
docker compose up -d --build
```

Kiểm tra container:

```bash
docker compose ps
docker compose logs -f nginx
docker compose logs -f backend
```

Mở web:

```text
http://<EC2_PUBLIC_IP>/
http://<EC2_PUBLIC_IP>/api/health
http://<EC2_PUBLIC_IP>/grafana/
```

### 3.3. Seed dữ liệu mẫu

Sau khi stack đã chạy:

```bash
docker compose exec backend npm run data:import
```

Tài khoản mẫu:

```text
admin@example.com / 123456
john@example.com  / 123456
jane@example.com  / 123456
```

## 4. Cấu hình AWS EC2

### 4.1. Instance khuyến nghị

- AMI: Ubuntu Server 22.04 LTS hoặc 24.04 LTS.
- Instance: tối thiểu `t2.micro` để demo, nên dùng `t3.small`/`t3.medium` nếu bật đầy đủ Grafana + Loki + Prometheus.
- Disk: tối thiểu 20GB, khuyến nghị 30GB.

### 4.2. Cài Docker trên EC2

```bash
chmod +x scripts/ec2-install-docker.sh
./scripts/ec2-install-docker.sh
```

Đăng xuất SSH rồi đăng nhập lại để user `ubuntu` có quyền chạy Docker.

### 4.3. Security Group chuẩn

| Port | Source | Mục đích |
|---|---|---|
| 22 | `YOUR_PUBLIC_IP/32` | SSH quản trị |
| 80 | `0.0.0.0/0` | HTTP + ACME challenge |
| 443 | `0.0.0.0/0` | HTTPS sau khi có SSL |

Không mở các port sau ra Internet: `27017`, `5000`, `3000`, `9090`, `9093`, `3100`, `9100`.

## 5. Bật HTTPS với Certbot/Let's Encrypt

Điều kiện: domain đã trỏ A record về Public IP của EC2.

### 5.1. Cấp chứng chỉ

Đảm bảo Nginx HTTP đang chạy:

```bash
docker compose up -d nginx
```

Chạy Certbot container:

```bash
docker compose --profile ssl run --rm certbot
```

### 5.2. Bật cấu hình HTTPS

```bash
chmod +x scripts/enable-ssl.sh
./scripts/enable-ssl.sh your-domain.com
```

Sau đó sửa `docker-compose.yml`, bỏ comment dòng publish port `443:443` trong service `nginx`, rồi restart:

```bash
docker compose up -d nginx
```

Truy cập:

```text
https://your-domain.com/
https://your-domain.com/grafana/
```

### 5.3. Gia hạn chứng chỉ

```bash
docker compose --profile ssl run --rm certbot renew --webroot --webroot-path=/var/www/certbot
docker compose exec nginx nginx -s reload
```

Có thể đặt cron trên EC2:

```bash
0 3 * * * cd /home/ubuntu/proshop_mern-master && docker compose --profile ssl run --rm certbot renew --webroot --webroot-path=/var/www/certbot && docker compose exec nginx nginx -s reload
```

## 6. Monitoring & Observability

### 6.1. Các service được bật

| Service | Vai trò | Có mở Internet không? |
|---|---|---|
| Node Exporter | CPU/RAM/Disk EC2 | Không |
| Prometheus | Thu thập metrics | Không |
| Loki | Lưu log | Không |
| Promtail | Đẩy Nginx/Docker logs vào Loki | Không |
| Grafana | Dashboard tại `/grafana/` | Qua Nginx |
| AlertManager | Gửi alert Telegram | Không |

### 6.2. Dashboard Grafana

Truy cập:

```text
http://<EC2_PUBLIC_IP>/grafana/
```

Đăng nhập bằng user/password trong `.env`:

```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=...
```

Dashboard mẫu đã được provision tự động ở folder **Cloud Capstone**.

Bạn cũng có thể import thêm dashboard Node Exporter phổ biến:

```text
Dashboard ID: 1860
Datasource: Prometheus
```

### 6.3. Alert Telegram CPU > 85%

Rule nằm tại:

```text
infra/prometheus/rules/proshop-alerts.yml
```

Điều kiện bắn alert:

```promql
(1 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[2m]))) * 100 > 85
```

Khi CPU vượt 85% trong 1 phút, AlertManager sẽ gửi Telegram qua cấu hình:

```text
infra/alertmanager/alertmanager.yml
```

## 7. Giả lập tấn công tải bằng Apache Benchmark

Cài `apache2-utils` trên máy local hoặc EC2 khác:

```bash
sudo apt update
sudo apt install -y apache2-utils
```

Chạy test:

```bash
chmod +x scripts/simulate-ddos.sh
./scripts/simulate-ddos.sh http://<EC2_PUBLIC_IP>/ 10000 100
```

Hoặc chạy trực tiếp:

```bash
ab -n 10000 -c 100 http://<EC2_PUBLIC_IP>/
```

Theo dõi:

```bash
docker compose logs -f nginx
docker compose logs -f alertmanager
```

Mở Grafana để quan sát CPU, RAM và log.

## 8. Truy vấn LogQL để tìm IP request bất thường

Trong Grafana > Explore > chọn datasource Loki.

### 8.1. Xem log Nginx mới nhất

```logql
{job="nginx"}
```

### 8.2. Lọc request HTTP status 4xx/5xx

```logql
{job="nginx"} |~ " 4[0-9]{2} | 5[0-9]{2} "
```

### 8.3. Tìm IP gửi nhiều request nhất

Do log format bắt đầu bằng IP, có thể dùng truy vấn sau để quan sát các dòng nghi ngờ:

```logql
{job="nginx"} | pattern `<ip> - <_> [<time>] "<method> <path> <protocol>" <status> <bytes> <_>`
```

Nếu Grafana/Loki hỗ trợ aggregation theo label sau khi parse:

```logql
topk(10, sum by (ip) (count_over_time({job="nginx"} | pattern `<ip> - <_> [<time>] "<method> <path> <protocol>" <status> <bytes> <_>` [5m])))
```

## 9. Cách khắc phục khi có IP bất thường

### 9.1. Chặn nhanh bằng UFW trên EC2

```bash
sudo ufw deny from <ATTACKER_IP> to any port 80
sudo ufw deny from <ATTACKER_IP> to any port 443
sudo ufw status numbered
```

### 9.2. Chặn tại Nginx

Thêm vào server block trong `infra/nginx/conf.d/proshop.conf` hoặc file SSL:

```nginx
deny <ATTACKER_IP>;
allow all;
```

Reload:

```bash
docker compose exec nginx nginx -s reload
```

### 9.3. Giải pháp dài hạn

- Thêm AWS WAF/CloudFront nếu được phép dùng thêm dịch vụ AWS.
- Rate limit tại Nginx bằng `limit_req_zone`.
- Dùng Auto Scaling/Load Balancer nếu bài mở rộng yêu cầu chịu tải cao.
- Tách MongoDB sang private subnet hoặc MongoDB Atlas private access trong môi trường thật.

## 10. Checklist nộp bài

- [ ] Web truy cập được qua IP/domain.
- [ ] `docker compose ps` tất cả service `Up`.
- [ ] MongoDB không publish port `27017`.
- [ ] Backend không publish port `5000`.
- [ ] Security Group chỉ mở 22 từ IP cá nhân, 80, 443.
- [ ] HTTPS hoạt động nếu đã có domain.
- [ ] Grafana xem được CPU/RAM/Disk.
- [ ] Loki xem được Nginx access/error logs và Docker logs.
- [ ] AlertManager gửi được Telegram khi CPU > 85%.
- [ ] Có ảnh chụp dashboard, alert Telegram, Security Group, Docker Compose running.
- [ ] Có post-mortem report sau khi test tải.
