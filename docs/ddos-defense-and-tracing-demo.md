# Hướng dẫn Trình diễn: Phòng thủ và Truy vết DDoS (DDoS Defense & Tracing Demo)

Tài liệu này cung cấp kịch bản trình bày trung thực, chuyên nghiệp về kiến trúc phòng thủ và năng lực truy vết hệ thống ProShop Cloud Capstone.

## 1. Tuyên bố Trung thực về Năng lực Hệ thống (Disclaimer)

Trước khi demo, cần làm rõ giới hạn của hệ thống hiện tại với Ban Giám Khảo:
- **Nginx (Origin Protection):** Giúp giảm thiểu một số cuộc tấn công lạm dụng Layer 7 (như Slowloris, Brute-force Login, Spam Order) nhờ các cơ chế Limit Connections, Rate Limits và Timeouts.
- **Giới hạn Volumetric DDoS:** Nginx **KHÔNG THỂ** chống lại Volumetric DDoS (như UDP Flood, SYN Flood băng thông lớn) khi lượng traffic "rác" đã đi vào đến card mạng của máy chủ EC2, gây nghẽn băng thông vật lý.
- **Giải pháp hoàn chỉnh (Tương lai):** Cần kết hợp CloudFront + AWS WAF + Shield Standard (Đã có bản thiết kế Blueprint) để hấp thụ Volumetric DDoS và lọc XSS/SQLi tại biên (Edge) trước khi chúng chạm đến EC2.

## 2. Kịch bản Trình diễn (Demo Script)

### Kịch bản 1: Phòng thủ chủ động tại Nginx (Layer 7 Abuse)

**Hành động:** Sử dụng công cụ `Apache Benchmark (ab)` hoặc Bash script để gửi lượng lớn request giả mạo vào `/api/users/login`.
```bash
# Gửi 100 request đồng thời vào Login API
ab -n 200 -c 20 https://proshopvphht.duckdns.org/api/users/login
```
**Kết quả mong đợi:**
- Nginx sẽ trả về mã `429 Too Many Requests` (do `limit_req` hoặc `limit_conn`) để bảo vệ Backend khỏi bị sập.
- Các request vào Honeypot (`/wp-admin`) sẽ bị đóng kết nối mà không gửi response header (Nginx ghi log mã nội bộ `444`).
- Lưu ý: Honeypot giúp ghi nhận request đáng ngờ, không loại bỏ scanning, không chống DDoS volumetric, không tự ban IP. Request vẫn đi đến EC2 và Nginx vẫn phải chịu tải xử lý việc đóng kết nối.

### Kịch bản 2: Hệ thống cảnh báo (Prometheus Alerting)

**Hành động:** Mở nhóm Telegram Alert.
**Kết quả mong đợi:**
- Khi lưu lượng tăng đột biến, Nginx Exporter đẩy metrics lên Prometheus.
- Prometheus rules chịu trách nhiệm đánh giá và AlertManager sẽ gửi cảnh báo nếu vượt ngưỡng.
- Tin nhắn cảnh báo gửi về Telegram với đầy đủ thông tin: "Nginx High Request Rate: Tốc độ request hiện tại vượt mốc nguy hiểm (50 req/s)".

### Kịch bản 3: Truy vết "Kẻ tấn công" qua SOC Dashboard và Loki

**Hành động:** Trình bày trên Grafana.
1. **Tổng quan Hệ thống:** Mở `ProShop SOC Dashboard` để thấy biểu đồ CPU, RAM và Active Connections. Dashboard hiển thị dữ liệu quan sát; Alert rules chịu trách nhiệm cảnh báo.
2. **Truy vết Origin (Loki):**
   - Chỉ ra Panel "Top 10 IP" để xác định IP của máy tính đang chạy lệnh `ab`.
   - Xem Log JSON trực tiếp để phân tích các request bị rate limit (Mã `429` / `503`) và các request bị chặn tại bẫy (Mã `444`).
3. **Giải thích Truy vết Edge (Trong tương lai):**
   - Giải thích rằng nếu dùng AWS WAF, việc truy vết sẽ chuyển sang truy vấn Athena vào S3 (WAF Logs) để thấy luật (Rule) nào đã block request, giảm tải hoàn toàn việc truy vết cho server hiện tại.
