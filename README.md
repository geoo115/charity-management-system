# 🏥 Charity Management System

A comprehensive full-stack application for managing charity operations, built with **Go (Gin)** backend and **Next.js** frontend.

## 💡 The Story Behind This System

While volunteering with Lewisham Donation Hub, I witnessed firsthand the operational challenges charities face. Staff were managing donations through spreadsheets, volunteer coordination was handled via WhatsApp groups, and donors had no visibility into their impact.

But the most impactful problem I observed was the visitor experience itself. People seeking help had to wait in long queues without knowing if they were eligible for services, often spending hours only to be turned away. There was no fair, transparent system for managing demand or ensuring equitable access to support.

I saw an opportunity to use technology to solve real human problems. The technical challenge wasn't just building a scalable system - it was understanding the nuanced workflows of charity operations and translating them into intuitive software that restores dignity to people in vulnerable situations.

**Real-world challenges that shaped the architecture:**
- **Donation tracking** had to handle both monetary and in-kind donations, with different workflows for each
- **Volunteer scheduling** needed to account for background check requirements and safeguarding policies
- **Visitor management system** needed to pre-qualify eligibility and provide time-slot booking, eliminating degrading queues while ensuring fair, transparent access to services
- **Real-time notifications** weren't just a cool technical feature - they were essential for coordinating emergency response to vulnerable individuals and keeping people informed about their appointment status without requiring them to wait physically
- **Comprehensive observability** was architected because downtime isn't just inconvenient for a charity - it could mean someone doesn't get the help they need when they're most vulnerable

This system transforms manual, error-prone processes into streamlined digital workflows that let charity staff focus on what matters most: helping people in their community with dignity and respect.

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

## � Documentation

**📖 [Complete Documentation Hub](./docs/README.md)** - Comprehensive guide to all documentation

### Quick Reference
- **[API Documentation](./docs/backend/API_DOCUMENTATION.md)** - Complete API reference and examples
- **[User Workflows](./docs/workflows/)** - Guides for admins, volunteers, donors, and visitors  
- **[Architecture Guide](./docs/backend/ARCHITECTURE.md)** - System design and code structure
- **[Performance Results](./docs/performance/FINAL_PERFORMANCE_RESULTS.md)** - Real measured performance data
- **[Deployment Guide](./docs/performance/PRODUCTION_RECOMMENDATIONS.md)** - Production deployment best practices

## �📱 Live Demo

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

The system includes a comprehensive monitoring stack with real performance validation:

```bash
# Start full observability stack
make observability-setup
```

**Monitoring Services:**
- **[Prometheus](http://localhost:9090)** - Metrics collection and alerting
- **[Grafana](http://localhost:3001)** - Dashboards and visualization (admin/admin123)
- **[Jaeger](http://localhost:16686)** - Distributed tracing and debugging
- **[AlertManager](http://localhost:9093)** - Alert management and notifications

**Performance Verified:**
- **0.65ms median response time** - Sub-millisecond performance achieved
- **16.5 req/sec sustained** - Load tested for 5 minutes continuously  
- **4,951 requests processed** - Zero failures under sustained load

📊 **[View Complete Performance Results](./docs/performance/FINAL_PERFORMANCE_RESULTS.md)**

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

### Interactive Documentation
- **[Swagger UI](http://localhost:8080/swagger/index.html)** - Interactive API explorer with live testing
- **[Complete API Guide](./docs/backend/API_DOCUMENTATION.md)** - Detailed endpoints and examples
- **[Architecture Guide](./docs/backend/ARCHITECTURE.md)** - Code structure and design patterns

### Quick Health Checks
- **[Health Check](http://localhost:8080/health)** - Application health status
- **[Metrics Endpoint](http://localhost:8080/metrics)** - Prometheus metrics
- **[Cache Statistics](http://localhost:8080/api/v1/cache/stats)** - Redis performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

- **[📚 Documentation Hub](./docs/README.md)** - Complete documentation organized by topic
- **[🔧 API Reference](./docs/backend/API_DOCUMENTATION.md)** - Swagger UI: [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)
- **[👥 User Guides](./docs/workflows/)** - Workflow guides for all user types
- **[🏗️ Architecture](./docs/backend/ARCHITECTURE.md)** - System design and development guide
- **[📊 Performance Data](./docs/performance/FINAL_PERFORMANCE_RESULTS.md)** - Real performance test results
- **[🚀 Deployment Guide](./docs/performance/PRODUCTION_RECOMMENDATIONS.md)** - Production deployment best practices
- **[🐛 Issues](https://github.com/geoo115/charity-management-system/issues)** - Report bugs or request features

## 🏆 Built With

- **Backend**: Go, Gin, GORM, PostgreSQL, Redis
- **Frontend**: Next.js, React, Tailwind CSS, TypeScript
- **Monitoring**: Prometheus, Grafana, Jaeger
- **Deployment**: Docker, Render
- **Testing**: Vitest, Go testing, k6 load testing

---

**Made with ❤️ for charity organizations and community management** 