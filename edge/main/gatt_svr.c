#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "host/ble_hs.h"
#include "host/ble_uuid.h"
#include "services/gap/ble_svc_gap.h"
#include "services/gatt/ble_svc_gatt.h"
#include "urinalysis.h"
#include "services/ans/ble_svc_ans.h"

/**
 * Our vendor specific Urinal-availability-service consists of only one characteristic:
 *    o entry-light-barrier: Combined value of two motion sensors making up a light-barrier.
 *      It's one byte so 2 nibbles, the first being the left sensor and the second the right sensor.
 *      For each nibble/sensor a 1 indicates that someone has moved in front of the sensor and a 0
 *      indicates that no activity was observed in front of that sensor.
 *      This characteristic is notify-only (no write and also no read on demand).
*/

/* 59462f12-9543-9999-12c8-58b459a2712d */
static const ble_uuid128_t gatt_svr_svc_urinal_uuid =
    BLE_UUID128_INIT(0x2d, 0x71, 0xa2, 0x59, 0xb4, 0x58, 0xc8, 0x12,
                     0x99, 0x99, 0x43, 0x95, 0x12, 0x2f, 0x46, 0x59);

/* 5c3a659e-897e-45e1-b016-007107c96df6 */
static const ble_uuid128_t gatt_svr_chr_urinal_libar_uuid =
    BLE_UUID128_INIT(0xf6, 0x6d, 0xc9, 0x07, 0x71, 0x00, 0x16, 0xb0,
                     0xe1, 0x45, 0x7e, 0x89, 0x9e, 0x65, 0x3a, 0x5c);

static int
gatt_svr_chr_access_cb(uint16_t conn_handle, uint16_t attr_handle,
                             struct ble_gatt_access_ctxt *ctxt,
                             void *arg);

uint16_t libar_notif_handle;

static const struct ble_gatt_svc_def gatt_svr_svcs[] = {
    {
        /*** Service: urinal-availability. */
        .type = BLE_GATT_SVC_TYPE_PRIMARY,
        .uuid = &gatt_svr_svc_urinal_uuid.u,
        .characteristics = (struct ble_gatt_chr_def[])
        { {
                /*** Characteristic: light-barrier. */
                .uuid = &gatt_svr_chr_urinal_libar_uuid.u,
                .access_cb = gatt_svr_chr_access_cb,
                .val_handle = &libar_notif_handle,
                .flags = BLE_GATT_CHR_F_NOTIFY,
            }, {
                0, /* No more characteristics in this service. */
            }
        },
    },
    {
        0, /* No more services. */
    },
};

static int
gatt_svr_chr_access_cb(uint16_t conn_handle, uint16_t attr_handle,
                             struct ble_gatt_access_ctxt *ctxt,
                             void *arg)
{
    /* This function is called when the characteristic is read (BLE_GATT_CHR_F_READ)
    * which never happens (notify-only) so we just have this stub that errors. For some reason, you cannot
    * omit the access callback in the service definition, so we do need this stub.
    * Usually you'd compare UUIDs and then write to ctxt->om to return a value.
    */

    assert(0);
    return BLE_ATT_ERR_UNLIKELY;
}

/** Send a 32-bit value as a notification on the light barrier characteristic. */
void
notify_libar_over_control_chr(int16_t conn_handle, uint32_t data)
{
    struct os_mbuf *om;
    if (conn_handle > -1) {
        om = ble_hs_mbuf_from_flat(&data, sizeof(&data));
        MODLOG_DFLT(INFO, "Notifying conn=%d", conn_handle);
        int rc = ble_gattc_notify_custom((uint16_t)conn_handle, libar_notif_handle, om);
        if (rc != 0) {
            MODLOG_DFLT(ERROR, "error notifying; rc=%d", rc);
            return;
        }
    }
}

void
gatt_svr_register_cb(struct ble_gatt_register_ctxt *ctxt, void *arg)
{
    char buf[BLE_UUID_STR_LEN];

    switch (ctxt->op) {
    case BLE_GATT_REGISTER_OP_SVC:
        MODLOG_DFLT(DEBUG, "registered service %s with handle=%d\n",
                    ble_uuid_to_str(ctxt->svc.svc_def->uuid, buf),
                    ctxt->svc.handle);
        break;

    case BLE_GATT_REGISTER_OP_CHR:
        MODLOG_DFLT(DEBUG, "registering characteristic %s with "
                    "def_handle=%d val_handle=%d\n",
                    ble_uuid_to_str(ctxt->chr.chr_def->uuid, buf),
                    ctxt->chr.def_handle,
                    ctxt->chr.val_handle);
        break;

    case BLE_GATT_REGISTER_OP_DSC:
        MODLOG_DFLT(DEBUG, "registering descriptor %s with handle=%d\n",
                    ble_uuid_to_str(ctxt->dsc.dsc_def->uuid, buf),
                    ctxt->dsc.handle);
        break;

    default:
        assert(0);
        break;
    }
}

/** Initialized GAP (Generic Access Profile), GATT (Generic Attribute Profile) and ANS (Alert Notification Service) */
int
gatt_svr_init(void)
{
    int rc;

    ble_svc_gap_init();
    ble_svc_gatt_init();
    ble_svc_ans_init();

    rc = ble_gatts_count_cfg(gatt_svr_svcs);
    if (rc != 0) {
        return rc;
    }

    rc = ble_gatts_add_svcs(gatt_svr_svcs);
    if (rc != 0) {
        return rc;
    }

    return 0;
}
