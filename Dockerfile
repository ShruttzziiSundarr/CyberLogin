# Combined single-container build: serves the React frontend and the Express
# API from one process. SAML-only by default (FEATURE_OAUTH_ONBOARDING unset).
# For the OAuth-capable two-service setup, use backend/Dockerfile +
# frontend/Dockerfile (docker-compose.yml) instead.

FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
# Same-origin deploy: the backend serves both the UI and /api, so the API base is relative.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev
COPY --from=backend-build /app/backend/dist ./dist
COPY backend/certs ./certs
COPY --from=frontend-build /app/frontend/dist ./public
EXPOSE 4000
USER node
CMD ["node", "dist/server.js"]
