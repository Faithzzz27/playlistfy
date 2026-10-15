FROM node:20-alpine

WORKDIR /app

# Install nodemon globally so it is always present in PATH regardless of mounted volumes
RUN npm install -g nodemon

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

EXPOSE 3000

# Legacy polling watch mode (-L) so file edits on Windows trigger immediate auto-updates in Docker
CMD ["nodemon", "-L", "server.js"]