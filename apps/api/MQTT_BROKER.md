# MQTT Broker Configuration & ACL Guide

This document describes how MQTT is configured and used in this project, including **connection setup**, **ACL rules**, and **security considerations**.
The MQTT broker is used **only for presence and lightweight realtime signals**, while chat and signaling remain on Socket.IO.

---

## 1. Purpose of MQTT in This System

MQTT is used for:

* User presence (online / available / idle / in_call / offline)
* Heartbeat & crash detection (via LWT)
* Lightweight realtime state propagation

MQTT is **NOT** used for:

* Chat messages
* WebRTC signaling (offer / answer / ICE)
* Business logic decisions

---

## 2. Broker Choice

We use **EMQX Cloud** as the managed MQTT broker.

Reasons:

* Native MQTT over WebSocket (WSS)
* Built-in ACL & authentication
* LWT (Last Will and Testament)
* Good support for browser clients

---

## 3. Connection Endpoints

EMQX Cloud provides multiple ports. We use:

| Client             | Protocol                  | Port     |
| ------------------ | ------------------------- | -------- |
| Backend (Node.js)  | MQTT over TLS             | **8883** |
| Frontend (Browser) | MQTT over WebSocket (WSS) | **8084** |

### Why split ports?

* Browsers cannot connect to raw TCP MQTT
* Backend benefits from lower overhead TCP+TLS

---

## 4. Client Roles

### 4.1 Frontend Client (Untrusted)

* Connects via **WSS (8084)**
* Can **only publish its own presence**
* Cannot subscribe to any topic

### 4.2 Backend Client (Trusted)

* Connects via **MQTTS (8883)**
* Can publish and subscribe to all presence topics
* Syncs presence state into Redis

---

## 5. Topic Convention

Presence topics follow a strict convention:

```
presence/{clientId}
```

Example:

```
presence/user_123
```

Payload example:

```json
{
  "state": "available",
  "ts": 1736500000
}
```

Allowed states:

```
offline | online | available | matching | in_call | idle
```

---

## 6. Authentication

### Backend Authentication

Backend uses a dedicated account:

```
username: service:backend
password: <strong secret>
```

### Frontend Authentication

Frontend uses:

* `clientId`: `user_{userId}`
* `username`: `web`
* `password`: short-lived token (or static for MVP)

> The **clientId is the security boundary** for frontend ACL rules.

---

## 7. Authorization (ACL) Rules

> **IMPORTANT:** Authorization must run in **Whitelist Mode**.

### 7.1 Frontend ACL (All Users)

Frontend clients are restricted to **one single operation**.

#### Allow publish own presence

```
ALLOW  publish   presence/${clientid}
```

#### Deny wildcard publish

```
DENY   publish   presence/+
```

#### Deny all subscriptions

```
DENY   subscribe #
```

Result:

* A frontend client can only publish to `presence/{its-own-clientId}`
* It cannot read or spoof other users

---

### 7.2 Backend ACL

Backend has full access to presence topics.

```
username = service:backend
ALLOW publish   presence/+
ALLOW subscribe presence/+
```

---

## 8. TLS / Certificates

### Do We Need Custom Certificates?

**No.**

EMQX Cloud uses publicly trusted CA certificates. Both:

* Node.js
* Browsers

already trust them by default.

Custom certificates are only required for:

* Mutual TLS (mTLS)
* Embedded / IoT devices without CA bundles

---

## 9. Backend Connection Example

```ts
mqtt.connect("mqtts://<host>:8883", {
  clientId: "backend-presence",
  username: "service:backend",
  password: process.env.MQTT_PASSWORD,
  keepalive: 30,
  reconnectPeriod: 2000
});
```

---

## 10. Frontend Connection Example

```ts
mqtt.connect("wss://<host>:8084/mqtt", {
  clientId: `user_${userId}`,
  username: "web",
  password: token,
  keepalive: 30,
  will: {
    topic: `presence/user_${userId}`,
    payload: JSON.stringify({ state: "offline" }),
    retain: true
  }
});
```

---

## 11. Redis as Source of Truth

MQTT is **not queried directly** by the application.

Flow:

```
Frontend → MQTT → Backend → Redis → Socket.IO → Admin UI
```

Redis stores:

* Current presence state
* Matching pools
* Call / room state

---

## 12. Security Notes

* Frontend never subscribes to MQTT topics
* No wildcard publish permissions for frontend
* Backend credentials are never exposed to browsers
* MQTT is not used for chat or signaling

---

## 13. Summary

* MQTT is used only for presence
* EMQX Cloud provides managed broker & ACL
* Redis is the realtime state store
* Admin dashboard reads from Redis via backend

This setup is safe, scalable, and suitable for web-based realtime applications under moderate load.
