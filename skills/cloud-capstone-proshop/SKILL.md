# Skill: cloud-capstone-proshop

## Purpose

Use this skill when working on the ProShop MERN Cloud Capstone deployment.

The agent must transform a normal ProShop MERN repository into a cloud-ready deployment package with:

- Dockerized backend.
- Dockerized frontend.
- MongoDB internal container.
- Nginx reverse proxy.
- HTTPS with Certbot.
- EC2 deployment docs/scripts.
- Prometheus + Node Exporter.
- Grafana dashboard.
- Loki + Promtail logging.
- AlertManager Telegram alerting.
- DDoS/load simulation script.
- Post-mortem template and evidence checklist.

## Trigger

Use this skill whenever the task mentions:

- ProShop MERN
- Cloud Capstone
- AWS EC2 deployment
- Docker Compose
- Nginx reverse proxy
- MongoDB internal network
- Prometheus/Grafana/Loki/AlertManager
- Telegram alert
- Apache Benchmark / DDoS simulation
- post-mortem

## Non-negotiable rules

1. Never expose MongoDB port `27017` to the Internet.
2. Never expose backend port `5000` to the Internet in production Compose.
3. Never expose frontend dev port `3000` to the Internet in production Compose.
4. Only Nginx should publish public ports:
   - `80:80`
   - `443:443`
5. Never commit `.env`, private keys, real Telegram tokens, real passwords, or AWS credentials.
6. Do not use React development server as production frontend.
7. Do not hardcode `localhost` in frontend production API calls if the browser must call `/api`.
8. Do not open AWS Security Group `All Traffic`.
9. Do not claim completion without running verification commands.
10. Work in small batches and update `ANTIGRAVITY_CLOUD_CAPSTONE_PLAN.md`.

## Repository assumptions

Common ProShop MERN layout:

```text
.
├── backend/
│   ├── server.js
│   ├── package.json
│   └── config/
├── frontend/
│   ├── package.json
│   └── src/
├── package.json
└── README.md
```

Common ports:

```text
frontend dev: 3000
backend: 5000
mongo: 27017
nginx: 80/443
prometheus: 9090 internal
loki: 3100 internal
alertmanager: 9093 internal
grafana: 3000 internal, accessed through /grafana/
```

## Preferred architecture

```text
Internet
  |
  v
AWS Security Group: 22 from admin IP, 80/443 public
  |
  v
Nginx container
  |
  +--> frontend container, internal only
  +--> backend container, internal only
          |
          v
        mongo container, internal only
```

Observability:

```text
node-exporter -> prometheus -> grafana
docker/nginx logs -> promtail -> loki -> grafana
prometheus alert rules -> alertmanager -> telegram
```

## Agent execution protocol

### Step 1: Inspect

Run:

```bash
pwd
ls -la
find . -maxdepth 2 -type f | sort | head -200
cat package.json || true
cat backend/package.json || true
cat frontend/package.json || true
sed -n '1,220p' backend/server.js || true
```

### Step 2: Identify package manager

Use:

- `npm ci` if `package-lock.json` exists.
- `npm install` if there is no lock file.
- Do not introduce yarn/pnpm unless repo already uses it.

### Step 3: Make minimal changes

Prefer adding deployment files over rewriting application code.

Allowed application change:

- Add `/api/health`.
- Adjust frontend API base URL to use relative `/api` if production currently hardcodes localhost.

Avoid:

- Rewriting auth/order/payment/product features.
- Changing database models unless deployment cannot work otherwise.

### Step 4: Verify after each batch

Use the relevant commands from `ANTIGRAVITY_CLOUD_CAPSTONE_PLAN.md`.

### Step 5: Update status table

Update the status table after each batch.

## Required files by final state

```text
ANTIGRAVITY_CLOUD_CAPSTONE_PLAN.md
.env.example
docker-compose.yml

backend/Dockerfile
backend/.dockerignore

frontend/Dockerfile
frontend/.dockerignore
frontend/nginx.conf

infra/nginx/conf.d/proshop.conf
infra/nginx/conf.d/proshop.ssl.conf.example

infra/prometheus/prometheus.yml
infra/prometheus/alerts.yml

infra/alertmanager/alertmanager.yml

infra/loki/loki.yml
infra/promtail/promtail.yml

infra/grafana/provisioning/datasources/prometheus.yml
infra/grafana/provisioning/datasources/loki.yml
infra/grafana/provisioning/dashboards/dashboards.yml
infra/grafana/dashboards/node-exporter-overview.json

scripts/ec2-install-docker.sh
scripts/enable-ssl.sh
scripts/simulate-ddos.sh

docs/cloud-capstone-deployment.md
docs/postmortem-template.md
```

