FROM node:20-slim

# Install OpenSSL required by Prisma Client
RUN apt-get update -y && apt-get install -y openssl

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests and Prisma schema first to leverage Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client code
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Expose port 3000
EXPOSE 3000

# Command to run the express server using tsx directly
CMD ["npx", "tsx", "index.ts"]
