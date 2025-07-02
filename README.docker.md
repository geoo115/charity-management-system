# Docker Setup for LDH2 Backend

This guide helps you set up the required services (PostgreSQL and Redis) using Docker.

## Quick Start

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Check service status:**
   ```bash
   docker-compose ps
   ```

3. **Start your Go application:**
   ```bash
   go run .
   ```

4. **Stop the services:**
   ```bash
   docker-compose down
   ```

## Services

### Core Services (always running)
- **PostgreSQL** (port 5432): Main database
- **Redis** (port 6379): Caching and session storage

### Management Tools (optional)
To start with management tools:
```bash
docker-compose --profile tools up -d
```

- **pgAdmin** (port 8082): PostgreSQL management interface
  - URL: http://localhost:8082
  - Email: admin@lewisham-hub.org
  - Password: admin123

- **Redis Commander** (port 8081): Redis management interface
  - URL: http://localhost:8081

## Database Configuration

The Docker setup uses the same credentials as your `.env` file:
- Database: `lewisham_hub`
- Username: `usr`
- Password: `test123`

## Useful Commands

```bash
# Start only core services
docker-compose up -d

# Start with management tools
docker-compose --profile tools up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres
docker-compose logs -f redis

# Restart a service
docker-compose restart postgres

# Stop and remove everything (including volumes)
docker-compose down -v

# Connect to PostgreSQL directly
docker exec -it ldh2_postgres psql -U usr -d lewisham_hub

# Connect to Redis directly
docker exec -it ldh2_redis redis-cli
```

## Troubleshooting

### Port Already in Use
If you get port conflicts:
```bash
# Check what's using the port
sudo lsof -i :5432
sudo lsof -i :6379

# Stop conflicting services
sudo systemctl stop postgresql
sudo systemctl stop redis
```

### Data Persistence
Data is stored in Docker volumes and will persist between container restarts. To completely reset:
```bash
docker-compose down -v
docker-compose up -d
```

### Health Checks
The services include health checks. You can see their status with:
```bash
docker-compose ps
```

Healthy services will show `(healthy)` in their status. 