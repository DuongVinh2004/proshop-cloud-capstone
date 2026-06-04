# Cloud Capstone Deployment Guide — ProShop MERN

This guide is generated for the ProShop MERN Cloud Capstone project.

## 1. Local run

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
curl -I http://localhost/
curl http://localhost/api/health
```

## 2. EC2 setup

Use Ubuntu 22.04.

Security Group:

| Type | Port | Source |
|---|---:|---|
| SSH | 22 | your IP only |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

Install Docker:

```bash
chmod +x scripts/ec2-install-docker.sh
./scripts/ec2-install-docker.sh
```

Log out and SSH back in.

## 3. Deploy

```bash
cp .env.example .env
nano .env
docker compose up -d --build
docker compose ps
```

Import seed data if the repo supports it:

```bash
docker compose exec backend npm run data:import
```

## 4. HTTPS

Point your domain A record to the EC2 public IP.

```bash
chmod +x scripts/enable-ssl.sh
./scripts/enable-ssl.sh your-domain.com your-email@example.com
curl -I https://your-domain.com
```

## 5. Monitoring

Grafana path:

```text
https://your-domain.com/grafana/
```

Prometheus is internal. Use Grafana datasource:

```text
http://prometheus:9090
```

Loki datasource:

```text
http://loki:3100
```

## 6. Load test

```bash
chmod +x scripts/simulate-ddos.sh
./scripts/simulate-ddos.sh https://your-domain.com/ 5000 200
```

## 7. Evidence

Store proof under:

```text
evidence/
```

Required screenshots:

- Website HTTPS.
- AWS Security Group.
- Docker Compose PS.
- Prometheus targets.
- Grafana dashboard.
- Loki LogQL.
- Telegram alert.
- Apache Benchmark output.
- Post-mortem.
