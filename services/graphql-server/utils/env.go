package utils

import "os"

func GetenvWithFallback(key, fallback string) string {
	res, ok := os.LookupEnv(key)
	if ok {
		return res
	}

	return fallback
}
