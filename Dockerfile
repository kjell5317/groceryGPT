ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk update && \
    apk add --no-cache \
    nodejs-current \
    npm

COPY items.db /data

COPY package.json /
RUN cd / && npm install
COPY index.js /

COPY run.sh /
RUN chmod +x /run.sh

CMD [ "/run.sh" ]
