# 🏥 Charity Management System

A comprehensive full-stack application for managing charity operations, built with **Go (Gin)** backend and **Next.js** frontend.

## 🌟 Features

### 👥 **User Management**
- **Visitors**: Check-in, help requests, eligibility checking
- **Donors**: Donation tracking, impact reports, recognition system
- **Volunteers**: Shift management, application tracking, performance metrics
- **Staff**: Administrative controls, user management, system oversight

### 📊 **Core Functionality**
- **Donation Management**: Monetary and in-kind donation tracking
- **Volunteer Coordination**: Shift scheduling, flexible time management
- **Help Request System**: Ticket management, priority handling
- **Analytics Dashboard**: Real-time metrics and reporting
- **Document Management**: Secure file handling and storage
- **Communication System**: Notifications, templates, and messaging

### 🔧 **Technical Features**
- **Authentication**: JWT-based with role-based access control
- **Real-time Updates**: WebSocket integration for live notifications
- **Caching**: Redis for improved performance
- **Search**: Advanced filtering and search capabilities
- **Responsive Design**: Mobile-first UI with accessibility features
- **API Documentation**: Swagger/OpenAPI integration

## 🏗️ Architecture

```
├── backend/          # Go (Gin) API server
│   ├── cmd/          # Application entry points
│   ├── internal/     # Private application code
│   ├── docs/         # API documentation
│   └── migrations/   # Database migrations
├── frontend/         # Next.js React application
│   ├── app/          # App router pages
│   ├── components/   # Reusable UI components
│   └── lib/          # Utilities and API clients
└── monitoring/       # Observability stack
```

## 🚀 Quick Start

### Prerequisites
- **Docker** and **Docker Compose**
- **Go 1.21+** (for local development)
- **Node.js 18+** (for local development)
- **PostgreSQL** and **Redis**

### 🐳 Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/geoo115/charity-management-system.git
cd charity-management-system

# Start all services
docker-compose up -d

# Your application will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# API Documentation: http://localhost:8080/swagger/index.html
```

### 🛠️ Local Development

```bash
# Start infrastructure services
make services-up

# Start backend
cd backend
make run

# Start frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## 📱 Live Demo

**🌐 [View Live Application](https://lewisham-charity-hub.onrender.com)**

*Deployed on Render with free hosting*

### Demo Accounts
- **Admin**: `admin@charity.org` / `admin123`
- **Volunteer**: `volunteer@charity.org` / `volunteer123`
- **Donor**: `donor@charity.org` / `donor123`

## 🔧 Deployment

### Render (One-Click Deploy)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Or manually:
1. Fork this repository
2. Connect to [Render](https://render.com)
3. Create new "Blueprint"
4. Deploy automatically with `render.yaml`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📊 Monitoring & Observability

Comprehensive monitoring stack included:

```bash
# Start full observability stack
make observability-setup
```

**Monitoring Services:**
- **Prometheus**: http://localhost:9090 (Metrics)
- **Grafana**: http://localhost:3001 (Dashboards) 
- **Jaeger**: http://localhost:16686 (Tracing)
- **AlertManager**: http://localhost:9093 (Alerts)

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

## 📚 API Documentation

- **Swagger UI**: [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)
- **Health Check**: [http://localhost:8080/health](http://localhost:8080/health)
- **Metrics**: [http://localhost:8080/metrics](http://localhost:8080/metrics)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/geoo115/charity-management-system/issues)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🏆 Built With

- **Backend**: Go, Gin, GORM, PostgreSQL, Redis
- **Frontend**: Next.js, React, Tailwind CSS, TypeScript
- **Monitoring**: Prometheus, Grafana, Jaeger
- **Deployment**: Docker, Render
- **Testing**: Vitest, Go testing, k6 load testing

---

**Made with ❤️ for charity organizations and community management** 