## Verification command set

### Static checks

```bash
node --check backend/server.js
docker compose config
bash -n scripts/ec2-install-docker.sh
bash -n scripts/enable-ssl.sh
bash -n scripts/simulate-ddos.sh
```

### Build checks

```bash
docker compose build
docker compose up -d
docker compose ps
```

### Runtime checks

```bash
curl -I http://localhost/
curl http://localhost/api/health
docker compose logs --tail=100 backend
docker compose logs --tail=100 nginx
```

### Observability checks

```bash
docker compose exec prometheus wget -qO- http://node-exporter:9100/metrics | head
docker compose logs --tail=100 promtail
docker compose logs --tail=100 alertmanager
```

### Security checks

Inspect `docker-compose.yml`; public ports must only be Nginx 80/443.

Bad:

```yaml
ports:
  - "27017:27017"
  - "5000:5000"
  - "3000:3000"
```

Good:

```yaml
nginx:
  ports:
    - "80:80"
    - "443:443"
```

## Nginx rules

Required routing:

```text
/           -> frontend:80
/api/       -> backend:5000/api/
/uploads/   -> backend:5000/uploads/
/grafana/   -> grafana:3000/
```

Recommended headers:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Basic security headers for HTTPS server:

```nginx
add_header X-Frame-Options SAMEORIGIN always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
```

## Frontend API rule

In production, frontend should call relative API paths:

```text
/api/products
/api/users/login
/api/orders
```

Avoid browser calls to:

```text
http://localhost:5000
http://backend:5000
```

`backend:5000` is only resolvable inside Docker network, not in the user's browser.

## Alert rule

CPU alert:

```yaml
- alert: HighCPUUsage
  expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100) > 85
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "CPU usage is above 85%"
    description: "EC2 CPU usage has been above 85% for more than 1 minute."
```

## Loki / LogQL examples

Nginx logs:

```logql
{job="nginx"}
```

ProShop containers:

```logql
{container=~".*proshop.*"}
```

Backend errors:

```logql
{container=~".*backend.*"} |= "error"
```

High request activity:

```logql
count_over_time({job="nginx"}[1m])
```

## Post-mortem quality bar

A good post-mortem must contain:

- Incident summary.
- Timeline.
- Detection source.
- Impact.
- Root cause.
- Evidence:
  - ab result.
  - Grafana screenshot.
  - Telegram alert screenshot.
  - Loki query screenshot.
- Mitigation:
  - rate limit or IP block.
- Prevention:
  - Nginx rate limit.
  - WAF/CloudFront.
  - more alert rules.
  - capacity plan.

## Common mistakes and fixes

### Nginx 502 Bad Gateway

Check:

```bash
docker compose ps
docker compose logs --tail=100 backend
```

Likely causes:

- Backend crashed.
- Wrong service name.
- Wrong port.
- Backend cannot connect MongoDB.

### Backend cannot connect MongoDB

Use:

```env
MONGO_URI=mongodb://mongo:27017/proshop
```

Do not use `localhost` inside backend container.

### Frontend blank page

Check:

```bash
docker compose logs --tail=100 frontend
```

Likely causes:

- Wrong build output path: `build` vs `dist`.
- Frontend is calling `localhost:5000`.
- SPA Nginx config missing `try_files $uri /index.html`.

### Certbot fails

Check:

- Domain A record points to EC2 public IP.
- Port 80 open.
- Nginx serves `/.well-known/acme-challenge/`.
- No Cloudflare proxy interference unless configured correctly.

### Telegram alert not sent

Check:

- Bot token.
- Chat ID.
- AlertManager config loaded.
- Prometheus alert is firing.
- AlertManager logs.

## Final response format for Agent

After each batch, report:

```text
Batch completed: <number/name>

Intent:
- ...

Changed files:
- ...

Verification run:
- command: result
- command: result

Remaining risks:
- ...

Next batch:
- ...
```
