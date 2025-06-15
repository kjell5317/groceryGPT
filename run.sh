#!/usr/bin/with-contenv bashio
set +u

CONFIG_PATH=/data/options.json

TOKEN=$(bashio::config 'api_key')
CAT=$(bashio::config 'categories')

bashio::log.info "Starting..."

TMP=$(./categories.sh $CAT)

node ./server.js $TOKEN $CAT $TMP