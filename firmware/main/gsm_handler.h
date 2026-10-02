/**
 * BinWise — gsm_handler.h
 * ─────────────────────────────────────────────────────────────────
 * SIM800L GSM/GPRS module interface.
 * Handles AT command communication, GPRS attach, and HTTP POST
 * to the BinWise FastAPI backend.
 * ─────────────────────────────────────────────────────────────────
 */

#ifndef GSM_HANDLER_H
#define GSM_HANDLER_H

#include <Arduino.h>
#include "config.h"

/**
 * Initialise UART1 for SIM800L and run the full AT command
 * startup sequence:
 *   AT → CPIN check → signal quality → GPRS attach → APN config
 *
 * Returns true if the module is ready to transmit.
 * Returns false if the module does not respond after retries.
 */
bool gsmInit();

/**
 * Send a JSON payload to the BinWise backend via HTTP POST.
 *
 * Builds the URL from API_HOST, API_PORT, API_PATH in config.h.
 * Retries up to GSM_RETRY_COUNT times on failure.
 *
 * Parameters:
 *   fill_pct    — current bin fill level (0.0–100.0)
 *   battery_pct — current battery level (0.0–100.0)
 *   rssi_dbm    — GSM signal strength in dBm
 *
 * Returns HTTP response code (201 = success), or -1 on failure.
 */
int gsmPostReading(float fill_pct, float battery_pct, int rssi_dbm);

/**
 * Read GSM signal strength.
 * Returns RSSI in dBm. Returns -999 if module not responding.
 * Typical values: -70dBm (excellent) to -110dBm (poor)
 */
int gsmGetRSSI();

/**
 * Check whether the module has a valid SIM card and network.
 * Returns true if CPIN: READY and network registered.
 */
bool gsmIsReady();

/**
 * Power down the SIM800L gracefully using AT+CPOWD=1.
 * Call before entering deep sleep to prevent current leakage.
 */
void gsmPowerDown();

#endif // GSM_HANDLER_H
