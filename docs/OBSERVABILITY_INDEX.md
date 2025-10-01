# Observability Documentation Index

Welcome! This directory contains comprehensive documentation for understanding and using the observability tools (Prometheus, Grafana, and Jaeger) in your charity management system.

## 📚 Documentation Structure

### 1. **OBSERVABILITY_EXPLAINED.md** - Complete Guide
   **Start here if you're new to observability!**
   
   This is a comprehensive, beginner-friendly guide that explains:
   - What Prometheus, Grafana, and Jaeger are
   - How they work (with diagrams and examples)
   - How they're implemented in your codebase
   - Detailed explanations of metrics, traces, and visualization
   
   **Best for:** Understanding concepts, learning how things work
   **Time needed:** 30-45 minutes to read thoroughly

### 2. **OBSERVABILITY_TUTORIAL.md** - Hands-On Tutorial
   **Your practical, step-by-step guide!**
   
   This tutorial walks you through:
   - Accessing Prometheus, Grafana, and Jaeger
   - Running your first queries
   - Creating dashboards
   - Investigating real problems
   - Common debugging scenarios
   
   **Best for:** Learning by doing, practical skills
   **Time needed:** 1-2 hours to complete all exercises

### 3. **OBSERVABILITY_CHEATSHEET.md** - Quick Reference
   **Keep this handy for daily use!**
   
   A quick reference containing:
   - Essential PromQL queries (copy-paste ready)
   - Common Jaeger searches
   - Useful commands
   - Alert thresholds
   - Troubleshooting tips
   
   **Best for:** Daily operations, quick lookups
   **Time needed:** Print it and keep it at your desk!

### 4. **backend/OBSERVABILITY_GUIDE.md** - Technical Implementation
   **For understanding the technical setup**
   
   Technical documentation covering:
   - System architecture
   - Configuration details
   - Deployment setup
   - Load testing procedures
   
   **Best for:** DevOps, system administrators
   **Location:** `/docs/backend/OBSERVABILITY_GUIDE.md`

## 🎯 Quick Start Paths

### Path 1: "I'm New to Observability"
```
1. Read OBSERVABILITY_EXPLAINED.md (focus on the overview sections)
2. Follow OBSERVABILITY_TUTORIAL.md Part 1 & 2
3. Keep OBSERVABILITY_CHEATSHEET.md open while practicing
4. Return to OBSERVABILITY_EXPLAINED.md for deep dives as needed
```

### Path 2: "I Know the Basics, Just Need Practice"
```
1. Skim OBSERVABILITY_EXPLAINED.md (review key concepts)
2. Complete OBSERVABILITY_TUTORIAL.md Parts 1-4
3. Try the real-world scenarios in Part 4
4. Use OBSERVABILITY_CHEATSHEET.md for reference
```

### Path 3: "I Just Need Quick Reference"
```
1. Bookmark OBSERVABILITY_CHEATSHEET.md
2. Review OBSERVABILITY_TUTORIAL.md Part 4 (scenarios)
3. Keep the cheatsheet open in a browser tab
```

### Path 4: "I Need to Set This Up"
```
1. Read backend/OBSERVABILITY_GUIDE.md
2. Follow the setup instructions
3. Use OBSERVABILITY_TUTORIAL.md to verify it's working
4. Create your first dashboard using examples from OBSERVABILITY_EXPLAINED.md
```

## 📊 What Each Tool Does

### Prometheus 📈
**"The Data Collector"**
- Collects numeric metrics from your app
- Stores time-series data
- Provides PromQL query language
- Sends alerts when thresholds are breached

**Your documentation:** Sections in OBSERVABILITY_EXPLAINED.md and cheatsheet queries

### Grafana 📊
**"The Visualizer"**
- Creates beautiful dashboards from Prometheus data
- Provides graphs, gauges, tables, etc.
- Manages alerts and notifications
- Allows team collaboration

**Your documentation:** Tutorial Part 2, example dashboards in `/docs/examples/`

### Jaeger 🔍
**"The Request Tracker"**
- Traces requests through your system
- Shows where time is spent
- Helps debug slow requests
- Identifies bottlenecks

**Your documentation:** Tutorial Part 3, OBSERVABILITY_EXPLAINED.md Jaeger section

## 🗂️ Additional Resources

### Example Files
Located in `/docs/examples/`:
- `prometheus.yml` - Prometheus configuration example
- `prometheus-alerts.yml` - Alert rule examples
- `grafana-dashboard.json` - Dashboard template

### Architecture Diagrams
Located in `/docs/architecture/`:
- `observability-flow.mermaid` - Visual flow diagram

