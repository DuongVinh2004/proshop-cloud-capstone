# EC2 Deployment Guide

## 1. Prerequisites
- An AWS EC2 instance running Ubuntu 22.04 LTS or 24.04 LTS.
- **Security Group**: Ensure your AWS Security Group ONLY opens the following ports:
  - `22` (SSH) - ideally restricted to your personal IP.
  - `80` (HTTP) - open to 0.0.0.0/0.
  - `443` (HTTPS) - open to 0.0.0.0/0.

## 2. Connect and Prepare
1. SSH into your EC2 instance:
   ```bash
   ssh -i "your-key.pem" ubuntu@<EC2_PUBLIC_IP>
   ```
2. Clone the repository and navigate into it.

## 3. Install Docker
Run the provided script to install Docker and Docker Compose:
```bash
bash scripts/ec2-install-docker.sh
```
*Note: You may need to log out and log back in for the docker group permissions to take effect.*

## 4. Environment Configuration
Copy the environment template and modify it with your real secrets:
```bash
cp .env.example .env
nano .env
```
Ensure you change database passwords, JWT secrets, Telegram tokens, and Grafana admin passwords.

## 5. Deployment
Build and start the application in detached mode:
```bash
docker compose up -d --build
```

## 6. Verification
Verify that the services are running:
```bash
docker compose ps
curl http://localhost/api/health
```
