# Use an official Node.js runtime as the base image
FROM node:20-slim

# Install system dependencies (minimal - no Python/TF needed anymore)
RUN apt-get update && apt-get install -y \
    libjpeg-dev \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy dependency files first for better layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the server code
COPY . .

# Expose the API port
EXPOSE 5005

CMD ["node", "index.js"]
