# Stage 1: Build the React app
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build-time env vars
ARG VITE_API_URL
ARG VITE_DIRECTUS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DIRECTUS_URL=$VITE_DIRECTUS_URL

# Copy and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config for SPA + internal reverse-proxy to backend/directus
RUN echo 'server { \
    listen 80; \
    client_max_body_size 50m; \
    root /usr/share/nginx/html; \
    index index.html; \
    location = /api { \
    return 301 /api/; \
    } \
    location /api/ { \
    proxy_pass http://backend:5000/api/; \
    proxy_http_version 1.1; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location /uploads/ { \
    proxy_pass http://backend:5000/uploads/; \
    proxy_http_version 1.1; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location = /directus { \
    return 301 /directus/; \
    } \
    location /directus/ { \
    proxy_pass http://directus:8055/; \
    proxy_http_version 1.1; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location / { \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
