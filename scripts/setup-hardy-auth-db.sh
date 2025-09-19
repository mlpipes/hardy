#!/bin/bash

# Hardy Auth Database Setup Script
# Creates and configures the Hardy Auth database with proper naming

set -e

echo "🏥 Hardy Auth Database Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="hardy_auth"
DB_USER="auth_service"
DB_PASSWORD="auth_password"
DB_HOST="localhost"
DB_PORT="5434"
REDIS_HOST="localhost"
REDIS_PORT="6381"

echo -e "${BLUE}Setting up Hardy Auth backend resources...${NC}"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to stop existing containers
stop_existing_containers() {
    echo -e "${YELLOW}🛑 Stopping existing Hardy Auth containers...${NC}"

    # Stop containers if they exist
    docker-compose -f docker-compose.yml down 2>/dev/null || true

    # Remove orphaned containers
    docker container rm hardy-auth-service hardy-auth-db hardy-auth-redis hardy-auth-adminer 2>/dev/null || true

    echo -e "${GREEN}✅ Cleaned up existing containers${NC}"
}

# Function to create Docker volumes
create_volumes() {
    echo -e "${YELLOW}📦 Creating Docker volumes...${NC}"

    docker volume create hardy_auth_db_data 2>/dev/null || true
    docker volume create hardy_auth_redis_data 2>/dev/null || true

    echo -e "${GREEN}✅ Docker volumes created${NC}"
}

# Function to start database services
start_database_services() {
    echo -e "${YELLOW}🚀 Starting Hardy Auth database services...${NC}"

    # Start database and Redis only
    docker-compose up -d auth-db auth-redis

    echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"

    # Wait for database to be ready
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker exec hardy-auth-db pg_isready -U $DB_USER -d $DB_NAME >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database is ready${NC}"
            break
        fi

        echo -n "."
        sleep 2
        retries=$((retries-1))
    done

    if [ $retries -eq 0 ]; then
        echo -e "${RED}❌ Database failed to start${NC}"
        exit 1
    fi
}

# Function to run database migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"

    # Generate Prisma client
    npx prisma generate

    # Push database schema
    npx prisma db push --force-reset

    echo -e "${GREEN}✅ Database schema updated${NC}"
}

# Function to seed initial data
seed_database() {
    echo -e "${YELLOW}🌱 Seeding initial data...${NC}"

    # Run seed script if it exists
    if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
        npm run db:seed
    else
        echo -e "${BLUE}ℹ️  No seed script found, skipping...${NC}"
    fi

    echo -e "${GREEN}✅ Database seeded${NC}"
}

# Function to start development services
start_dev_services() {
    echo -e "${YELLOW}🔧 Starting development services...${NC}"

    # Start Adminer for database management
    docker-compose --profile development up -d auth-adminer

    echo -e "${GREEN}✅ Development services started${NC}"
}

# Function to verify setup
verify_setup() {
    echo -e "${YELLOW}🔍 Verifying setup...${NC}"

    # Check database connection
    if docker exec hardy-auth-db psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection verified${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        exit 1
    fi

    # Check Redis connection
    if docker exec hardy-auth-redis redis-cli ping | grep -q "PONG"; then
        echo -e "${GREEN}✅ Redis connection verified${NC}"
    else
        echo -e "${RED}❌ Redis connection failed${NC}"
        exit 1
    fi

    # Check tables exist
    local table_count=$(docker exec hardy-auth-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    if [ "$table_count" -gt 0 ]; then
        echo -e "${GREEN}✅ Database tables created ($table_count tables)${NC}"
    else
        echo -e "${RED}❌ No database tables found${NC}"
        exit 1
    fi
}

# Function to display connection info
display_connection_info() {
    echo -e "\n${GREEN}🎉 Hardy Auth Backend Setup Complete!${NC}"
    echo -e "\n${BLUE}📋 Connection Information:${NC}"
    echo -e "Database URL: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    echo -e "Redis URL: redis://default:auth_redis_password@$DB_HOST:$REDIS_PORT"
    echo -e "Adminer URL: http://localhost:8081"
    echo -e "\n${BLUE}🛠️  Management Commands:${NC}"
    echo -e "Start all services: docker-compose up -d"
    echo -e "Stop all services: docker-compose down"
    echo -e "View logs: docker-compose logs -f"
    echo -e "Database shell: docker exec -it hardy-auth-db psql -U $DB_USER -d $DB_NAME"
    echo -e "Redis shell: docker exec -it hardy-auth-redis redis-cli"
    echo -e "\n${BLUE}🔧 Next Steps:${NC}"
    echo -e "1. Copy .env.example to .env.local and update with your settings"
    echo -e "2. Start the Hardy Auth application: npm run dev"
    echo -e "3. Access the admin dashboard at: http://localhost:3001/admin"
    echo -e "\n${YELLOW}⚠️  Important Security Notes:${NC}"
    echo -e "- Change default passwords in production"
    echo -e "- Enable SSL/TLS for production deployments"
    echo -e "- Configure proper firewall rules"
    echo -e "- Set up regular database backups"
}

# Main execution
main() {
    echo -e "${BLUE}Starting Hardy Auth backend setup...${NC}\n"

    check_docker
    stop_existing_containers
    create_volumes
    start_database_services

    # Give database a moment to fully initialize
    sleep 5

    run_migrations
    seed_database
    start_dev_services
    verify_setup
    display_connection_info

    echo -e "\n${GREEN}✨ Setup completed successfully!${NC}"
}

# Run main function
main "$@"