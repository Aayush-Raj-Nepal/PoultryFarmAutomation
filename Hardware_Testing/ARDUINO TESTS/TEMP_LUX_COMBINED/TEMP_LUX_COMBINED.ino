#include <Wire.h>

#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2561_U.h>

#include "DFRobot_AHT20.h"

// --- Sensors ---
Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);
DFRobot_AHT20 aht20;

// --- Helper to init TSL2561 ---
void initTSL2561() {
  Serial.println("=== TSL2561 Lux Reading ===");

  if (!tsl.begin()) {
    Serial.println("TSL2561 not detected. Check wiring!");
    while (1) { delay(10); }
  }

  tsl.enableAutoRange(true);
  tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_402MS);
  Serial.println("TSL2561 initialized successfully!");
}

// --- Helper to init AHT20 ---
void initAHT20() {
  Serial.println("=== AHT20 Temperature & Humidity ===");

  uint8_t status;
  while ((status = aht20.begin()) != 0) {
    Serial.print("Failed to initialize AHT20. Error code: ");
    Serial.println(status);
    delay(1000);
  }
  Serial.println("AHT20 initialized successfully!");
}

void setup() {
  Serial.begin(9600);
  while (!Serial);

  Wire.begin(); // start I2C

  initTSL2561();
  initAHT20();

  Serial.println("=== Combined Sensor Output ===");
}

void loop() {
  // ----- Read Lux (TSL2561) -----
  sensors_event_t event;
  tsl.getEvent(&event);

  float lux = 0;
  if (event.light) lux = event.light; // if very dark, event.light may be 0

  // ----- Read Temp/Humidity (AHT20) -----
  float tempC = NAN;
  float humidity = NAN;

  if (aht20.startMeasurementReady(true)) {
    tempC = aht20.getTemperature_C();
    humidity = aht20.getHumidity_RH();
  }

  // ----- Print -----
  Serial.print("Lux: ");
  Serial.print(lux, 2);
  Serial.print(" lx | ");

  if (!isnan(tempC) && !isnan(humidity)) {
    Serial.print("Temp: ");
    Serial.print(tempC, 2);
    Serial.print(" C | Humidity: ");
    Serial.print(humidity, 2);
    Serial.println(" %");
  } else {
    Serial.println("AHT20: Measurement not ready!");
  }

  delay(2000);
}
