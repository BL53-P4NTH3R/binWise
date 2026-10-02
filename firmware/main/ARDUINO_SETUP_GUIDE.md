# BinWise Firmware — Arduino IDE Setup & Flash Guide

## IDE to Use: Arduino IDE 2.x

Download from: https://www.arduino.cc/en/software
Choose **Arduino IDE 2** (not the legacy 1.8 version).
It has better autocompletion, error highlighting, and board management.

---

## Step 1 — Install Arduino IDE 2

1. Go to https://www.arduino.cc/en/software
2. Click **Windows Win 10 and newer, 64 bit**
3. Download and run the installer
4. Accept all defaults during installation

---

## Step 2 — Add ESP32-S3 Board Support

Arduino IDE does not include ESP32-S3 support by default.
You need to add the Espressif board package.

**2a. Open Preferences:**
- Click **File → Preferences**
- Find the field: **Additional boards manager URLs**
- Paste this URL into that field:

```
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

- Click **OK**

**2b. Install the board package:**
- Click **Tools → Board → Boards Manager**
- In the search box type: `esp32`
- Find **esp32 by Espressif Systems**
- Click **Install** (version 3.x recommended)
- Wait for installation to complete (downloads ~250MB)

**2c. Select your board:**
- Click **Tools → Board → esp32 → ESP32S3 Dev Module**

---

## Step 3 — Configure Board Settings

After selecting ESP32S3 Dev Module, set these options
under the **Tools** menu:

| Setting | Value |
|---|---|
| Board | ESP32S3 Dev Module |
| USB CDC On Boot | Enabled |
| CPU Frequency | 240MHz (WiFi) |
| Core Debug Level | None |
| USB DFU On Boot | Disabled |
| Erase All Flash Before Sketch Upload | Disabled |
| Flash Mode | QIO 80MHz |
| Flash Size | 4MB (32Mb) |
| JTAG Adapter | Disabled |
| Partition Scheme | Default 4MB with spiffs |
| Upload Mode | UART0/Hardware CDC |
| Upload Speed | 921600 |
| USB Mode | Hardware CDC and JTAG |
| Port | (select your COM port — see Step 4) |

---

## Step 4 — Connect ESP32-S3 and Find COM Port

1. Connect ESP32-S3 to your laptop via USB-C cable
   (must be a data cable, not charge-only)
2. Wait 5–10 seconds for Windows to install the driver
3. In Arduino IDE click **Tools → Port**
4. You should see a new port appear e.g. **COM5** or **COM8**
5. Select that port

**If no port appears:**
- Open Device Manager (Win+X → Device Manager)
- Look under **Ports (COM & LPT)**
- If you see **Unknown Device** instead of a COM port,
  you need to install the CH340 or CP2102 driver manually:
  - CH340: https://www.wch.cn/downloads/CH341SER_EXE.html
  - CP2102: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

---

## Step 5 — Set Up Your Project Files

1. Create a new folder called `BinWise` anywhere on your computer
2. Copy these 5 files into that folder:
   ```
   BinWise/
     main.ino
     config.h
     ultrasonic_handler.h
     ultrasonic_handler.cpp
     gsm_handler.h
     gsm_handler.cpp
   ```
3. Open Arduino IDE
4. Click **File → Open**
5. Navigate to your `BinWise` folder
6. Select `main.ino` and click Open
7. Arduino IDE will show all files as tabs at the top

---

## Step 6 — Edit config.h Before Flashing

Open the `config.h` tab in Arduino IDE and update:

```cpp
// Your server IP — the machine running FastAPI backend
#define API_HOST   "192.168.1.105"   // ← change this

// Your node ID — must match backend sensor_nodes table
#define NODE_ID    "US-Node-402"     // ← change if needed

// Sleep time — use 30 for testing, 300 for production
#define SLEEP_SECONDS   30           // ← start with 30 for testing
```

**How to find your server IP (Windows):**
Open Command Prompt and run:
```
ipconfig
```
Look for **IPv4 Address** under your active network adapter.
It will look like `192.168.1.xxx`.

Your laptop and ESP32-S3 must be on the same WiFi network,
OR the ESP32 reaches your server via mobile data (GSM).
For development, use local IP. For campus deployment, use
your server's public IP or domain.

---

## Step 7 — Install Required Libraries

Your firmware uses only Arduino built-in functions
(HardwareSerial, esp_sleep, pulseIn). No extra libraries
need to be installed for the basic version.

**Verify in Library Manager (Tools → Manage Libraries):**

| Library | Version | Status |
|---|---|---|
| Built-in ESP32 Arduino core | 3.x | Installed with board |
| HardwareSerial | Built-in | No install needed |

If you later want to add TinyGSM for more robust GSM handling:
- Search: `TinyGSM` by Volodymyr Shymanskyy
- Install version 0.11.x

---

## Step 8 — Compile and Upload

**8a. Compile first (without uploading) to check for errors:**
- Click the **✓ (tick/checkmark)** button in Arduino IDE
- Wait for compilation to complete
- The black console at the bottom should end with:
  ```
  Sketch uses XXXXX bytes (XX%) of program storage space.
  Global variables use XXXXX bytes (XX%) of dynamic memory.
  ```
- If you see any RED error text, see Troubleshooting below

**8b. Upload to ESP32-S3:**
- Click the **→ (arrow/upload)** button
- Arduino IDE compiles then uploads
- You will see:
  ```
  Connecting........
  Chip is ESP32-S3
  Uploading stub...
  Running stub...
  Configuring flash size...
  Auto-detected Flash size: 4MB
  Writing at 0x00010000...
  Hash of data verified.
  Leaving...
  Hard resetting via RTS pin...
  ```
- Upload complete

**If upload fails with "Failed to connect":**
Hold the **BOOT** button on the ESP32-S3 while clicking upload,
then release BOOT after "Connecting..." appears.

---

## Step 9 — Open Serial Monitor

After uploading:
1. Click **Tools → Serial Monitor** (or Ctrl+Shift+M)
2. Set baud rate to **115200** (bottom right dropdown)
3. Set line ending to **Both NL & CR**
4. Press the **RST (Reset)** button on the ESP32-S3

You should immediately see:

```
╔══════════════════════════════════════════════╗
║       BinWise — Sensor Node Firmware         ║
║       ABU Zaria · Samaru Campus · 2026       ║
╠══════════════════════════════════════════════╣
║  Node ID  : US-Node-402
║  API host : 192.168.1.105
║  Bin ht.  : 80 cm
║  Sleep    : 30 s
╚══════════════════════════════════════════════╝

