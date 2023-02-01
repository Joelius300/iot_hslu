import type {Peripheral} from "@abandonware/noble";
import noble from "@abandonware/noble";

/**
 * Sets up a Bluetooth Low Energy connection to the edge and subscribes to notifications
 * on the light barrier characteristic. Whenever an update is received, the callback is called.
 * @param callback Callback for whenever an update is received from the light barrier (edge).
 */
export function subscribeToLightBarrier(
  callback: (sensorValues: number) => void,
) {
  // Values from edge/main/gatt_svr.c -> project specific identifiers
  const peripheralId = "40f520705632";
  const serviceUUID = "59462f129543999912c858b459a2712d";
  const characteristicUUID = "5c3a659e897e45e1b016007107c96df6";

  noble.on("stateChange", async (state: string) => {
    console.log(`State changed to: ${state}`);
    if (state === "poweredOn") {
      console.log("Device powered on");
      await noble.startScanningAsync([], false);
      console.log("Device started scanning");
    }
  });

  noble.on("discover", async (peripheral: Peripheral) => {
    console.log(peripheral.id);
    if (peripheral.id === peripheralId) {
      await noble.stopScanningAsync();
      console.log(`Peripheral with ID ${peripheral.id} found`);
      const advertisement = peripheral.advertisement;
      const localName = advertisement.localName;
      const serviceData = advertisement.serviceData;
      const serviceUuids = advertisement.serviceUuids;

      console.log(localName);
      console.log(serviceData);
      console.log(serviceUuids);

      await explore(peripheral);
    }
  });

  const explore = async (peripheral: Peripheral) => {
    await peripheral.connectAsync();
    const services = await peripheral.discoverServicesAsync([serviceUUID]);
    if (services.length !== 1) {
      throw new Error("Multiple services found, only one expected");
    }
    const service = services[0];
    if (service?.uuid !== serviceUUID) {
      throw new Error("Service UUID mismatch");
    }
    const characteristics = await service.discoverCharacteristicsAsync([characteristicUUID]);
    if (characteristics.length !== 1) {
      throw new Error("Multiple characteristics found, only one expected");
    }
    const characteristic = characteristics[0];
    if (characteristic?.uuid !== characteristicUUID) {
      throw new Error("Characteristic UUID mismatch");
    }
    characteristic.on("notify", function (state) {
      console.log(`Notify state changed to ${state}`);
    });
    await characteristic.notifyAsync(true);
    console.log("Subscribed to light barrier characteristic.");
    characteristic.on("data", async (data) => {
      // read payload as number. Since ESP sends it Little Endian, we need that appropriate function
      const sensorValues = data.readUint32LE();
      callback(sensorValues)
    });
  }
}
