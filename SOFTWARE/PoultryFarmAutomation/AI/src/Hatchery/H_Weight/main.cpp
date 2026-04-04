// filepath: GJ_Poultry/src/main.cpp

#include <Arduino.h> // Remove this line if not compiling with Arduino framework
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "HX711.h"

// WiFi Configuration
ESP8266WiFiMulti WiFiMulti;
const char* ssid = "AdvancedCollege";
const char* password = "acem@123";
const char* serverUrl = "https://safal-hatchery.onrender.com/api/weight";

// HX711 Configuration
#define DT 12  // GPIO12 (D6)
#define SCK 14 // GPIO14 (D5)
#define TARE_BUTTON_PIN 0  // D3 GPIO0

HX711 scale;
LiquidCrystal_I2C lcd(0x27, 16, 2); // Set the LCD address to 0x27 for 16 chars and 2 lines

// Root CA for Render (you may need to update this)
const char* rootCACertificate = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n" \
"TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n" \
"cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n" \
"WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n" \
"ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n" \
"MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n" \
"h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n" \
"0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\n" \
"A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\n" \
"T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\n" \
"B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\n" \
"B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\n" \
"KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\n" \
"OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynSjn\n" \
"olLhrY0+EQ0J9i5gSAZ+qHbRzLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d\n" \
"11TPAmRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzw\n" \
"57A06MvIYJ2vhTkY1AxYguPRjY5wK0bVP47aOZT/yyjqlnxL0j6oRtnjN1qw==\n" \
"-----END CERTIFICATE-----\n";

// Timing variables
unsigned long lastUploadTime = 0;
const unsigned long uploadInterval = 30000; // 30 seconds

void setup() {
  Serial.begin(115200);
  pinMode(TARE_BUTTON_PIN, INPUT_PULLUP);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.print("Initializing...");

  // Initialize scale
  scale.begin(DT, SCK);
  while (!scale.is_ready()) {
    Serial.println("Waiting for HX711...");
    delay(1000);
  }
  scale.set_scale(57470); // Your calibrated scale factor
  scale.tare();

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFiMulti.addAP(ssid, password);
  
  lcd.clear();
  lcd.print("Connecting WiFi");
  
  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  while (WiFiMulti.run() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.print("WiFi Connected");
  delay(1000);
  lcd.clear();
}

void loop() {
  // Check tare button (active LOW)
  if (digitalRead(TARE_BUTTON_PIN) == LOW) {
    scale.tare();
    lcd.clear();
    lcd.print("Tared!");
    delay(1500);
    lcd.clear();
  }

  // Read weight
  float weight = scale.get_units(5);  // Average of 5 readings

  // Display weight
  Serial.print("Weight: ");
  Serial.print(weight, 2);
  Serial.println(" kg");

  lcd.setCursor(0, 0);
  lcd.print("Weight:");
  lcd.setCursor(0, 1);
  lcd.print(weight, 2);
  lcd.print(" kg    ");

  // Upload data to server periodically
  if (millis() - lastUploadTime > uploadInterval) {
    if (WiFiMulti.run() == WL_CONNECTED) {
      WiFiClientSecure client;
      HTTPClient https;

      Serial.print("[HTTPS] begin...\n");
      
      // Configure WiFiClientSecure with root CA
      client.setInsecure(); // Skip verification for testing (not recommended for production)
      // For production, use: client.setCACert(rootCACertificate);
      
      if (https.begin(client, serverUrl)) {
        https.addHeader("Content-Type", "application/json");
        
        // Create JSON payload
        String payload = "{\"weight\":" + String(weight, 2) + "}";
        
        Serial.print("[HTTPS] POST...\n");
        Serial.println("Payload: " + payload);
        int httpCode = https.POST(payload);

        if (httpCode > 0) {
          Serial.printf("[HTTPS] POST... code: %d\n", httpCode);
          if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
            String response = https.getString();
            Serial.println("Response: " + response);
            lcd.clear();
            lcd.print("Upload Success");
            delay(1000);
            lcd.clear();
          } else {
            // Handle 400 or other error codes
            String response = https.getString();
            Serial.println("Error response: " + response);
            lcd.clear();
            lcd.print("Upload Error");
            lcd.setCursor(0, 1);
            lcd.print("Code: " + String(httpCode));
            delay(2000);
            lcd.clear();
          }
        } else {
          Serial.printf("[HTTPS] POST... failed, error: %s\n", https.errorToString(httpCode).c_str());
          lcd.clear();
          lcd.print("Upload Failed");
          delay(1000);
          lcd.clear();
        }

        https.end();
      } else {
        Serial.println("[HTTPS] Unable to connect");
      }
    }
    lastUploadTime = millis();
  }

  delay(500);
}