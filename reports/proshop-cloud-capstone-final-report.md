# BÁO CÁO TÓM TẮT PROSHOP MERN CLOUD CAPSTONE

## 1. Mục tiêu dự án

Dự án ProShop MERN Cloud Capstone triển khai một ứng dụng thương mại điện tử hoàn chỉnh trên nền tảng AWS EC2. Hệ thống sử dụng kiến trúc gồm React Frontend, NodeJS Backend và MongoDB Database, được đóng gói và vận hành bằng Docker Compose.

Mục tiêu chính của dự án là bảo đảm ứng dụng có thể truy cập ổn định qua Internet, được bảo vệ bằng HTTPS, có khả năng giám sát tài nguyên, tập trung nhật ký, phát hiện sự cố và gửi cảnh báo tự động.

## 2. Kiến trúc triển khai

Hệ thống được triển khai trên EC2 Instance `proshop-cloud-capstone` sử dụng Ubuntu 24.04.

Các thành phần chính gồm:

* Frontend React cung cấp giao diện cho người dùng.
* Backend NodeJS xử lý API và nghiệp vụ.
* MongoDB lưu trữ dữ liệu người dùng, sản phẩm và đơn hàng.
* Nginx làm Reverse Proxy và là điểm truy cập duy nhất từ Internet.
* Prometheus và Node Exporter thu thập metrics hệ thống.
* Grafana trực quan hóa CPU, RAM, Disk, Network, Disk I/O và Logs.
* Loki và Promtail tập trung nhật ký Nginx và Docker container.
* AlertManager gửi cảnh báo qua Telegram.

Website được truy cập qua tên miền:

`https://proshopvphht.duckdns.org`

Grafana được truy cập qua:

`https://proshopvphht.duckdns.org/grafana/`

## 3. Bảo mật hệ thống

Hệ thống chỉ public các cổng cần thiết:

* Cổng 22 dùng cho SSH.
* Cổng 80 dùng cho HTTP và chuyển hướng sang HTTPS.
* Cổng 443 dùng cho HTTPS.

Các dịch vụ nội bộ như Backend, MongoDB, Grafana, Prometheus, Loki, AlertManager và Node Exporter không public trực tiếp ra Internet.

MongoDB chỉ nằm trong Docker network dành cho database. Backend tham gia cả application network và database network để có thể giao tiếp với MongoDB, trong khi các service không cần thiết không thể truy cập trực tiếp database.

Nginx Reverse Proxy định tuyến request đến Frontend, Backend và Grafana. Hệ thống đã được cấu hình SSL/TLS bằng Let’s Encrypt và kiểm tra gia hạn chứng chỉ thành công bằng Certbot dry-run.

Ngoài ra, Nginx được cấu hình rate limit để hạn chế số lượng request bất thường và giảm rủi ro tấn công gây quá tải.

## 4. Giám sát, logging và cảnh báo

Prometheus thu thập metrics từ Node Exporter để theo dõi trạng thái EC2 như CPU, RAM, Disk, Network Traffic và Disk I/O.

Grafana dashboard hiển thị đầy đủ các biểu đồ hệ thống và nhật ký từ Loki.

Promtail thu thập:

* Nginx access log.
* Nginx error log.
* Docker container log.

AlertManager được cấu hình để gửi cảnh báo `HighCPUUsage` qua Telegram khi CPU vượt ngưỡng quy định.

Trong quá trình kiểm thử, hệ thống đã được tạo tải CPU có kiểm soát. Prometheus ghi nhận CPU tăng cao, cảnh báo chuyển sang trạng thái firing và Telegram nhận được thông báo. Sau khi tải kết thúc, CPU trở về mức bình thường, cảnh báo được giải quyết và website vẫn hoạt động ổn định.

## 5. Kiểm thử và evidence

Các nội dung đã được kiểm thử thành công:

* Website HTTPS trả về HTTP 200.
* API health trả về trạng thái `ok`.
* Frontend, Backend, MongoDB và Nginx ở trạng thái healthy.
* Chỉ Nginx public cổng 80 và 443.
* Backend và MongoDB không thể truy cập trực tiếp từ Internet.
* Prometheus và Loki ở trạng thái ready.
* Grafana hiển thị đầy đủ metrics và logs.
* AlertManager gửi cảnh báo Telegram thành công.
* LogQL truy vết được địa chỉ IP gửi nhiều request.
* Nginx rate limit chặn các request vượt ngưỡng.
* Hệ thống không ghi nhận mất dữ liệu sau các bài kiểm thử.

Các evidence chính được lưu trong thư mục:

`/home/ubuntu/apps/proshop/evidence`

Post-mortem được lưu tại:

`/home/ubuntu/apps/proshop/reports/proshop-cloud-capstone-postmortem.md`

## 6. Kết luận

Dự án ProShop MERN Cloud Capstone đã được triển khai thành công trên AWS EC2 với đầy đủ các thành phần ứng dụng, bảo mật, giám sát, logging và cảnh báo.

Hệ thống đáp ứng các yêu cầu chính của bài Cloud Capstone:

* Triển khai ứng dụng bằng Docker Compose.
* Sử dụng Nginx Reverse Proxy.
* Bảo vệ website bằng HTTPS.
* Không public trực tiếp Backend và Database.
* Theo dõi metrics bằng Prometheus và Grafana.
* Tập trung logs bằng Loki và Promtail.
* Gửi cảnh báo tự động qua Telegram.
* Có evidence và Post-mortem phục vụ kiểm tra, đánh giá và trình bày.
