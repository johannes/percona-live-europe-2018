FROM node:10

WORKDIR /usr/srv/app

COPY package*.json ./

RUN npm install

COPY . .

RUN mv extra/hapi-mysqlx node_modules

EXPOSE 3000
CMD [ "npm", "start" ]
