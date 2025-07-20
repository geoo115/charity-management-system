package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	Database      DatabaseConfig
	Redis         RedisConfig
	Email         EmailConfig
	SMS           SMSConfig
	JWT           JWTConfig
	Server        ServerConfig
	Social        SocialConfig
	Environment   string
	Port          string
	SeedDatabase  bool
	RedisAddr     string
	RedisPassword string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type EmailConfig struct {
	SendGridAPIKey string
	FromEmail      string
	FromName       string
}

type SMSConfig struct {
	TwilioAccountSID string
	TwilioAuthToken  string
	TwilioFromNumber string
}

type JWTConfig struct {
	Secret         string
	ExpirationTime time.Duration
}

type ServerConfig struct {
	Port         string
	Environment  string
	Debug        bool
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

type SocialConfig struct {
	Facebook FacebookConfig
	Google   GoogleConfig
	Twitter  TwitterConfig
}

type FacebookConfig struct {
	AppID     string
	AppSecret string
	Enabled   bool
}

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	Enabled      bool
}

type TwitterConfig struct {
	ConsumerKey    string
	ConsumerSecret string
	Enabled        bool
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Environment:   getEnv("APP_ENV", "development"),
		Port:          getEnv("PORT", "8080"),
		SeedDatabase:  getEnvAsBool("SEED_DATABASE", false),
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "lewisham_hub"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
		},
		Email: EmailConfig{
			SendGridAPIKey: getEnv("SENDGRID_API_KEY", ""),
			FromEmail:      getEnv("FROM_EMAIL", "noreply@lewishamCharity.org"),
			FromName:       getEnv("FROM_NAME", "Lewisham Charity"),
		},
		SMS: SMSConfig{
			TwilioAccountSID: getEnv("TWILIO_ACCOUNT_SID", ""),
			TwilioAuthToken:  getEnv("TWILIO_AUTH_TOKEN", ""),
			TwilioFromNumber: getEnv("TWILIO_FROM_NUMBER", ""),
		},
		JWT: JWTConfig{
			Secret:         getEnv("JWT_SECRET", "your-secret-key"),
			ExpirationTime: getEnvAsDuration("JWT_EXPIRATION", "24h"),
		},
		Server: ServerConfig{
			Port:         getEnv("PORT", "8080"),
			Environment:  getEnv("APP_ENV", "development"),
			Debug:        getEnvAsBool("DEBUG", true),
			ReadTimeout:  getEnvAsDuration("READ_TIMEOUT", "30s"),
			WriteTimeout: getEnvAsDuration("WRITE_TIMEOUT", "30s"),
		},
		Social: SocialConfig{
			Facebook: FacebookConfig{
				AppID:     getEnv("FACEBOOK_APP_ID", ""),
				AppSecret: getEnv("FACEBOOK_APP_SECRET", ""),
				Enabled:   getEnvAsBool("FACEBOOK_ENABLED", false),
			},
			Google: GoogleConfig{
				ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
				ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
				Enabled:      getEnvAsBool("GOOGLE_ENABLED", false),
			},
			Twitter: TwitterConfig{
				ConsumerKey:    getEnv("TWITTER_CONSUMER_KEY", ""),
				ConsumerSecret: getEnv("TWITTER_CONSUMER_SECRET", ""),
				Enabled:        getEnvAsBool("TWITTER_ENABLED", false),
			},
		},
	}

	return cfg, nil
}

// LoadConfig is kept for backward compatibility
func LoadConfig() *Config {
	cfg, _ := Load()
	return cfg
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt(name string, defaultVal int) int {
	valueStr := getEnv(name, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultVal
}

func getEnvAsBool(name string, defaultVal bool) bool {
	valueStr := getEnv(name, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultVal
}

func getEnvAsDuration(name string, defaultVal string) time.Duration {
	valueStr := getEnv(name, defaultVal)
	if duration, err := time.ParseDuration(valueStr); err == nil {
		return duration
	}
	if duration, err := time.ParseDuration(defaultVal); err == nil {
		return duration
	}
	return time.Hour * 24 // fallback to 24 hours
}