### Your Application Code
Key files to explore:
- `backend/internal/observability/metrics.go` - Metrics definitions
- `backend/internal/observability/tracing.go` - Tracing setup
- `backend/internal/middleware/tracing_middleware.go` - Request tracing
- `backend/internal/routes/metrics_routes.go` - Metrics endpoints

## 🚀 Getting Started (5 Minutes)

1. **Start the services:**
   ```bash
   cd /home/george/Documents/github/charity-management-system
   docker-compose up -d
   ```

2. **Access the UIs:**
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (admin/admin123)
   - Jaeger: http://localhost:16686

3. **Generate some data:**
   ```bash
   curl http://localhost:8080/api/volunteers
   curl http://localhost:8080/metrics
   ```

4. **View your first metric:**
   - Open Prometheus: http://localhost:9090
   - Enter query: `http_requests_total`
   - Click "Execute"

**Congratulations!** You just collected and viewed your first metric! 🎉

Now continue with the full tutorial.

## 📞 Need Help?

### Common Questions

**Q: Which tool should I use to...?**
- Monitor request rates → Prometheus + Grafana
- Debug slow requests → Jaeger
- Check system health → Prometheus + Grafana
- Find where requests are slow → Jaeger
- Create dashboards → Grafana
- Set up alerts → Prometheus + Grafana

**Q: Where do I find...?**
- Metrics endpoint: http://localhost:8080/metrics
- Cache stats: http://localhost:8080/api/v1/cache/stats
- Health check: http://localhost:8080/health/detailed

**Q: How do I...?**
- See all available metrics → http://localhost:9090 (click metrics explorer)
- Create a dashboard → Follow OBSERVABILITY_TUTORIAL.md Part 2
- Find slow requests → Follow OBSERVABILITY_TUTORIAL.md Part 3
- Set up alerts → See examples in `/docs/examples/prometheus-alerts.yml`

## 🎓 Learning Path

### Week 1: Basics
- [ ] Read OBSERVABILITY_EXPLAINED.md overview sections
- [ ] Complete OBSERVABILITY_TUTORIAL.md Parts 1-2
- [ ] Create your first simple dashboard
- [ ] Run some basic PromQL queries

### Week 2: Practice
- [ ] Complete OBSERVABILITY_TUTORIAL.md Parts 3-4
- [ ] Investigate a real slow request using Jaeger
- [ ] Create a business metrics dashboard
- [ ] Set up your first alert

### Week 3: Mastery
- [ ] Deep dive into specific sections of OBSERVABILITY_EXPLAINED.md
- [ ] Create custom dashboards for your team
- [ ] Document common queries for your use cases
- [ ] Set up comprehensive alerting

### Week 4: Production Ready
- [ ] Review all alert thresholds
- [ ] Create runbooks for common issues
- [ ] Train team members
- [ ] Set up notification channels (Slack, email)

## 🎯 Success Metrics

You'll know you've mastered observability when you can:

- [ ] Explain the difference between metrics and traces
- [ ] Write PromQL queries from memory
- [ ] Create a Grafana dashboard in under 10 minutes
- [ ] Use Jaeger to debug a slow request
- [ ] Set up meaningful alerts
- [ ] Correlate metrics and traces to find root causes
- [ ] Teach others on your team

## 🔗 External Resources

### Official Documentation
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Jaeger Docs](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)

### Tutorials & Courses
- [Prometheus Getting Started](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [Grafana Fundamentals](https://grafana.com/tutorials/grafana-fundamentals/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)

## 🤝 Contributing

Found an issue with the documentation? Have suggestions?

1. The docs are all in `/docs/`
2. Feel free to improve them
3. Share your dashboards and queries with the team

## 📅 Maintenance

These docs should be reviewed and updated:
- When adding new metrics
- When changing alert thresholds
- When discovering new useful queries
- After major incidents (add to scenarios)

---

## Quick Navigation

| I want to... | Read this... |
|-------------|--------------|
| Understand concepts | [OBSERVABILITY_EXPLAINED.md](./OBSERVABILITY_EXPLAINED.md) |
| Learn hands-on | [OBSERVABILITY_TUTORIAL.md](./OBSERVABILITY_TUTORIAL.md) |
| Get quick answers | [OBSERVABILITY_CHEATSHEET.md](./OBSERVABILITY_CHEATSHEET.md) |
| Set up infrastructure | [backend/OBSERVABILITY_GUIDE.md](./backend/OBSERVABILITY_GUIDE.md) |
| See architecture | [architecture/observability-flow.mermaid](./architecture/observability-flow.mermaid) |
| Find examples | [examples/](./examples/) |

---

**Happy monitoring!** 🎉

Remember: **The best way to learn is by doing.** Start with the tutorial and experiment!
