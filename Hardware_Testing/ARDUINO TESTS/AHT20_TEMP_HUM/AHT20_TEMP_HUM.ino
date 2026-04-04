#include "DFRobot_AHT20.h"

// SDA=A4
//SCL=A5
// Create sensor object
DFRobot_AHT20 aht20;

void setup() {
  Serial.begin(9600);
  while (!Serial); // wait for serial monitor

  Serial.println("=== AHT20 Temperature & Humidity Test ===");

  uint8_t status;
  // Initialize sensor
  while ((status = aht20.begin()) != 0) {
    Serial.print("Failed to initialize AHT20. Error code: ");
    Serial.println(status);
    delay(1000);
  }
  Serial.println("AHT20 initialized successfully!");
}

void loop() {
  // Trigger measurement and wait until ready (with CRC check enabled)
  if (aht20.startMeasurementReady(true)) {
    float tempC = aht20.getTemperature_C();    // Celsius
    float humidity = aht20.getHumidity_RH();    // % Relative Humidity

    Serial.print("Temperature: ");
    Serial.print(tempC, 2);
    Serial.print(" °C, Humidity: ");
    Serial.print(humidity, 2);
    Serial.println(" %RH");
  } else {
    Serial.println("Measurement not ready!");
  }

  delay(2000); // 2 seconds between readings
}
