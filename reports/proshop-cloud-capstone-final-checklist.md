# ProShop MERN Cloud Capstone - Final Checklist

## Thông tin triển khai

- EC2 Instance: proshop-cloud-capstone
- Operating System: Ubuntu 24.04
- Domain: https://proshopvphht.duckdns.org
- Grafana: https://proshopvphht.duckdns.org/grafana/
- Deployment Model: AWS EC2 Public Cloud
- Application Architecture: React Frontend, NodeJS Backend, MongoDB Database
- Container Orchestration: Docker Compose
- Public Entry Point: Nginx Reverse Proxy

## Checklist yêu cầu bắt buộc

| Hạng mục | Trạng thái | Evidence |
|---|---|---|
| Frontend, Backend và MongoDB chạy bằng Docker Compose | PASS | docker-packaging-network-evidence.txt |
| Có Dockerfile riêng cho Frontend và Backend | PASS | docker-packaging-network-evidence.txt |
| Chỉ Nginx public cổng 80 và 443 | PASS | security-port-exposure-evidence.txt |
| Backend, MongoDB và monitoring services không public trực tiếp | PASS | security-port-exposure-evidence.txt |
| Nginx Reverse Proxy kết nối nội bộ đến Frontend và Backend | PASS | nginx-reverse-proxy-evidence.txt |
| HTTPS, DuckDNS và Let’s Encrypt hoạt động | PASS | https-web-final.txt, ssl-certificate-info.txt |
| Certbot renew dry-run thành công | PASS | certbot-renew-dry-run-retry-final.txt |
| Prometheus và Node Exporter thu thập metrics | PASS | prometheus-targets-final.json |
| Grafana hiển thị CPU, RAM, Disk, Network, Disk I/O và Logs | PASS | grafana-final-clean-evidence.txt |
| Loki và Promtail thu thập Nginx và Docker logs | PASS | loki-nginx-docker-evidence.txt |
| AlertManager gửi cảnh báo HighCPUUsage qua Telegram | PASS | highcpu-telegram-evidence.txt |
| Hệ thống phục hồi sau CPU stress | PASS | highcpu-recovery-evidence.txt |
| Nginx rate limit hoạt động | PASS | nginx-rate-limit-after-ab-clean-final.txt |
| LogQL truy vết IP gửi nhiều request | PASS | logql-attacker-ip-evidence.txt |
| Website và API hoạt động ổn định | PASS | final-runtime-snapshot.txt |
| Post-mortem đã được tạo | PASS | reports/proshop-cloud-capstone-postmortem.md |

## Evidence chính nên dùng khi trình bày

1. evidence/final-runtime-snapshot.txt
2. evidence/security-port-exposure-evidence.txt
3. evidence/docker-packaging-network-evidence.txt
4. evidence/nginx-reverse-proxy-evidence.txt
5. evidence/grafana-final-clean-evidence.txt
6. evidence/loki-nginx-docker-evidence.txt
7. evidence/highcpu-telegram-evidence.txt
8. evidence/highcpu-recovery-evidence.txt
9. evidence/logql-attacker-ip-evidence.txt
10. reports/proshop-cloud-capstone-postmortem.md

## Kết luận

Dự án ProShop MERN đã được triển khai thành công trên AWS EC2 với Docker Compose, Nginx Reverse Proxy, HTTPS, giám sát metrics, tập trung logs, cảnh báo Telegram, giới hạn request và bộ evidence phục vụ kiểm tra Cloud Capstone.
