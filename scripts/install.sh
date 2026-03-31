#!/usr/bin/env bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}       DineFlow Installation            ${NC}"
echo -e "${BOLD}========================================${NC}"

# Check for Docker
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo -e "${GREEN}Docker installed. You may need to log out and back in.${NC}"
fi

# Check for Bun
if ! command -v bun &> /dev/null; then
  echo -e "${YELLOW}Bun not found. Installing Bun...${NC}"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

# Check for Node 20+
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js not found. Please install Node.js 20+${NC}"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}Node.js 20+ required. Found: $(node --version)${NC}"
  exit 1
fi

# Generate .env if not exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Generating .env file...${NC}"
  SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 32)
  cp .env.example .env
  sed -i "s/change-me-to-a-long-random-string/$SECRET/" .env
  echo -e "${GREEN}.env created with generated secret${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
bun install

# Start production containers
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker compose -f docker/docker-compose.yml up -d db redis

echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Build
echo -e "${YELLOW}Building packages...${NC}"
bun run build

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
bun run db:migrate

# Run seed
echo -e "${YELLOW}Seeding database...${NC}"
bun run db:seed

# Start all services
echo -e "${YELLOW}Starting all services...${NC}"
docker compose -f docker/docker-compose.yml up -d

# Build and copy web assets
echo -e "${YELLOW}Building web assets...${NC}"
bun run --filter=@dineflow/web build

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}   DineFlow Installation Complete!      ${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo ""
echo -e "${BOLD}Access URLs:${NC}"
echo -e "  Admin Portal: ${GREEN}http://$LOCAL_IP/admin${NC}"
echo -e "  Kitchen Display: ${GREEN}http://$LOCAL_IP/kitchen${NC}"
echo -e "  Waiter App: ${GREEN}http://$LOCAL_IP/waiter${NC}"
echo ""
echo -e "${BOLD}Default Credentials:${NC}"
echo -e "  Admin:   ${YELLOW}admin@restaurant.local${NC} / ${YELLOW}admin123${NC}"
echo -e "  Manager: ${YELLOW}manager@restaurant.local${NC} / ${YELLOW}manager123${NC}"
echo -e "  Waiter:  ${YELLOW}waiter1@restaurant.local${NC} / ${YELLOW}waiter123${NC}"
echo -e "  Kitchen: ${YELLOW}kitchen1@restaurant.local${NC} / ${YELLOW}kitchen123${NC}"
echo ""
echo -e "${BOLD}QR Code URL Pattern:${NC}"
echo -e "  ${GREEN}http://menu.local/table/{tableId}${NC}"
echo -e "  ${GREEN}http://$LOCAL_IP/table/{tableId}${NC} (fallback)"
echo ""
