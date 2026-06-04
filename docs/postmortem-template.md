# Post-mortem Report - ProShop Load/DDoS Simulation

## 1. Thông tin sự cố

- Thời gian bắt đầu:
- Thời gian kết thúc:
- Người thực hiện kiểm thử:
- Công cụ: Apache Benchmark (`ab`)
- Lệnh test:

```bash
ab -n 10000 -c 100 http://<domain-or-ip>/
```

## 2. Tóm tắt sự cố

Trong quá trình giả lập tải cao, hệ thống nhận số lượng request lớn trong thời gian ngắn. CPU EC2 tăng vượt ngưỡng cảnh báo 85%, Prometheus kích hoạt alert và AlertManager gửi thông báo về Telegram.

## 3. Tác động

- Người dùng có thể thấy website phản hồi chậm hơn bình thường.
- Nginx access log ghi nhận lượng request tăng đột biến.
- CPU EC2 tăng cao, có nguy cơ ảnh hưởng backend nếu tải tiếp tục kéo dài.

## 4. Bằng chứng quan sát

- Ảnh Grafana CPU/RAM/Disk:
- Ảnh Telegram alert:
- Ảnh Prometheus alert firing:
- LogQL đã dùng:

```logql
topk(10, sum by (ip) (count_over_time({job="nginx"} | pattern `<ip> - <_> [<time>] "<method> <path> <protocol>" <status> <bytes> <_>` [5m])))
```

## 5. Nguyên nhân gốc rễ

Một IP/client gửi request với tần suất cao bằng Apache Benchmark. Hệ thống vẫn nhận request hợp lệ qua Nginx nên CPU tăng do phải xử lý nhiều kết nối cùng lúc.

## 6. Cách xử lý tức thời

- Xác định IP bất thường bằng Loki/LogQL.
- Chặn IP bằng UFW hoặc Nginx.

```bash
sudo ufw deny from <ATTACKER_IP> to any port 80
sudo ufw deny from <ATTACKER_IP> to any port 443
```

## 7. Biện pháp phòng ngừa dài hạn

- Bật rate limit trong Nginx.
- Đặt CloudFront/AWS WAF phía trước EC2.
- Tối ưu Docker resource limit và cấu hình autoscaling nếu triển khai production thật.
- Tách database sang private subnet/service managed DB.
- Bổ sung alert theo request rate, 5xx rate và disk usage.

## 8. Kết luận

Hệ thống đã phát hiện được tải bất thường qua CPU alert, có log tập trung để truy vết IP, và có quy trình xử lý/chặn nguồn request bất thường.
