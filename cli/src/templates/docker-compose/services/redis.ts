export function redisService() {
  return {
    image: 'redis:7-alpine',
    container_name: 'notification-redis',
    ports: ['6379:6379'],
    volumes: ['redis_data:/data'],
    restart: 'unless-stopped',
  };
}
