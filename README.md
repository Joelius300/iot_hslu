# Urinalysis

This is an IOT project I did in a group of three at HSLU. We came up with this silly idea of displaying whether a urinal is available that isn't next to anyone and just wanted to have some fun while learning about IOT technologies. Of course, we had to make it look semi-professional in the end and you can see the result of that in the [Report](./Report.pdf) (anonymized and additional presentation we held not included).

It was fun learning about ESP-IDF, BLE, MQTT and Socket.io. This project also reinforced my dislike for Node.js but hey we got it working in the end. The algorithm to estimate the occupancy of the urinals given only timestamps of people entering and leaving was way over-engineered for this project but really fun to put together; maybe I'll have some more fun with that in the future.

This repository contains all of the four major components required to run the Urinalysis system. Below is a summary of the system. For each component there is also a readme with further information and instructions for running them.

## Website

The website has the purpose of displaying the current bro code state and update in real-time. It consists of a Website-Backend and a Website-Frontend.

The Website-Backend is a Node.js application that uses Express.js to serve the frontend, and Socket.IO to communicate with the frontend.  
The Website-Backend also uses MQTT.js to connect to the MQTT broker and subscribe to the bro code state changed topic, which enables it to propagate those updates to the frontend.

The Website-Frontend is a pure HTML, CSS and JavaScript site (single HTML file) that displays the current state and updates it whenever an update is received from the Website-Backend over WebSockets (Socket.IO).

## Backend

The backend is a Node.js application with the purpose of handling the "heavy" calculations in the systems. This means it listens for person entered and person exited events and estimates the current occupancy of the urinals using hard math and statistics. From these possible occupancies, it calculates probabilities for the three different bro code states and estimates the most probable to be the current bro code state.

Whenever this bro code state changes, it publishes an MQTT message on the appropriate topic using MQTT.js. The person entered and person exited events are also MQTT messages received on respective MQTT topics.

## Gateway

The gateway runs a Node.js application with the purpose of aggregating and relaying the data from the edge. It uses Bluetooth Low Energy (noble) to communicate with the edge and transforms it's messages into person entered and person exited events. Whenever such an event occurs, the gateway published an MQTT message on the appropriate MQTT topic using MQTT.js.

## Edge

The edge runs a C application built with ESP-IDF for the purpose of reading the sensors and sending that data to the gateway. It reads the sensors periodically using a pull-up-resistor and whenever the readings change, they are sent to the gateway using Bluetooth Low Energy (NimBLE). \
**Important note:** ESP-IDF 5.0 released at the end of the semester and we decided not to go to the efforts of migrating. The edge application for ESP32 requires **ESP-IDF 4.4.3**!

## Broker

The broker folder contains a docker-compose and config file to start and setup a mosquitto MQTT broker. The communication between the gateway, backend and website requires an MQTT broker whose ip must be specified in `shared/shared.ts`.


# Planned Requirements (MoSCoW)

## Website (Laptop)

This was a late addition to replace the hardware display. It consists of a backend, which does most of the work, and a tiny HTML/CSS/JS frontend that reacts to changes via WebSockets.

### Must

- Display the current bro code state
- React immediately to bro code state updates


## Backend (Laptop)

### Must

- Receive data via MQTT from gateway
- Send data via MQTT to ~~gateway~~ Website-Backend
- Calculate state from gateway input

### Could

- Data persistence

### Wont

- Data collection / sensor communication

## Gateway (Raspberry Pi Zero W)

### Must

- Receive data via bluetooth from edge
- Send data via MQTT to backend
- Receive data via MQTT from backend
- ~~Set display to given state (Smiley)~~ Replaced with Website

### Wont

- Calculate or estimate state

## Edge (ESP)

### Must

- Receive data from sensors
- Send data via bluetooth to gateway
