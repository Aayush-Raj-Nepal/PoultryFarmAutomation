#include <Wire.h>
#include <Adafruit_SHTC3.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_TSL2561_U.h>

const uint8_t PIN_MQ137     = A0;
const uint8_t PIN_MHZ19_PWM = 4;   
const uint8_t PIN_ESP_TX    = 3;   

const unsigned long SEND_INTERVAL_MS = 2000;
const unsigned int BIT_US = 104;   

Adafruit_SHTC3 shtc3 = Adafruit_SHTC3();
Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);

bool shtOk = false;
bool tslOk = false;
unsigned long lastSend = 0;

void txByte(uint8_t b) {
  noInterrupts();
  digitalWrite(PIN_ESP_TX, LOW);
  delayMicroseconds(BIT_US);
  for (uint8_t i = 0; i < 8; i++) {
    digitalWrite(PIN_ESP_TX, (b >> i) & 0x01);
    delayMicroseconds(BIT_US);
  }
  digitalWrite(PIN_ESP_TX, HIGH);
  delayMicroseconds(BIT_US);
  interrupts();
}

void txText(const String &s) {
  for (size_t i = 0; i < s.length(); i++) {
    txByte((uint8_t)s[i]);
  }
}

// --- MH-Z19 PPM Calculation ---
int getMHZ19PPM() {
  // pulseIn returns microseconds (us). 
  // The MH-Z19 cycle is approx 1004ms long.
  unsigned long th = pulseIn(PIN_MHZ19_PWM, HIGH, 2000000UL); 
  unsigned long tl = pulseIn(PIN_MHZ19_PWM, LOW, 2000000UL);
  
  if (th == 0 || tl == 0) return -1; // Timeout or sensor not connected

  // Formula: PPM = Range * (Th - 2ms) / (Th + Tl - 4ms)
  // Converting ms to us: 2ms = 2000us, 4ms = 4000us
  // Standard range for MH-Z19 is 5000ppm
  long ppm = 5000L * (th - 2000) / (th + tl - 4000);
  
  if (ppm < 0) return 0;
  return (int)ppm;
}

void configureTSL2561() {
  tsl.enableAutoRange(true);
  tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_402MS);
}

float readTSL2561Lux() {
  sensors_event_t event;
  tsl.getEvent(&event);
  if (event.light) return event.light;
  return 0.0f;
}

void sendCsv(float t, float h, float lux, int mqRaw, int co2Ppm) {
  if (isnan(t))   t = -999.9;
  if (isnan(h))   h = -999.9;
  if (isnan(lux)) lux = -999.9;

  String line = String(t, 1) + "," +
                String(h, 1) + "," +
                String(lux, 1) + "," +
                String(mqRaw) + "," +
                String(co2Ppm) + "\n";

  txText(line);       
  Serial.print("Output: " + line); 
}

void setup() {
  pinMode(PIN_ESP_TX, OUTPUT);
  digitalWrite(PIN_ESP_TX, HIGH);

  pinMode(PIN_MHZ19_PWM, INPUT);
  pinMode(PIN_MQ137, INPUT);

  Serial.begin(115200);
  delay(500);

  Wire.begin();

  shtOk = shtc3.begin();
  if (shtOk) Serial.println("SHTC3 OK");
  
  tslOk = tsl.begin();
  if (tslOk) {
    configureTSL2561();
    Serial.println("TSL2561 OK");
  }

  Serial.println("MH-Z19E PWM Reading Active");
}

void loop() {
  if (millis() - lastSend < SEND_INTERVAL_MS) return;
  lastSend = millis();

  float temperatureC = NAN;
  float humidityRH   = NAN;
  float lux          = NAN;

  if (shtOk) {
    sensors_event_t humidity, temp;
    if (shtc3.getEvent(&humidity, &temp)) {
      temperatureC = temp.temperature;
      humidityRH   = humidity.relative_humidity;
    }
  }

  if (tslOk) lux = readTSL2561Lux();

  int mqRaw = analogRead(PIN_MQ137);
  int co2Ppm = getMHZ19PPM();

  sendCsv(temperatureC, humidityRH, lux, mqRaw, co2Ppm);
}