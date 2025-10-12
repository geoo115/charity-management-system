# 🏗️ System Architecture - Portfolio Version

> **Simplified architecture diagram optimized for portfolio presentations**

This diagram shows the complete system architecture in a clear, portfolio-friendly format.

---

## High-Level Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#4A90E2','primaryTextColor':'#fff','primaryBorderColor':'#357ABD','lineColor':'#6C757D','secondaryColor':'#5CB85C','tertiaryColor':'#F0AD4E'}}}%%

graph TB
    %% External Layer
    USER[👤 End Users<br/>Admin · Donors · Volunteers · Visitors]
    
    %% Frontend Layer
    subgraph FRONTEND[" 🎨 Frontend Layer "]
        NEXTJS[Next.js 14 + TypeScript<br/>📱 Responsive UI<br/>🔒 Authentication]
        WS_CLIENT[WebSocket Client<br/>⚡ Real-time Updates]
    end
    
    %% API Gateway
    subgraph GATEWAY[" 🌐 API Gateway "]
        NGINX[Nginx Load Balancer<br/>🛡️ Rate Limiting<br/>🔐 CORS]
    end
    
    %% Backend Services
    subgraph BACKEND[" ⚙️ Backend Services "]
        API[Go + Gin Framework<br/>🚀 High Performance<br/>📊 RESTful API]
        AUTH[JWT Authentication<br/>🔑 Token Management]
        WEBSOCKET[WebSocket Manager<br/>💬 Real-time Notifications]
    end
    
    %% Data Layer
    subgraph DATA[" 💾 Data Layer "]
        POSTGRES[(PostgreSQL 15<br/>📦 Primary Database<br/>15+ Tables)]
        REDIS[(Redis 7<br/>⚡ Cache + Sessions<br/>70% Hit Rate)]
    end
    
    %% Monitoring Stack
    subgraph MONITORING[" 📊 Observability Stack "]
        PROMETHEUS[Prometheus<br/>📈 50+ Metrics<br/>15s Scrape Interval]
        GRAFANA[Grafana<br/>📊 Real-time Dashboards<br/>Alerting]
        JAEGER[Jaeger<br/>🔍 Distributed Tracing<br/>Request Journey]
    end
    
    %% External Services
    subgraph EXTERNAL[" 🌍 External Services "]
        STRIPE[Stripe<br/>💳 Payment Processing]
        EMAIL[SendGrid<br/>📧 Email Notifications]
    end
    
    %% Connections
    USER --> NEXTJS
    NEXTJS --> NGINX
    NGINX --> API
    API --> AUTH
    API --> WEBSOCKET
    API --> POSTGRES
    API --> REDIS
    API --> STRIPE
    API --> EMAIL
    
    WS_CLIENT -.Real-time.-> WEBSOCKET
    
    API --> PROMETHEUS
    PROMETHEUS --> GRAFANA
    API --> JAEGER
    
    %% Styling
    classDef frontend fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#000
    classDef backend fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#000
    classDef data fill:#E8F5E9,stroke:#388E3C,stroke-width:2px,color:#000
    classDef monitoring fill:#FFF3E0,stroke:#F57C00,stroke-width:2px,color:#000
    classDef external fill:#FCE4EC,stroke:#C2185B,stroke-width:2px,color:#000
    
    class NEXTJS,WS_CLIENT frontend
    class API,AUTH,WEBSOCKET backend
    class POSTGRES,REDIS data
    class PROMETHEUS,GRAFANA,JAEGER monitoring
    class STRIPE,EMAIL external
```

---

## Key Architecture Highlights

### 🎨 Frontend (Next.js 14)
- **Server-side rendering** for SEO and performance
- **App Router** for modern React patterns
- **TypeScript** for type safety
- **Tailwind CSS** for responsive design
- **WebSocket client** for real-time updates

### ⚙️ Backend (Go + Gin)
- **RESTful API** with 40+ endpoints
- **JWT authentication** with refresh tokens
- **Role-based access control** (4 roles)
- **WebSocket server** for push notifications
- **Middleware pipeline** (auth, logging, metrics, tracing)

### 💾 Data Layer
**PostgreSQL:**
- 15+ normalized tables
- Foreign key relationships
- Indexed queries
- Transaction support
- Full ACID compliance

**Redis:**
- Session management
- API response caching (70% hit rate)
- Rate limiting counters
- WebSocket connection tracking
- Sub-millisecond latency

### 📊 Observability (Production-Ready)
**Prometheus:**
- 50+ custom metrics
- HTTP request metrics (rate, duration, size)
- Database query metrics
- Cache metrics (hit/miss rates)
- Business metrics (donations, requests)

**Grafana:**
- Real-time dashboards
- Alert rules (response time, error rate)
- Historical trend analysis
- Multi-panel visualizations

**Jaeger:**
- Distributed tracing
- Request flow visualization
- Performance bottleneck identification
- Error tracking with context

### 🌍 External Integrations
- **Stripe** for payment processing
- **SendGrid** for transactional emails
- **Maps API** for geolocation (optional)

---

## Performance Characteristics

### Response Times
- **P50**: 45ms average
- **P95**: <200ms
- **P99**: <350ms

### Throughput
- **Tested**: 1,000+ req/sec
- **Concurrent users**: 100+
- **No degradation** under load

### Cache Efficiency
- **Hit rate**: 70-80%
- **Latency**: <1ms average
- **TTL**: Configurable per resource

### Database
- **Connection pool**: 25 connections
- **Query time**: <20ms average
- **Indexed lookups**: <5ms

---

## Deployment Architecture

```
                    ┌─────────────┐
                    │   Internet  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Load Balancer│
                    │   (Nginx)    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │  Frontend   │          │   Backend   │
       │  (Next.js)  │◄────────►│    (Go)     │
       │  Container  │   API    │  Container  │
       └─────────────┘          └──────┬──────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                      │
             ┌──────▼──────┐                       ┌──────▼──────┐
             │  PostgreSQL │                       │    Redis    │
             │  Container  │                       │  Container  │
             └─────────────┘                       └─────────────┘
                    │                                      │
                    └──────────────────┬──────────────────┘
                                       │
                                ┌──────▼──────┐
                                │ Monitoring  │
                                │    Stack    │
                                └─────────────┘
