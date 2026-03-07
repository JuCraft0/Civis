# Build Stage
FROM node:20 AS build

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the client code
COPY . .

# Build the app (Vite outputs to /app/dist)
RUN npm run build

# Production Stage
FROM nginx:stable-alpine

LABEL name="civis-client"

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Port for the web app
EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]
