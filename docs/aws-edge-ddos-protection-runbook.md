# AWS Edge DDoS Protection Runbook

Tài liệu này cung cấp thiết kế kiến trúc bảo mật Layer 7 trên AWS (CloudFront + WAF + Shield Standard) dành cho hệ thống ProShop MERN.
**CẢNH BÁO:** Tài liệu này CHỈ mang tính chất thiết kế blueprint. KHÔNG tự ý triển khai tài nguyên tự động nhằm tránh phát sinh chi phí hoặc gián đoạn hệ thống hiện tại.

---

## 1. CloudFront Behaviors (Kiến trúc Caching & Định tuyến)

CloudFront đóng vai trò là CDN và Reverse Proxy toàn cầu, giúp giảm thiểu tải cho origin EC2 và hấp thụ các cuộc tấn công volumetric cơ bản.

### Chi tiết cấu hình Behaviors:

1. **Static Assets (`/images/*`, `/static/*`, v.v.)**
   - **Cache Policy:** CachingOptimized (TTL dài).
   - **Origin Request Policy:** Không forward Headers/Cookies/Query Strings (Tối ưu hóa Cache hit ratio).
   - **Mục tiêu:** Offload toàn bộ hình ảnh, JS, CSS cho CloudFront.

2. **Frontend HTML (`/`)**
   - **Cache Policy:** CachingOptimized (TTL ngắn - vd 1 phút) hoặc Managed-CachingOptimized.
   - **Origin Request Policy:** Không forward Headers/Cookies.
   - **Mục tiêu:** Phục vụ React SPA nhanh nhất có thể.

3. **General API (`/api/*`)**
   - **Cache Policy:** CachingDisabled (Tuyệt đối không cache API động).
   - **Origin Request Policy:** AllViewer (Forward toàn bộ Header như `Authorization`, Cookies, và Query Strings).
   - **Mục tiêu:** Đảm bảo Authentication (JWT) và giỏ hàng không bị hỏng.

4. **Login API (`/api/users/login`) & Order API (`/api/orders`)**
   - **Cache Policy:** CachingDisabled.
   - **Origin Request Policy:** AllViewer.
   - **Mục tiêu:** Endpoint nhạy cảm cần được đưa vào luồng kiểm tra gắt gao nhất của WAF.

5. **Grafana (`/grafana/*`)**
   - **Cache Policy:** CachingDisabled.
   - **Origin Request Policy:** AllViewer.
   - **Mục tiêu:** Hỗ trợ WebSocket và Authentication nội bộ của Grafana. Có thể hạn chế truy cập bằng WAF IP whitelist.

---

## 2. AWS WAF Web ACL (Bảo vệ Layer 7)

WAF sẽ được đính kèm vào CloudFront distribution.
**QUY TẮC TRIỂN KHAI:** Ban đầu luôn đặt mọi Rule ở chế độ **`Count`** (Quan sát) để đo đạc baseline, sau 1-2 tuần không có False Positive (chặn nhầm) mới chuyển sang **`Block`**.

### Đề xuất Rules:
1. **AWS Managed - Common Rule Set:** Chặn OWASP Top 10 cơ bản (XSS, SQLi).
2. **AWS Managed - Known Bad Inputs:** Chặn các dấu hiệu exploit đã biết, Log4j, Java deserialization.
3. **AWS Managed - IP Reputation List:** Tự động chặn các IP thuộc Botnet, Proxy ẩn danh được AWS tình báo.
4. **Custom Rate-based Rule (Global):** Limit 2000 req / 5 phút (chế độ Block/Count tùy baseline).
5. **Custom Rate-based Rule (Login):** Nhắm vào URI `/api/users/login` (Limit 100 req / 5 phút) để chống Brute-force/Credential Stuffing.
6. **Custom Rate-based Rule (Order):** Nhắm vào URI `/api/orders` để chống lạm dụng tạo đơn hàng giả.

---

## 3. WAF Logging

Ghi log toàn bộ traffic bị WAF quét để phục vụ điều tra (SOC).

