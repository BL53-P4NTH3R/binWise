/**
 * BinWise — wifi_handler.h
 * ─────────────────────────────────────────────────────────────────
 * Temporary WiFi transmission path for bench testing, used in
 * place of gsm_handler.h while the SIM800L power supply issue
 * is being resolved.
 *
 * Function shapes deliberately mirror gsm_handler.h so main.ino
 * only needs the calls swapped, not restructured. Swapping back
 * to GSM later means reverting these few calls.
 * ─────────────────────────────────────────────────────────────────
 */

#ifndef WIFI_HANDLER_H
#define WIFI_HANDLER_H

#include <Arduino.h>
#include "config.h"

bool wifiInit();
int  wifiPostReading(float fill_pct, float battery_pct, int rssi_dbm);
int  wifiGetRSSI();
bool wifiIsReady();
void wifiPowerDown();

#endif // WIFI_HANDLER_H
