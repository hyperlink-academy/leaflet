FROM node:22
WORKDIR /code

# start with dependencies to enjoy caching
COPY ./package.json /code/package.json
COPY ./package-lock.json /code/package-lock.json
RUN npm ci

# copy rest and build
COPY . /code/.
RUN npm run build-feed-service
CMD ["node", "/code/feeds/dist/index.js"]