- **Đích đến:** Amazon CloudWatch Logs (dễ search) hoặc Amazon S3 (tiết kiệm chi phí lưu trữ dài hạn).
- **Retention Policy:** CloudWatch (Giữ 14 ngày), S3 (Glacier sau 30 ngày).
- **Cost Warning:** WAF Logs sinh ra lượng dữ liệu khổng lồ trong lúc bị DDoS, cân nhắc kỹ phí lưu trữ CloudWatch (~$0.50/GB). S3 rẻ hơn nhiều.
- **Redaction (Che dấu dữ liệu):** Phải cấu hình WAF Redaction loại bỏ trường `Authorization`, `cookie` và các trường nhạy cảm khỏi log để tuân thủ bảo mật.

---

## 4. CloudFront Access Logs

Cung cấp thông tin truy cập tại Edge (trước khi tới WAF).
- **Cấu hình:** Đẩy log dưới dạng Parquet hoặc GZIP thẳng vào S3 bucket.
- **Các trường bắt buộc:** Request time, request path, response status, processing time, viewer IP.
- **Cost warning:** S3 Storage tốn phí, nhưng rẻ. Cần set Lifecycle Rule tự xóa sau 30 ngày.
- **Truy vết bằng Athena:**
  ```sql
  -- Query mẫu tìm Top 10 IP đang spam CloudFront
  SELECT request_ip, count(*) as req_count
  FROM cloudfront_logs
  WHERE date = current_date
  GROUP BY request_ip
  ORDER BY req_count DESC
  LIMIT 10;
  ```

---

## 5. Origin Restriction (Khóa chặt Nginx)

Nếu hacker biết trực tiếp IP của EC2 (18.140.56.112), họ sẽ bỏ qua (bypass) toàn bộ CloudFront và WAF. Do đó phải hạn chế truy cập trực tiếp vào Origin.

### Phương án A: CloudFront VPC Origin (Khuyến nghị cho Enterprise)
- **Kiến trúc:** CloudFront -> VPC Origin -> Private EC2 (Không có Public IP).
- **Đánh giá:** An toàn tuyệt đối, AWS tự quản lý đường hầm mạng. Nhược điểm: Phải thiết kế lại kiến trúc VPC, Subnet, đòi hỏi thời gian migration lớn, không phù hợp để áp dụng nóng vào EC2 hiện tại.

### Phương án B: Public Origin có kiểm soát (Khuyến nghị cho Đồ án)
- **Kiến trúc:** EC2 vẫn có Public IP, nhưng Security Group và Nginx sẽ chặn sạch.
- **Managed Prefix List:** Cấu hình Security Group EC2 chỉ cho phép Inbound HTTP/HTTPS từ `com.amazonaws.global.cloudfront.origin-facing`.
- **Rủi ro SG Quota:** Prefix list của CloudFront chứa rất nhiều IP, có thể vượt quá Quota giới hạn rule của Security Group.
- **Custom Origin Header:** Cấu hình CloudFront gửi thêm header bảo mật (vd: `X-ProShop-Origin-Token: <SECRET>`). Tại Nginx, cấu hình kiểm tra:
  ```nginx
  if ($http_x_proshop_origin_token != "<SECRET>") {
      return 444; # Đóng kết nối nếu không có token (bị bypass)
  }
  ```
- **Kế hoạch Rollback:** Nếu CloudFront lỗi, chỉ cần tắt rule kiểm tra Header trong Nginx và mở lại Security Group cho `0.0.0.0/0` để phục hồi truy cập trực tiếp.

---

## 6. AWS Shield Standard

**AWS Shield Standard** là lớp bảo vệ DDoS hạ tầng được AWS bật tự động, hoàn toàn miễn phí cho tất cả khách hàng. Nó tự động chặn các cuộc tấn công DDoS ở Layer 3 và Layer 4 (SYN Flood, UDP Reflection).

- **Phù hợp cho đồ án:** Đủ để ngăn chặn các vụ đánh sập mạng cơ bản.
- **Không đề xuất Shield Advanced:** Có phí cố định ~$3,000/tháng, chỉ dành cho các doanh nghiệp lớn cần bảo hiểm tài chính chống DDoS, hoàn toàn vượt ngân sách đồ án capstone.
