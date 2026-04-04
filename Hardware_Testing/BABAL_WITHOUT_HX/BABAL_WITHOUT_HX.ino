#include <Wire.h>
#include <SoftwareSerial.h>
#include "DFRobot_AHT20.h"
#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2561_U.h>
#include <MHZ19.h>
#include "HX711.h"

// -------------------- Configuration --------------------
const char* apn = "web"; 
const char* renderHost = "sim900-proxy.itsmeaayush24.workers.dev";
const int SAMPLES_PER_CYCLE = 3;   
const int POLL_DELAY = 10000; // Reduced to 10s for faster debugging
const int GSM_RX = 7, GSM_TX = 8;
const int MHZ_RX = 6, MHZ_TX = 9;

// -------------------- Objects --------------------
DFRobot_AHT20 aht20;
Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);
SoftwareSerial mhzSerial(MHZ_RX, MHZ_TX);
MHZ19 mhz19;
HX711 scale;
SoftwareSerial gsm(GSM_RX, GSM_TX);

int cycleCount = 0;

// -------------------- GSM Helpers --------------------
void flushGSM() { while (gsm.available()) gsm.read(); }

String readGSM(unsigned long timeout = 3000) {
  String s = "";
  unsigned long start = millis();
  while (millis() - start < timeout) {
    while (gsm.available()) s += (char)gsm.read();
  }
  return s;
}

bool sendAT(String cmd, const char* expect = "OK", unsigned long timeout = 3000) {
  gsm.listen(); // CRITICAL: Tell Arduino to listen to GSM, not MH-Z19
  flushGSM();
  Serial.print(F("  [AT] ")); Serial.print(cmd);
  gsm.println(cmd);
  String r = readGSM(timeout);
  bool success = (r.indexOf(expect) != -1);
  if (success) Serial.println(F(" -> OK"));
  else Serial.println(F(" -> FAIL!"));
  return success;
}

void performSyncUpload(String payload) {
  cycleCount++;
  Serial.println(F("\n--- UPLOAD STAGE ---"));
  
  // Cleanup stuck states
  sendAT("AT+HTTPTERM", "OK", 1000); 
  sendAT("AT+SAPBR=0,1", "OK", 1000);

  sendAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"");
  sendAT("AT+SAPBR=3,1,\"APN\",\"" + String(apn) + "\"");
  
  if (sendAT("AT+SAPBR=1,1", "OK", 15000)) {
    sendAT("AT+HTTPINIT");
    sendAT("AT+HTTPPARA=\"CID\",1");
    sendAT("AT+HTTPPARA=\"URL\",\"http://" + String(renderHost) + "\"");
    sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"");

    if (sendAT("AT+HTTPDATA=" + String(payload.length()) + ",10000", "DOWNLOAD", 5000)) {
      gsm.print(payload);
      delay(500); 
      if (sendAT("AT+HTTPACTION=1", "OK", 2000)) {
        String res = readGSM(15000); 
        Serial.print(F("RESULT: ")); Serial.println(res);
      }
    }
    sendAT("AT+HTTPTERM");
    sendAT("AT+SAPBR=0,1", "OK", 5000);
  }
}

// -------------------- Setup --------------------
void setup() {
  Serial.begin(115200);
  gsm.begin(9600);
  mhzSerial.begin(9600);
  Wire.begin();

  Serial.println(F("Initializing..."));
  delay(5000); // Warmup

  aht20.begin();
  tsl.begin();
  mhz19.begin(mhzSerial);
  scale.begin(2, 3);
  
  gsm.listen(); // Start by listening to GSM
  sendAT("AT");
  sendAT("AT+CSQ");
}

// -------------------- Main Loop --------------------
void loop() {
  String currentBatch = "[";
  
  for (int i = 0; i < SAMPLES_PER_CYCLE; i++) {
    Serial.print(F("Sampling #")); Serial.println(i+1);
    
    // Switch to MH-Z19
    mhzSerial.listen(); 
    delay(100);
    int co2 = mhz19.getCO2();
    
    // Back to I2C/Analog sensors (No listening needed)
    float t = 0, h = 0;
    if (aht20.startMeasurementReady(true)) {
      t = aht20.getTemperature_C();
      h = aht20.getHumidity_RH();
    }
    sensors_event_t event;
    tsl.getEvent(&event);
    int mq = analogRead(A0);

    // Build entry
currentBatch += "{\"t\":" + String(t, 1) + 
                ",\"h\":" + String(h, 0) + 
                ",\"a\":" + String(mq) + 
                ",\"l\":" + String(event.light, 0) + 
                ",\"c\":" + String(co2) + "}";    
    if (i < SAMPLES_PER_CYCLE - 1) {
      currentBatch += ",";
      delay(POLL_DELAY);
    }
  }
  currentBatch += "]";
  
  // Explicitly switch back to GSM for the upload
  gsm.listen();
  performSyncUpload(currentBatch);
  
  delay(5000);
}