FROM node:12.18-alpine

# Working Environment Setup
COPY . /app
WORKDIR /app

# Build
RUN npm install
RUN npm build

# Start
ENTRYPOINT [ "npm", "start" ]