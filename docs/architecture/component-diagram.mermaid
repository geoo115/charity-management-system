```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Next.js Web App]
        PWA[PWA Features]
        WEB --> PWA
    end

    subgraph "API Gateway Layer"
        NGINX[Nginx/Load Balancer]
        CORS[CORS Middleware]
        RATE[Rate Limiting]
        AUTH[Auth Middleware]
        
        NGINX --> CORS
        CORS --> RATE
        RATE --> AUTH
    end

    subgraph "Application Layer"
        API[Go/Gin API Server]
        
        subgraph "Domain Handlers"
            ADMIN[Admin Handlers]
            DONOR[Donor Handlers] 
            VOLUNTEER[Volunteer Handlers]
            VISITOR[Visitor Handlers]
            SYSTEM[System Handlers]
        end
        
        subgraph "Core Services"
            AUTH_SVC[Authentication Service]
            HELP_SVC[Help Request Service]
            DONATION_SVC[Donation Service]
            VOLUNTEER_SVC[Volunteer Service]
            NOTIFICATION_SVC[Notification Service]
        end
        
        API --> ADMIN
        API --> DONOR
        API --> VOLUNTEER
        API --> VISITOR
        API --> SYSTEM
        
        ADMIN --> AUTH_SVC
        DONOR --> DONATION_SVC
        VOLUNTEER --> VOLUNTEER_SVC
        VISITOR --> HELP_SVC
        SYSTEM --> NOTIFICATION_SVC
    end

    subgraph "Real-time Layer"
        WS[WebSocket Manager]
        CONN[Connection Pool]
        MSG_QUEUE[Message Queue]
        
        WS --> CONN
        WS --> MSG_QUEUE
    end

    subgraph "Caching Layer"
        REDIS[Redis Cache]
        SESSION[Session Store]
        RATE_STORE[Rate Limit Store]
        
        REDIS --> SESSION
        REDIS --> RATE_STORE
    end

    subgraph "Data Layer"
        DB[PostgreSQL Database]
        
        subgraph "Database Schemas"
            USER_SCHEMA[Users & Auth]
            HELP_SCHEMA[Help Requests]
            DONATION_SCHEMA[Donations]
            VOLUNTEER_SCHEMA[Volunteers]
            AUDIT_SCHEMA[Audit Logs]
        end
        
        DB --> USER_SCHEMA
        DB --> HELP_SCHEMA
        DB --> DONATION_SCHEMA
        DB --> VOLUNTEER_SCHEMA
        DB --> AUDIT_SCHEMA
    end

    subgraph "External Services"
        SENDGRID[SendGrid Email]
        TWILIO[Twilio SMS]
        STRIPE[Stripe Payments]
        MAPS[Maps/Geocoding API]
    end

    subgraph "Monitoring Stack"
        PROMETHEUS[Prometheus Metrics]
        GRAFANA[Grafana Dashboards]
        JAEGER[Jaeger Tracing]
        ALERTS[AlertManager]
        
        PROMETHEUS --> GRAFANA
        PROMETHEUS --> ALERTS
        JAEGER --> GRAFANA
    end

    %% Frontend to API
    WEB --> NGINX
    WEB -.->|WebSocket| WS

    %% API Layer Connections
    AUTH --> API
    API --> REDIS
    API --> DB
    API --> WS

    %% External Service Connections  
    NOTIFICATION_SVC --> SENDGRID
    NOTIFICATION_SVC --> TWILIO
    DONATION_SVC --> STRIPE
    HELP_SVC --> MAPS

    %% Monitoring Connections
    API --> PROMETHEUS
    API --> JAEGER
    DB --> PROMETHEUS
    REDIS --> PROMETHEUS

    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef data fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef external fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef monitoring fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class WEB,PWA frontend
    class API,ADMIN,DONOR,VOLUNTEER,VISITOR,SYSTEM,AUTH_SVC,HELP_SVC,DONATION_SVC,VOLUNTEER_SVC,NOTIFICATION_SVC api
    class DB,USER_SCHEMA,HELP_SCHEMA,DONATION_SCHEMA,VOLUNTEER_SCHEMA,AUDIT_SCHEMA,REDIS,SESSION,RATE_STORE data
    class SENDGRID,TWILIO,STRIPE,MAPS external
    class PROMETHEUS,GRAFANA,JAEGER,ALERTS monitoring
```