```

---

## Security Measures

✅ **Authentication**: JWT with secure token refresh  
✅ **Authorization**: Role-based access control  
✅ **Rate Limiting**: Redis-backed (100 req/min per IP)  
✅ **CORS**: Strict origin validation  
✅ **SQL Injection**: Prepared statements (GORM)  
✅ **XSS Protection**: Input sanitization  
✅ **HTTPS**: TLS 1.3 in production  
✅ **Secrets**: Environment variables, never committed  

---

## Scalability Strategy

### Horizontal Scaling
- **Stateless backend**: Can run multiple instances
- **Session in Redis**: Shared across instances
- **Database connection pooling**: Prevents exhaustion
- **Load balancer**: Distributes traffic

### Vertical Scaling
- **Database**: Can upgrade resources
- **Redis**: In-memory, scales with RAM
- **Backend**: Efficient Go runtime

### Caching Strategy
- **L1 Cache**: In-memory (future)
- **L2 Cache**: Redis (current)
- **L3 Cache**: CDN for static assets

---

## Technology Choices & Rationale

### Why Go?
- **Performance**: Near C-level speed
- **Concurrency**: Goroutines for WebSocket
- **Deployment**: Single binary
- **Reliability**: Strong typing, error handling

### Why Next.js?
- **SEO**: Server-side rendering
- **Developer Experience**: Hot reload, TypeScript
- **Performance**: Automatic code splitting
- **Modern**: App Router, React Server Components

### Why PostgreSQL?
- **Reliability**: ACID transactions
- **Features**: JSON columns, full-text search
- **Scalability**: Proven at scale
- **Open Source**: No licensing costs

### Why Redis?
- **Speed**: Sub-millisecond latency
- **Flexibility**: Multiple data structures
- **Persistence**: Optional durability
- **Battle-tested**: Industry standard

---

## Future Enhancements

### Phase 2
- [ ] Microservices architecture (if scale requires)
- [ ] Message queue (RabbitMQ/Kafka) for async processing
- [ ] Object storage (S3) for file uploads
- [ ] Full-text search (Elasticsearch) for advanced queries

### Phase 3
- [ ] Mobile apps (React Native)
- [ ] Multi-tenancy for multiple charities
- [ ] Machine learning for fraud detection
- [ ] Advanced analytics dashboard

---

## How to Generate This Diagram

### Method 1: GitHub (Easiest)
1. This file is already in your repo
2. Open on GitHub - it renders automatically
3. Take a screenshot

### Method 2: Mermaid Live Editor
1. Go to https://mermaid.live/
2. Copy the mermaid code above
3. Download as PNG or SVG

### Method 3: VS Code
1. Install "Markdown Preview Mermaid Support"
2. Open this file
3. Press `Ctrl+Shift+V`
4. Take screenshot

---

## Using This in Your Portfolio

### In Presentations
- Place diagram on **slide 2** (after title)
- Explain flow: User → Frontend → Backend → Data
- Highlight observability stack (shows production thinking)
- Mention key metrics (1000 req/s, 70% cache hit rate)

### In Documentation
- Include in README
- Link from portfolio website
- Use in technical write-ups
- Reference in interview discussions

### Talking Points
1. **"I designed a scalable architecture..."**
   - Show separation of concerns
   - Explain why each layer matters

2. **"I implemented comprehensive observability..."**
   - Point to Prometheus, Grafana, Jaeger
   - Mention 50+ metrics collected

3. **"I optimized for performance..."**
   - Highlight Redis caching (70% hit rate)
   - Mention sub-200ms response times

4. **"I followed production best practices..."**
   - Load balancer for availability
   - Rate limiting for security
   - Monitoring for reliability

---

**This architecture demonstrates enterprise-level thinking and production-ready development practices.**

