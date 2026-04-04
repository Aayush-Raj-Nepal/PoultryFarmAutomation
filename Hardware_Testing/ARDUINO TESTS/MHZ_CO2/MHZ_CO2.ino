#include <MHZ19.h>
#include <SoftwareSerial.h>

#define RX_PIN 6   // Arduino receives from MH-Z19 TX
#define TX_PIN 9   // Arduino sends to MH-Z19 RX

SoftwareSerial mhzSerial(RX_PIN, TX_PIN);
MHZ19 mhz19;

void setup() {
  Serial.begin(9600);
  mhzSerial.begin(9600);

  mhz19.begin(mhzSerial);
  mhz19.autoCalibration(false);   // Disable ABC (good choice)

  Serial.println("MH-Z19 CO2 Sensor Test (Arduino Uno)");
}

void loop() {
  int co2 = mhz19.getCO2();
  int temp = mhz19.getTemperature();

  if (co2 > 0) {
    Serial.print("CO2: ");
    Serial.print(co2);
    Serial.print(" ppm | Temp: ");
    Serial.print(temp);
    Serial.println(" °C");
  } else {
    Serial.println("Sensor not responding...");
  }

  delay(1000);
}
