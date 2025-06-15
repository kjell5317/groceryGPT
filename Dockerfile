ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk update && \
    apk add --no-cache \
    nodejs-current \
    npm

COPY package.json /
RUN cd / && npm install

COPY . /

RUN chmod +x /run.sh

CMD [ "/run.sh" ]
