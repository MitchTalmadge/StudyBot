FROM node:12.18-alpine

# Working Environment Setup
COPY . /app
WORKDIR /app

# Install Packages
RUN npm install

# Start
ENTRYPOINT [ "npm", "start" ]