FROM soluto/agogos-graphql-gateway AS gateway
FROM soluto/agogos-registry AS registry
FROM soluto/agogos-source-kubernetes-fs AS source

FROM node:10
WORKDIR /app
VOLUME [ "/resources" ]

COPY start.js .
COPY --from=gateway /app/agogos ./gateway
COPY --from=registry /service ./registry
RUN cd registry && npm rebuild
COPY --from=source /app/source ./source-kubernetes-fs

CMD ["node", "/app/start.js"]