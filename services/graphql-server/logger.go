package main

import (
	"os"
	"strings"
	log "github.com/sirupsen/logrus"
)
// InitLogger - initializes logger type, level and format
func InitLogger() (error) {
	if env, ok := os.LookupEnv("ENVIRONMENT"); ok && strings.ToLower(env) == "production" {
		log.SetFormatter(&log.JSONFormatter{
			FieldMap: log.FieldMap{
				log.FieldKeyTime:  "time",
				log.FieldKeyLevel: "severity",
				log.FieldKeyMsg:   "message",
			},
		})
	} else {
		log.SetFormatter(&log.TextFormatter{
			ForceColors: true,
			FullTimestamp: true,
			TimestampFormat: "15:04:05.000",
		})
		log.SetReportCaller(true)
	}

	var err error
	level := log.WarnLevel
	if logLevel, ok := os.LookupEnv("LOG_LEVEL"); ok {
		if level, err = log.ParseLevel(strings.ToLower(logLevel)); err != nil {
			log.WithField("error", err).Error("Error while parsing LOG_LEVEL env variable")
			return err
		}
	}
	log.SetLevel(level)
	return nil
}