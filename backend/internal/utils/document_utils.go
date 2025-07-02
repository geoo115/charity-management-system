package utils

import (
	"crypto/md5"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// SanitizeFilename removes any potentially dangerous characters from a filename
func SanitizeFilename(filename string) string {
	// Remove any directory components
	filename = filepath.Base(filename)

	// Replace any non-alphanumeric characters except for .-_ with underscore
	reg := regexp.MustCompile(`[^a-zA-Z0-9.-]`)
	filename = reg.ReplaceAllString(filename, "_")

	// Ensure filename doesn't start with a dot (hidden files)
	if strings.HasPrefix(filename, ".") {
		filename = "_" + filename
	}

	return filename
}

// CalculateFileChecksum computes an MD5 checksum of a file
func CalculateFileChecksum(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// GetDocumentStoragePath returns the full path where documents should be stored
func GetDocumentStoragePath() string {
	// This would typically come from environment variables or config
	// For now, using a default path
	basePath := os.Getenv("DOCUMENT_STORAGE_PATH")
	if basePath == "" {
		basePath = "uploads/documents"
	}

	// Ensure directory exists
	if err := os.MkdirAll(basePath, 0755); err != nil {
		// Log error but continue with default
		basePath = "uploads/documents"
		os.MkdirAll(basePath, 0755)
	}

	return basePath
}
