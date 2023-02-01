#include "urinalysis.h"
#include "driver/gpio.h"

#define LEFT_SENSOR GPIO_NUM_25
#define RIGHT_SENSOR GPIO_NUM_26

void init_sensor(gpio_num_t gpio_num) {
    ESP_ERROR_CHECK(gpio_reset_pin(gpio_num));
    ESP_ERROR_CHECK(gpio_set_direction(gpio_num, GPIO_MODE_INPUT));
}

void init_lightbarrier_sensors(void)
{
    init_sensor(LEFT_SENSOR);
    init_sensor(RIGHT_SENSOR);
}

uint8_t read_sensors(void) {
    int left = gpio_get_level(LEFT_SENSOR);
    int right = gpio_get_level(RIGHT_SENSOR);

    // invert but not bitwise for the whole number, just one bit
    left = left ? 0 : 1;
    right = right ? 0 : 1;

    // combine left and right into one byte with each value being nibble-aligned
    return (left << 4) | right;
}
