FROM node:22-slim AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS frontend-builder
WORKDIR /app/web-ui
COPY web-ui/package*.json ./
RUN npm ci
COPY web-ui/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/web-ui/dist ./web-ui/dist
RUN mkdir -p data
EXPOSE 3001
CMD ["node", "dist/index.js"]
