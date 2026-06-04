# ProShop MERN - Cloud Capstone Ready

Repo này đã được bổ sung cấu hình để triển khai theo yêu cầu đồ án **Cloud Computing & SRE**:

- Dockerfile riêng cho **Frontend React** và **Backend NodeJS/Express**.
- `docker-compose.yml` chạy đủ **Frontend + Backend + MongoDB** trong mạng nội bộ.
- **Nginx Reverse Proxy** nhận request cổng 80 và điều phối vào container nội bộ.
- Không expose trực tiếp MongoDB `27017` và Backend `5000` ra Internet.
- Có template bật **HTTPS với Certbot/Let's Encrypt**.
- Có stack quan sát hệ thống gồm **Prometheus + Node Exporter + Loki + Promtail + Grafana + AlertManager Telegram**.
- Có dashboard mẫu, alert CPU > 85%, script giả lập tải bằng Apache Benchmark và mẫu post-mortem report.

## Chạy nhanh bằng Docker Compose

```bash
cp .env.example .env
# sửa password/secret trong .env trước khi chạy trên EC2
docker compose up -d --build
```

Seed dữ liệu mẫu:

```bash
docker compose exec backend npm run data:import
```

Truy cập:

```text
http://localhost/
http://localhost/api/health
http://localhost/grafana/
```

Trên EC2, thay `localhost` bằng Public IP hoặc domain.

## Tài liệu đồ án

Đọc hướng dẫn đầy đủ tại:

```text
docs/cloud-capstone.md
```

Mẫu báo cáo post-mortem:

```text
docs/postmortem-template.md
```

## Các lệnh kiểm tra hữu ích

```bash
docker compose ps
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f alertmanager
```

Kiểm tra port public trên EC2:

```bash
sudo ss -tulpn
```

Security Group AWS nên chỉ mở:

```text
22  - chỉ IP cá nhân
80  - Internet
443 - Internet sau khi bật SSL
```

Không mở: `27017`, `5000`, `3000`, `9090`, `9093`, `3100`, `9100`.

---

# ProShop eCommerce Platform

> eCommerce platform built with the MERN stack & Redux.

### THIS PROJECT IS DEPRECATED
This project is no longer supported. The new project/course has been released. The code has been cleaned up and now uses Redux Toolkit. You can find the new version [HERE](https://github.com/bradtraversy/proshop-v2)

![screenshot](https://github.com/bradtraversy/proshop_mern/blob/master/uploads/Screen%20Shot%202020-09-29%20at%205.50.52%20PM.png)

## Features

- Full featured shopping cart
- Product reviews and ratings
- Top products carousel
- Product pagination
- Product search feature
- User profile with orders
- Admin product management
- Admin user management
- Admin Order details page
- Mark orders as delivered option
- Checkout process (shipping, payment method, etc)
- PayPal / credit card integration
- Database seeder (products & users)

## Note on Issues
Please do not post issues here that are related to your own code when taking the course. Add those in the Udemy Q/A. If you clone THIS repo and there are issues, then you can submit

## Usage

### ES Modules in Node

We use ECMAScript Modules in the backend in this project. Be sure to have at least Node v14.6+ or you will need to add the "--experimental-modules" flag.

Also, when importing a file (not a package), be sure to add .js at the end or you will get a "module not found" error

You can also install and setup Babel if you would like

### Env Variables

Create a .env file in then root and add the following

```
NODE_ENV = development
PORT = 5000
MONGO_URI = your mongodb uri
JWT_SECRET = 'abc123'
PAYPAL_CLIENT_ID = your paypal client id
```

### Install Dependencies (frontend & backend)

```
npm install
cd frontend
npm install
```

### Run

```
# Run frontend (:3000) & backend (:5000)
npm run dev

# Run backend only
npm run server
```

## Build & Deploy

```
# Create frontend prod build
cd frontend
npm run build
```

There is a Heroku postbuild script, so if you push to Heroku, no need to build manually for deployment to Heroku

### Seed Database

You can use the following commands to seed the database with some sample users and products as well as destroy all data

```
# Import data
npm run data:import

# Destroy data
npm run data:destroy
```

```
Sample User Logins

admin@example.com (Admin)
123456

john@example.com (Customer)
123456

jane@example.com (Customer)
123456
```


## License

The MIT License

Copyright (c) 2020 Traversy Media https://traversymedia.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
