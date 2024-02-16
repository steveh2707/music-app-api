FROM node:16

WORKDIR /app

COPY package*.json ./

EXPOSE 4000

ENV MYSQL_HOST=localhost
ENV MYSQL_PORT=3306
ENV MYSQL_DATABASE=treble_db
ENV MYSQL_USER=root
ENV MYSQL_PASSWORD=Password1

CMD ["npm", "start"]