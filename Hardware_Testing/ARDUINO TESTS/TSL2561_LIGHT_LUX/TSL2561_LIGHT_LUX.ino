#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2561_U.h>

Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);

void setup() {
  Serial.begin(9600);
  while (!Serial);

  Serial.println("=== TSL2561 Lux Reading ===");

  if (!tsl.begin()) {
    Serial.println("TSL2561 not detected. Check wiring!");
    while (1);
  }

  tsl.enableAutoRange(true);
  tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_402MS);
}

void loop() {
  sensors_event_t event;
  tsl.getEvent(&event);

  float lux = 0;

  if (event.light) {
    lux = event.light;
  } else {
    // Handle very dark conditions
    lux = 0; // or you can print a message like "Too dark"
  }

  Serial.print("Lux: ");
  Serial.println(lux);

  delay(1000);
}
