# Urinalysis Edge

This is an ESP-IDF 4.4.3 (5.0 will not work out of the box) application with the purpose of reading from the two motions sensor and sending that information to a gateway over Bluetooth Low Energy.

This application is heavily built upon the [ESP-IDF NimBLE BLE Peripheral Example](https://github.com/espressif/esp-idf/tree/v4.4.3/examples/bluetooth/nimble/bleprph), which was an amazing resource for us. The used and linked example is Open Source under the Apache-2.0 license (see below).


## Build and Flash

Run `idf.py -p PORT flash monitor` to build, flash and monitor the project. You can also use the respective command in the VSCode extension.

(To exit the serial monitor, type ``Ctrl-]``.)


## License of adapted example

```c
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
```

# Explored Resources
- https://github.com/espressif/esp-idf/tree/v4.4.3/examples/bluetooth/nimble/bleprph (probably our best shot)
- https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/bluetooth/nimble/index.html
- https://mynewt.apache.org/v1_3_0/network/ble/ble_intro/
- https://learn.adafruit.com/introduction-to-bluetooth-low-energy
- https://serialio.com/support/bluetooth-low-energy-ble-security/
- https://developer.nordicsemi.com/nRF5_SDK/nRF51_SDK_v4.x.x/doc/html/group___b_l_e___g_a_p___m_s_c.html (not our board but the charts should probably be correct for us too)
- https://github.com/espressif/esp-idf/blob/release/v4.4/examples/bluetooth/bluedroid/ble/gatt_client/tutorial/Gatt_Client_Example_Walkthrough.md (bluedroid isn't great)
- https://www.electronicshub.org/esp32-ble-tutorial/ (doesn't work for us, it's using Arduino)
