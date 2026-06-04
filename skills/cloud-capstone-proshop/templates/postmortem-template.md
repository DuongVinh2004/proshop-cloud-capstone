# ProShop Cloud Capstone — Incident Post-mortem

## 1. Incident Summary

- Date/time:
- System:
- Detected by:
- Severity:
- Short summary:

## 2. Timeline

| Time | Event |
|---|---|
| HH:MM | Load test started |
| HH:MM | CPU crossed 85% |
| HH:MM | Telegram alert received |
| HH:MM | Grafana checked |
| HH:MM | Loki/LogQL used to inspect logs |
| HH:MM | Suspicious IP/request pattern identified |
| HH:MM | Mitigation applied |
| HH:MM | System recovered |

## 3. Detection

- Prometheus alert:
- AlertManager notification:
- Grafana dashboard evidence:
- Loki query evidence:

## 4. Impact

- User-facing impact:
- API impact:
- Database impact:
- Duration:
- Data loss: Yes/No

## 5. Root Cause

- Direct cause:
- Contributing factors:
- Missing protection:

## 6. Evidence

### Apache Benchmark

```text
Paste ab result here.
```

### Grafana

- Screenshot path:

### Telegram

- Screenshot path:

### Loki / LogQL

Query used:

```logql
{job="nginx"}
```

Finding:

```text
Describe suspicious request/IP pattern.
```

## 7. Mitigation

- Immediate action:
- IP block/rate limit:
- Service restart if any:

## 8. Prevention

- Nginx rate limiting:
- AWS WAF/CloudFront:
- More alerts:
- Backup/restore:
- Capacity planning:

## 9. Lessons Learned

- What worked:
- What did not work:
- What to improve before production:
