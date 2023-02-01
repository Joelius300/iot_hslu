# Urinalysis Broker

The MQTT broker required for the system to communicate.

In order for the system to work, `BROKER_HOSTNAME` in `../shared/shared.ts` must be set to the ip of the device that runs this broker.


Start it with

```
docker compose up -d
```

Watch logs with

```
docker compose logs -f
```