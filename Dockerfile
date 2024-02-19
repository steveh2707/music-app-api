FROM node:16

WORKDIR /app

ENV MYSQL_HOST=localhost
ENV MYSQL_PORT=3306
ENV MYSQL_DATABASE=treble_db
ENV MYSQL_USER=root
ENV MYSQL_PASSWORD=Password1

COPY . /app

RUN npm install

EXPOSE 4000

CMD ["npm", "start"]