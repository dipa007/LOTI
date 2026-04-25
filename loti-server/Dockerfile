# ==========================================
# STAGE 1: React Frontend
# ==========================================
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend source code and compile Vite
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Node Backend
# ==========================================
FROM node:20-alpine
WORKDIR /app

# Copy backend package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend directories and core files based on your structure
COPY controllers/ ./controllers/
COPY routes/ ./routes/
COPY services/ ./services/
COPY utils/ ./utils/
COPY app.js ./
COPY index.js ./

# Copy the compiled React files from Stage 1 directly into the backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# The CLI will inject the PORT environment variable dynamically
ENV PORT=3000

# Start the Node server
CMD ["npm", "start"]