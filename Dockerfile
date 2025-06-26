FROM node:hydrogen-alpine3.19

# Create and change to the app directory.
WORKDIR /usr/src/app

# Install Python and build dependencies
RUN apk add --no-cache python3 build-base cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install production dependencies.
RUN npm install



# generated prisma files
COPY prisma ./prisma/

# COPY ENV variable
COPY .env ./

# COPY tsconfig.json file
COPY tsconfig.json ./

RUN npm run generate

# COPY
COPY . .

RUN npm run build

CMD npm run start:migrate

EXPOSE 5001


