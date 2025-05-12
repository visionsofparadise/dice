FROM node:22-alpine

RUN mkdir -p /home/dice-bootstrap

WORKDIR /home/dice-bootstrap

COPY /dist/index.js .

ENTRYPOINT [ "node", "." ]