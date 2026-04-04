#include <Wire.h>
#include "DFRobot_AHT20.h"
#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2561_U.h>
#include <MHZ19.h>
#include <SoftwareSerial.h>
#include "HX711.h"

// -------------------- Pin Map --------------------
#define MQ135_PIN A0
#define MHZ_RX_PIN 6
#define MHZ_TX_PIN 9
#define HX_DT  2
#define HX_SCK 3

// -------------------- Sensor Objects --------------------
DFRobot_AHT20 aht20;
Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);
SoftwareSerial mhzSerial(MHZ_RX_PIN, MHZ_TX_PIN);
MHZ19 mhz19;
HX711 scale;

// -------------------- Timing --------------------
unsigned long lastUpdate = 0;
const unsigned long INTERVAL = 1000; 

void setup() {
  Serial.begin(9600);
  Wire.begin();

  // AHT20 Setup
  if (aht20.begin() != 0) Serial.println("{\"err\":\"AHT20 failed\"}");

  // TSL2561 Setup
  if (tsl.begin()) {
    tsl.enableAutoRange(true);
    tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_101MS);
  } else {
    Serial.println("{\"err\":\"TSL2561 failed\"}");
  }

  // MH-Z19 Setup
  mhzSerial.begin(9600);
  mhz19.begin(mhzSerial);
  mhz19.autoCalibration(false);

  // HX711 Setup (Safe Initialization)
  scale.begin(HX_DT, HX_SCK);
  
  // Only tare if the sensor is actually physically detected
  if (scale.wait_ready_timeout(500)) {
    scale.set_scale(); 
    scale.tare();
  } else {
    Serial.println("{\"info\":\"HX711 not found, skipping...\"}");
  }
}

void loop() {
  unsigned long now = millis();

  if (now - lastUpdate >= INTERVAL) {
    lastUpdate = now;

    // 1. Collect AHT20 (Temp/Hum)
    float temp = NAN, hum = NAN;
    if (aht20.startMeasurementReady(true)) {
      temp = aht20.getTemperature_C();
      hum = aht20.getHumidity_RH();
    }

    // 2. Collect TSL2561 (Lux)
    sensors_event_t event;
    tsl.getEvent(&event);
    float lux = event.light;

    // 3. Collect MH-Z19 (CO2)
    int co2 = mhz19.getCO2();

    // 4. Collect MQ-135 (Raw Analog)
    int mqRaw = analogRead(MQ135_PIN);

    // 5. Collect HX711 (Raw Load Cell Value) - Non-blocking check
    long weightRaw = 0; 
    if (scale.is_ready()) {
      weightRaw = scale.get_value(1); 
    }

    // -------- JSON Output --------
    Serial.print("{\"ms\":");     Serial.print(now);
    Serial.print(",\"tempC\":");  Serial.print(isnan(temp) ? 0 : temp, 2);
    Serial.print(",\"humRH\":");  Serial.print(isnan(hum) ? 0 : hum, 2);
    Serial.print(",\"lux\":");    Serial.print(lux, 2);
    Serial.print(",\"co2\":");    Serial.print(co2);
    Serial.print(",\"mq135\":");  Serial.print(mqRaw);
    Serial.print(",\"weight\":"); Serial.print(weightRaw);
    Serial.print(",\"hx_ok\":");  Serial.print(scale.is_ready() ? "true" : "false");
    Serial.println("}");
  }
}