[BOOT] Wake #1  (SLEEP_SECONDS = 30)
[BOOT] LED self-test...
[BOOT] ✓ LED self-test complete
[SENSOR] HC-SR04 initialised
[CYCLE] Reading fill level...
[SENSOR] Distance: 42.3 cm  (5/5 valid readings)
[SENSOR] Fill level: 47.1%
[LED]  WARNING — yellow on
[CYCLE] Initialising GSM...
[GSM]  >> AT
[GSM]  << OK
[GSM]  >> ATE0
[GSM]  << OK
[GSM]  >> AT+CPIN?
[GSM]  << +CPIN: READY
[GSM]  ✓ SIM card ready
[GSM]  >> AT+CSQ
[GSM]  Signal: +CSQ: 18,0
[GSM]  ✓ GPRS attached. Ready to transmit.
[GSM]  ── Transmitting to BinWise backend ──────────
[GSM]  URL: http://192.168.1.105:8000/api/ingest
[GSM]  Payload: {"sensor_id":"US-Node-402","fill_pct":47.10,...}
[GSM]  ✓ Backend response: 201 Created
[GSM]  ── Transmission complete ───────────────────
[SUMMARY] ──────────────────────────────────────
[SUMMARY] Node ID    : US-Node-402
[SUMMARY] Fill level : 47.1%
[SUMMARY] Battery    : 85.0%
[SUMMARY] RSSI       : -77 dBm
[SUMMARY] HTTP code  : 201
[SLEEP] Entering deep sleep for 30 seconds...
```

---

## Troubleshooting

### "Compilation error: 'PIN_TRIG' was not declared"
You opened only `main.ino` without the other files.
Make sure all 6 files are in the SAME folder named `BinWise`.
Arduino IDE requires the folder name to match the `.ino` filename.

### "Failed to connect to ESP32-S3"
Hold BOOT button while clicking upload. Release after "Connecting..."

### GSM shows no response after AT
- Check UART wiring: GPIO17 TX → SIM RXD, GPIO18 RX ← SIM TXD
- Check SIM800L VCC is on battery rail (3.7–4.2V), not 3.3V
- Check the 100µF capacitor is installed across SIM800L VCC/GND
- Check SIM card is inserted correctly (gold contacts down)

### "+CPIN: NOT READY" or "+CPIN: SIM FAILURE"
- SIM card not inserted correctly — remove and reinsert
- SIM card not registered — try it in a phone first
- SIM card may not have data enabled — check with MTN

### "+CREG: 0,2" (searching) for more than 30 seconds
- No network coverage at your location
- Try moving near a window
- Check antenna is attached to SIM800L

### HTTP code -1 (transmission failed)
- Check API_HOST in config.h matches your server IP exactly
- Check FastAPI backend is running: `uvicorn app.main:fastapi_app --port 8000`
- Check your firewall allows port 8000 inbound
- Test the endpoint directly from your phone browser:
  `http://YOUR_IP:8000/docs`

### Distance reading always -1 (sensor fault)
- Check HC-SR04 VCC → ESP32 VIN (5V, not 3.3V)
- Check TRIG wire → GPIO4
- Check ECHO wire → 1kΩ → junction → GPIO16
- Check 2kΩ from junction to GND
- Verify with multimeter: junction to GND should read ~3.3V
  when HC-SR04 ECHO is HIGH

---

## Development vs Production Settings

| Setting | Development | Production |
|---|---|---|
| SLEEP_SECONDS | 30 | 300 |
| DEBUG_SERIAL | 1 | 0 (optional) |
| API_HOST | Local IP (192.168.x.x) | Server IP or domain |
| Upload cable | USB-C to laptop | Only needed for re-flash |

---

## File Summary

| File | Purpose |
|---|---|
| `main.ino` | Main entry point — orchestrates the full cycle |
| `config.h` | All settings — edit this before each deployment |
| `ultrasonic_handler.h` | HC-SR04 function declarations |
| `ultrasonic_handler.cpp` | HC-SR04 reading and fill % calculation |
| `gsm_handler.h` | SIM800L function declarations |
| `gsm_handler.cpp` | SIM800L AT commands and HTTP POST |

---

*BinWise Firmware v1.0 — ABU Zaria Final Year Project 2026*
*Blue Panther — Department of Computer Science*
