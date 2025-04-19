FROM node:22

RUN mkdir -p /usr/src/app

COPY . /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app

RUN npm install
RUN npm run prisma:generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
