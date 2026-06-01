FROM node:18-alpine

WORKDIR /app

# Copy package configuration files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the frontend source code
COPY . .

# Expose Vite dev port
EXPOSE 5173

# Run development server with host binding to allow container external traffic
CMD ["npm", "run", "dev", "--", "--host"]
