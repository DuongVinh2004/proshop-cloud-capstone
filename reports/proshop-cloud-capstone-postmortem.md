# ProShop Cloud Capstone — Post-mortem Report

## 1. Thông tin sự kiện
- Hệ thống: ProShop MERN trên AWS EC2 Ubuntu 24.04
- Domain: https://proshopvphht.duckdns.org
- Thời gian kiểm thử: 04/06/2026 UTC
- Mức độ: Controlled Test, không phải sự cố thật
- Stack: Docker Compose, Nginx, MongoDB, Prometheus, Grafana, Loki, Promtail, AlertManager

## 2. Tóm tắt
Hệ thống được kiểm thử bằng hai kịch bản có giới hạn:
1. Stress CPU trong 300 giây để xác nhận cảnh báo CPU vượt 85%.
2. Gửi 300 request đến `/api/products` để xác nhận logging và truy vết IP bằng LogQL.

Prometheus ghi nhận CPU khoảng 97.58% đến 100%, alert `HighCPUUsage` chuyển sang `firing`, AlertManager định tuyến đến Telegram và Telegram đã nhận thông báo. Loki xác định IP `171.240.77.44` đã gửi 300 request đến `/api/products` trong 15 phút.

## 3. Tác động
- Không ghi nhận downtime kéo dài.
- Website vẫn trả HTTP 200 và API `/api/health` trả `ok`.
- Backend, Frontend, MongoDB và Nginx vẫn healthy.
- Alert tự trở về bình thường sau khi stress kết thúc.
- Không ghi nhận mất dữ liệu.

## 4. Nguyên nhân
CPU cao được tạo chủ động bằng lệnh `stress --cpu 2 --timeout 300`. Lưu lượng HTTP bất thường là bài mô phỏng có kiểm soát từ IP `171.240.77.44`.

## 5. Phát hiện và quan sát
- Prometheus thu thập metrics từ Node Exporter.
- Rule `HighCPUUsage` kích hoạt khi CPU vượt 85% trong 1 phút.
- AlertManager gửi cảnh báo đến Telegram.
- Nginx ghi access/error log; Promtail chuyển log đến Loki.
- Loki truy vấn được `{job="nginx"}` và `{job="docker"}`.
- LogQL dùng để thống kê IP:

```logql
sum by (client_ip) (
  count_over_time(
    {job="nginx"} |= "/api/products"
    | regexp `^(?P<client_ip>\S+) `
    | client_ip!="127.0.0.1"
    [15m]
  )
)
```

Kết quả: `client_ip="171.240.77.44"` → `300 requests`.

## 6. Khắc phục và phòng ngừa
- Chỉ public Nginx qua cổng 80 và 443; không public các service nội bộ.
- Duy trì Nginx rate limiting, HTTPS, Prometheus alerts và Loki logs.
- Giữ swap 2 GB trên EC2 khoảng 1 GB RAM.
- Không build Backend và Frontend cùng lúc; không dùng `--no-cache` trên EC2 nhỏ.
- Sao lưu MongoDB trước khi import dữ liệu.
- Không chạy `npm run data:import` khi có dữ liệu thật vì lệnh xóa users, products và orders.

## 7. Evidence
- `evidence/import-data-fix-evidence.txt`
- `evidence/order-creation-fix-evidence.txt`
- `evidence/loki-nginx-docker-evidence.txt`
- `evidence/highcpu-telegram-evidence.txt`
- `evidence/highcpu-recovery-evidence.txt`
- `evidence/logql-attacker-ip-evidence.txt`
- Ảnh Telegram, Security Group và Grafana dashboard

## 8. Kết luận
Hệ thống đã đáp ứng triển khai MERN trên AWS EC2, bảo mật bằng Nginx/HTTPS, giám sát bằng Prometheus/Grafana, logging bằng Loki/Promtail, cảnh báo Telegram và truy vết IP bằng LogQL.
