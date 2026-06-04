# Báo cáo Hậu kiểm Sự cố (Incident Post-mortem Template)

*Tài liệu này được điền sau khi sự cố đã được giải quyết hoàn toàn nhằm phân tích nguyên nhân và cải thiện hệ thống, không dùng để đổ lỗi (Blameless Culture).*

## 1. Tóm tắt sự cố (Incident Summary)
- **Tên sự cố:** [Ví dụ: HTTP Flood nhắm vào trang Login]
- **Ngày xảy ra:** [YYYY-MM-DD]
- **Tác giả báo cáo:** [Tên/Đội ngũ]
- **Thời gian Downtime:** [Ví dụ: 15 phút]

## 2. Dòng thời gian (Timeline)
- **10:00 AM:** Cảnh báo Telegram nổ (NginxHighRequestRate).
- **10:02 AM:** Đội ngũ trực vào Grafana, xác nhận CPU tăng lên 99%.
- **10:05 AM:** Xác định được IP `X.X.X.X` đang spam `/api/users/login` qua Loki.
- **10:10 AM:** Điều chỉnh Rate Limit Nginx / Bật AWS WAF rule.
- **10:15 AM:** Traffic trở lại bình thường. Đóng Incident.

## 3. Mức độ ảnh hưởng (Impact)
- **Đối với Khách hàng:** Khách hàng không thể đăng nhập hoặc xem sản phẩm trong 15 phút.
- **Đội ngũ:** Mất 2 nhân sự trực (On-call) để phân tích sự cố.

## 4. Cách thức phát hiện (Detection)
Sự cố được phát hiện qua hệ thống Prometheus AlertManager (Rule: `NginxHighRequestRate`) và được đẩy qua Telegram.

## 5. Nguyên nhân gốc rễ (Root Cause)
Một botnet đã nhắm vào endpoint `/api/users/login` do endpoint này xử lý tính toán băm mật khẩu (Bcrypt) nặng, khiến CPU của Backend bị vắt kiệt.

## 6. Các yếu tố góp phần (Contributing Factors)
- Cấu hình Rate Limit cũ ở mức quá lỏng lẻo đối với trang Login.
- AWS WAF chưa được bật ở chế độ Block đối với rule Rate-Based.

## 7. Giải pháp giảm thiểu đã áp dụng (Mitigation)
- Nginx đã tự động drop các connection dư thừa (Limit Conn).
- Đội ngũ đã giảm `login_req_limit` xuống 2 req/s.

## 8. Trạng thái phục hồi (Recovery)
Hệ thống tự phục hồi sau khi IP độc hại ngừng tấn công hoặc bị WAF chặn hoàn toàn.

## 9. Bằng chứng (Evidence)
- *Đính kèm ảnh chụp màn hình Grafana SOC Dashboard (Biểu đồ Active Connections).*
- *Đính kèm Loki LogQL Query snippet.*

## 10. Bài học rút ra (Lessons Learned)
- Không thể tin tưởng 100% vào Nginx Rate Limit cho chống DDoS quy mô lớn, vì xử lý kết nối vẫn tốn CPU tại EC2.
- Dashboard SOC đã phát huy cực kỳ hiệu quả trong việc tìm ra IP và URI bị đánh trong vòng chưa tới 1 phút.

## 11. Hành động phòng ngừa (Preventive Actions)
| Hành động | Người phụ trách | Deadline | Trạng thái |
| :--- | :--- | :--- | :--- |
| Đưa AWS WAF vào áp dụng (Chế độ Block) | DevOps Team | [Date] | TODO |
| Chuyển CloudFront Cache Policy cho Frontend | Cloud Team | [Date] | TODO |

## 12. Rủi ro còn tồn đọng (Remaining Risks)
Hệ thống hiện tại vẫn đang public trực tiếp IP EC2, nếu kẻ tấn công biết IP này, họ có thể bypass CloudFront/WAF. Cần lộ trình áp dụng Origin Restriction (Security Group Prefix List).
