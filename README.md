# 🏥 Charity Management System

A full-stack platform for managing charity operations, built with **Go (Gin)** and **Next.js**.
Designed to help charities move beyond spreadsheets and ad-hoc tools, with features for visitors, donors, volunteers, and staff.

---

## 💡 Why This System Exists

While volunteering with [Lewisham Donation Hub](https://lewishamdonationhub.org/), I saw how fragmented processes hurt both staff and visitors:

* Donations tracked in spreadsheets with no donor visibility
* Volunteers coordinated through WhatsApp groups with no scheduling system
* Visitors waiting in long queues, often hours, only to learn they were ineligible

This system was built to **restore dignity and efficiency**:

* 📦 Donations tracked transparently (monetary + in-kind)
* 🙋 Volunteers scheduled fairly with safeguarding checks
* 👥 Visitors pre-qualified and booked into time slots (no degrading queues)
* 📊 Staff supported by real-time dashboards and notifications

The mission: reduce waiting times from hours to minutes, and let staff focus on what matters — **helping people in need**.

---

## 🌟 Features

### 👥 User Roles

* **Visitors** – Check-in, help requests, eligibility assessment
* **Donors** – Donation tracking, impact reports, recognition
* **Volunteers** – Shift scheduling, application tracking, performance metrics
* **Staff** – Administrative controls, system oversight

### 📊 Core Functionality

* Donation management (monetary + in-kind)
* Volunteer coordination and shift scheduling
* Help request + ticket management
* Real-time dashboards & analytics
* Secure document management
* Notifications and messaging

### 🔧 Technical Features

* **Authentication** – JWT + role-based access control
* **Real-time** – WebSocket notifications
* **Performance** – Redis caching
* **Search** – Advanced filtering
* **Responsive** – Mobile-first, accessible UI
* **Documentation** – Swagger/OpenAPI

---

## 🏗️ Architecture

```
├── backend/          # Go (Gin) API server
│   ├── cmd/          # Entry points
│   ├── internal/     # Application code
│   ├── docs/         # API docs
│   └── migrations/   # Database migrations
├── frontend/         # Next.js React app
│   ├── app/          # App router pages
│   ├── components/   # Reusable UI components
│   └── lib/          # Utilities & API clients
└── monitoring/       # Observability stack
```

---

## 🚀 Quick Start

### Prerequisites

* **Docker** and **Docker Compose**
* **Go 1.21+** (local backend dev)
* **Node.js 18+** (local frontend dev)
* **PostgreSQL** + **Redis**

### 🐳 Docker Setup (recommended)

```bash
git clone https://github.com/geoo115/charity-management-system.git
cd charity-management-system

docker-compose up -d
```

Services:

* Frontend → [http://localhost:3000](http://localhost:3000)
* Backend API → [http://localhost:8080](http://localhost:8080)
* Swagger → [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

### 🛠️ Local Development

```bash
# Infrastructure
make services-up

# Backend
cd backend && make run

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## 📖 Documentation

* [📚 Docs Hub](./docs/README.md) – Complete documentation
* [🧩 API Reference](./docs/backend/API_DOCUMENTATION.md) – Endpoints + examples
* [🛠️ Architecture Guide](./docs/backend/ARCHITECTURE.md) – Design & patterns
* [📊 Performance Results](./docs/performance/FINAL_PERFORMANCE_RESULTS.md) – Load testing data
* [🚀 Deployment Guide](./docs/performance/PRODUCTION_RECOMMENDATIONS.md) – Production best practices

---

## 📊 Monitoring & Observability

Start full observability stack:

```bash
make observability-setup
```

Includes:

* **Prometheus** – Metrics ([http://localhost:9090](http://localhost:9090))
* **Grafana** – Dashboards ([http://localhost:3001](http://localhost:3001))
* **Jaeger** – Distributed tracing ([http://localhost:16686](http://localhost:16686))
* **AlertManager** – Alerts ([http://localhost:9093](http://localhost:9093))

Performance validation results are available in [docs/performance](./docs/performance/).

---

## 🧪 Testing

```bash
# Backend tests
cd backend
make test
make test-coverage

# Frontend tests
cd frontend
npm run test
npm run test:coverage

# Load testing
make load-test
```

---

## 🔧 Deployment

### Render (One-Click Deploy)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Manual steps:

1. Fork this repo
2. Connect to [Render](https://render.com)
3. Create new “Blueprint”
4. Deploy with `render.yaml`

Detailed instructions → [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/new-feature`)
3. Commit (`git commit -m "Add new feature"`)
4. Push & open PR

👉 See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, linting, and test requirements.

---

## 📄 License

MIT License – see [LICENSE](LICENSE).

---

## 🏆 Built With

* **Backend** – Go, Gin, GORM, PostgreSQL, Redis
* **Frontend** – Next.js, React, Tailwind, TypeScript
* **Monitoring** – Prometheus, Grafana, Jaeger
* **Deployment** – Docker, Render
* **Testing** – Go test, Vitest, k6 load testing

---

**Made with ❤️ for charity organizations and community management.**
