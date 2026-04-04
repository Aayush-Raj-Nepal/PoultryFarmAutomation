#include <Wire.h>
#include "DFRobot_AHT20.h"
#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2561_U.h>
#include <MHZ19.h>
#include <SoftwareSerial.h>
#include "HX711.h"

// ---------------- Pins ----------------
#define MQ135_PIN A0
#define MHZ_RX_PIN 6
#define MHZ_TX_PIN 9
#define HX_DT  2
#define HX_SCK 3

// ---------------- Objects ----------------
DFRobot_AHT20 aht20;
Adafruit_TSL2561_Unified tsl(TSL2561_ADDR_FLOAT, 12345);

SoftwareSerial mhzSerial(MHZ_RX_PIN, MHZ_TX_PIN);
MHZ19 mhz19;

HX711 scale;

unsigned long lastPrint = 0;

void setup() {
  Serial.begin(9600);
  delay(1000);

  Serial.println("BOOT OK");

  Wire.begin();

  // --- AHT20 ---
  if (aht20.begin() != 0) Serial.println("AHT20 FAIL");
  else Serial.println("AHT20 OK");

  // --- TSL2561 ---
  if (!tsl.begin()) Serial.println("TSL2561 FAIL");
  else {
    Serial.println("TSL2561 OK");
    tsl.enableAutoRange(true);
    tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_402MS);
  }

  // --- MH-Z19 ---
  mhzSerial.begin(9600);
  mhz19.begin(mhzSerial);
  mhz19.autoCalibration(false);
  Serial.println("MH-Z19 OK");

  // --- HX711 ---
  scale.begin(HX_DT, HX_SCK);
  scale.set_scale();   // raw units for now
  scale.tare();
  Serial.println("HX711 INIT");

  Serial.println("=== SENSOR TEST STARTED ===");
}

void loop() {
  unsigned long now = millis();
  if (now - lastPrint < 1000) return;
  lastPrint = now;

  // -------- AHT20 --------
  float tempC = NAN, humRH = NAN;
  if (aht20.startMeasurementReady(true)) {
    tempC = aht20.getTemperature_C();
    humRH = aht20.getHumidity_RH();
  }

  // -------- TSL2561 --------
  sensors_event_t event;
  float lux = NAN;
  tsl.getEvent(&event);
  if (event.light) lux = event.light;
  else lux = 0;

  // -------- MH-Z19 --------
  int co2 = mhz19.getCO2();
  int mhzTemp = mhz19.getTemperature();

  // -------- MQ-135 --------
  int mqRaw = analogRead(MQ135_PIN);

  // -------- HX711 (SAFE) --------
  float weight = NAN;
  if (scale.is_ready()) {
    weight = scale.get_units(5);
  }

  // -------- Print --------
  Serial.println("---- READINGS ----");

  Serial.print("AHT20  | Temp: ");
  Serial.print(tempC);
  Serial.print(" C  Hum: ");
  Serial.print(humRH);
  Serial.println(" %");

  Serial.print("TSL2561 | Lux: ");
  Serial.println(lux);

  Serial.print("MH-Z19 | CO2: ");
  Serial.print(co2);
  Serial.print(" ppm  Temp: ");
  Serial.print(mhzTemp);
  Serial.println(" C");

  Serial.print("MQ-135 | Raw ADC: ");
  Serial.println(mqRaw);

  Serial.print("HX711 | Weight units: ");
  if (isnan(weight)) Serial.println("NOT READY");
  else Serial.println(weight);

  Serial.println("------------------\n");
}
