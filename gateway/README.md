# Urinalysis Gateway

Node.js gateway with TypeScript setup. See it's purpose in the root readme.

## Deployment

We decided not to use a bundler so when building the files are simply transpiled from TypeScript to JavaScript without merging them into one file or including the dependencies.

On the Raspberry Pi, you first need to install the required packages by copying the `package.json` and `package-lock.json` over and running the following command (of course node 18 including npm have to be installed):

```
npm ci
```

Back on the host, you can build the project with:

```
npm run build
```

Then you can copy the output of dist to the Raspberry Pi Zero W and run it with

```
sudo node dist/gateway/src/app.js
```


## Development

Install dependencies:

```
npm install --include-dev
```

For testing purposes, you can run the following to start a fake gateway, which publishes person entered and exited messages without actually being connected to the edge.

```
npm run start_fake
```

Ps. you can also just clone the repo on the pi, install the dev dependencies there, then build and run directly on it. It just might be very slow :)