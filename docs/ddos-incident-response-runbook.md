# Sổ tay Ứng phó Sự cố DDoS (DDoS Incident Response Runbook)

Tài liệu hướng dẫn quy trình vận hành chuẩn (SOP) để xử lý khi phát hiện sự cố nghi ngờ liên quan đến DDoS.

## Sơ đồ Quy trình Ứng phó (Incident Response Flow)

```text
Detect -> Validate -> Identify affected layer -> Trace IP/URI/status/rule -> Mitigate safely -> Verify recovery -> Create post-mortem
```

## Bước 1: Phát hiện (Detect)
- Alert từ Telegram (Prometheus / AlertManager).
- Cảnh báo AWS CloudWatch (Nếu có cấu hình CloudFront/WAF).
- Khách hàng báo cáo website truy cập chậm hoặc báo lỗi 5xx.

## Bước 2: Xác nhận sự cố (Validate)
- Đăng nhập vào Grafana, mở **ProShop SOC Dashboard**.
- Kiểm tra các biểu đồ:
  - CPU / Memory / Disk / Network EC2.
  - Active Connections & Request Rate của Nginx.
  - Lỗi 5xx từ Upstream.
- **Đánh giá:** Đây là lỗi code (Bug) hay thực sự là tấn công tốn tài nguyên (DDoS)?

## Bước 3: Xác định tầng bị tấn công (Identify affected layer)
- **Layer 3/4 (Network/Transport):** Network Receive Bytes tăng vọt mức GB/s, server mất kết nối SSH. (Khắc phục: Dựa vào AWS Shield Standard).
- **Layer 7 (Application):** CPU cao, Request Rate cao, Nginx connections cao, xuất hiện nhiều log truy cập vào 1 URI cụ thể. (Khắc phục: Nginx Rate Limit hoặc WAF).

## Bước 4: Truy vết (Trace)
- **Tại Origin (EC2):**
  - Mở Grafana Loki. Chạy câu lệnh LogQL:
    ```logql
    # Tìm Top IP tấn công
    topk(10, sum by (client_ip) (count_over_time({job="nginx"} | json | client_ip!="" [5m])))

    # Tìm Top URI bị tấn công
    topk(10, sum by (uri) (count_over_time({job="nginx"} | json | uri!="" [5m])))
    ```
- **Tại Edge (AWS WAF/CloudFront):**
  - Sử dụng AWS Athena query WAF logs trên S3 để xem rule nào match và IP nào bị block.

## Bước 5: Giảm thiểu thiệt hại an toàn (Mitigate safely)
*Cảnh báo: Không tự động ban IP vĩnh viễn trên IPTables để tránh False Positive làm chặn IP của ISP NAT.*
- Tinh chỉnh tạm thời Nginx Rate Limit (`api_req_limit` hoặc `global_req_limit`) xuống thấp hơn.
- Nếu dùng CloudFront + WAF: Thêm IP độc hại vào **WAF IP Set** hoặc bật rule "Rate-based rule" xuống ngưỡng thấp hơn ở chế độ Block.

## Bước 6: Xác nhận phục hồi (Verify recovery)
- Theo dõi biểu đồ Active Connections và CPU giảm về mức bình thường.
- Xác nhận các HTTP 200 xuất hiện trở lại thay vì 502/503/504.
- `curl -sS https://proshopvphht.duckdns.org/api/health` phải trả về HTTP 200.

## Bước 7: Báo cáo (Create post-mortem)
- Khi hệ thống ổn định, đội ngũ vận hành tiến hành viết tài liệu Post-mortem (Hậu kiểm sự cố) trong vòng 24-48 giờ.
