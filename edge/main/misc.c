#include "urinalysis.h"

void
print_addr(const void *addr)
{
    const uint8_t *u8p;

    u8p = addr;
    MODLOG_DFLT(INFO, "%02x:%02x:%02x:%02x:%02x:%02x",
                u8p[5], u8p[4], u8p[3], u8p[2], u8p[1], u8p[0]);
}

void
print_bin(uint8_t value)
{
    int i = 8;
    while(i--) {
        /* loop through and print the bits directly to console, disregarding the ESP logging framework */
        putchar('0' + ((value >> i) & 1));
    }
}